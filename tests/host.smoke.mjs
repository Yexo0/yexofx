// Test du moteur (cep/host/yexofx_host.jsx) avec un After Effects simulé.
// 1. API, presets clés, undo, erreurs utilisateur, SFX, nettoyage (scénarios précis).
// 2. TOUS les presets du registre : appliqués un par un, puis chaque expression générée est
//    vérifiée (syntaxe ES3 + JS) et ÉVALUÉE à plusieurs instants (résultat numérique valide).
// Les mocks n'imitent pas toutes les subtilités d'AE : l'auto-test dans AE reste la référence.
// Usage : node tests/host.smoke.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as acorn from "acorn";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = readFileSync(join(ROOT, "cep", "host", "yexofx_host.jsx"), "utf8");

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log("  ok   " + msg); else { failures++; console.log("  FAIL " + msg); } };
const near = (a, b, t = 0.5) => Math.abs(a - b) <= t;

// ------------------------------------------------------------------ enums
const PropertyType = { PROPERTY: 6212, INDEXED_GROUP: 6213, NAMED_GROUP: 6214 };
const PVT = { NO_VALUE: 1, ThreeD_SPATIAL: 2, ThreeD: 3, TwoD_SPATIAL: 4, TwoD: 5, OneD: 6, COLOR: 7, CUSTOM_VALUE: 8, MARKER: 9, SHAPE: 12, TEXT_DOCUMENT: 13 };

// ------------------------------------------------------------------ fichiers
let S;
const reset = () => { S = { undo: 0, undoLog: [], alerts: [], removed: [], files: new Map([["C:/assets/sfx/impact/impact_02.wav", "RIFF"]]), dirs: new Set(["C:/Mock/AppData", "C:/Mock/Documents", "C:/assets", "C:/assets/sfx"]) }; };
reset();
const norm = (p) => String(p).replace(/\\/g, "/").replace(/\/+$/, "");
class Folder {
  constructor(p) { this.fsName = norm(p); }
  get exists() { return S.dirs.has(this.fsName); }
  create() { S.dirs.add(this.fsName); return true; }
  get parent() { const i = this.fsName.lastIndexOf("/"); return i > 2 ? new Folder(this.fsName.slice(0, i)) : null; }
  execute() { return true; }
}
Folder.userData = new Folder("C:/Mock/AppData");
Folder.myDocuments = new Folder("C:/Mock/Documents");
class File {
  constructor(p) { this.fsName = norm(p); this.mode = null; this.buf = ""; }
  get exists() { return S.files.has(this.fsName); }
  get parent() { return new Folder(this.fsName.slice(0, this.fsName.lastIndexOf("/"))); }
  get name() { return encodeURI(this.fsName.split("/").pop()); }
  get displayName() { return this.fsName.split("/").pop(); }
  get length() { return (S.files.get(this.fsName) || "").length; }
  open(mode) { if (mode === "r") { if (!this.exists) return false; this.buf = S.files.get(this.fsName); } else { if (!this.parent.exists) return false; this.buf = mode === "a" ? (S.files.get(this.fsName) || "") : ""; } this.mode = mode; return true; }
  read() { return this.buf; }
  write(s) { this.buf += s; return true; }
  close() { if (this.mode === "w" || this.mode === "a") S.files.set(this.fsName, this.buf); this.mode = null; return true; }
  remove() { S.files.delete(this.fsName); return true; }
  execute() { return true; }
}

// ------------------------------------------------------------------ propriétés
let uid = 1;
class Prop {
  constructor(name, matchName, value, vt) {
    Object.assign(this, { name, matchName, value, propertyType: PropertyType.PROPERTY, propertyValueType: vt ?? PVT.OneD,
      keys: [], expression: "", expressionEnabled: false, canSetExpression: vt !== PVT.NO_VALUE && vt !== PVT.MARKER, expressionError: "", propertyIndex: 1, items: null, selectedKeys: [] });
    this.isSpatial = vt === PVT.ThreeD_SPATIAL || vt === PVT.TwoD_SPATIAL;
  }
  setValue(v) { this.value = Array.isArray(v) ? v.slice() : v; }
  setValueAtTime(t, v) { const k = this.keys.find((k) => k.t === t); if (k) k.v = v; else this.keys.push({ t, v, inI: 2, outI: 2, inE: null, outE: null }); this.keys.sort((a, b) => a.t - b.t); }
  get numKeys() { return this.keys.length; }
  keyTime(i) { return this.keys[i - 1].t; }
  keyValue(i) { return this.keys[i - 1].v; }
  removeKey(i) { this.keys.splice(i - 1, 1); }
  valueAtTime() { return this.value; }
  setPropertyParameters(items) { this.items = items.slice(); return this; }
  keyInInterpolationType(i) { return this.keys[i - 1].inI; }
  keyOutInterpolationType(i) { return this.keys[i - 1].outI; }
  keyInTemporalEase(i) { return this.keys[i - 1].inE || [new KeyframeEase(0, 33)]; }
  keyOutTemporalEase(i) { return this.keys[i - 1].outE || [new KeyframeEase(0, 33)]; }
  setInterpolationTypeAtKey(i, a, b) { this.keys[i - 1].inI = a; this.keys[i - 1].outI = b; }
  setTemporalEaseAtKey(i, a, b) { this.keys[i - 1].inE = a; this.keys[i - 1].outE = b; }
  remove() { const g = this.parentGroup; g.children.splice(g.children.indexOf(this), 1); g.reindex(); }
}
class Group {
  constructor(name, matchName, factory, indexed) {
    Object.assign(this, { name, matchName, children: [], factory, propertyIndex: 1,
      propertyType: indexed ? PropertyType.INDEXED_GROUP : PropertyType.NAMED_GROUP, canSetExpression: false });
  }
  get numProperties() { return this.children.length; }
  property(x) { return typeof x === "number" ? (this.children[x - 1] ?? null) : (this.children.find((c) => c.matchName === x || c.name === x) ?? null); }
  canAddProperty(mn) { return !!this.factory && this.factory(mn, true) !== null; }
  addProperty(mn) { const c = this.factory(mn); if (!c) throw new Error("addProperty refusé : " + mn); this.children.push(c); this.reindex(); return c; }
  reindex() { this.children.forEach((c, i) => { c.propertyIndex = i + 1; c.parentGroup = this; }); }
  push(c) { this.children.push(c); this.reindex(); return this; }
  remove() { const g = this.parentGroup; g.children.splice(g.children.indexOf(this), 1); g.reindex(); }
}
const P2 = (n, mn, v) => new Prop(n, mn, v, Array.isArray(v) ? (v.length === 2 ? PVT.TwoD_SPATIAL : v.length === 4 ? PVT.COLOR : PVT.ThreeD) : PVT.OneD);
const E = (display, params) => [display, params];
const EFFECTS = {
  "ADBE Slider Control": E("Slider Control", [["Slider", "-0001", 0]]),
  "ADBE Checkbox Control": E("Checkbox Control", [["Checkbox", "-0001", 0]]),
  "ADBE Color Control": E("Color Control", [["Color", "-0001", [1, 0, 0, 1]]]),
  "ADBE Point Control": E("Point Control", [["Point", "-0001", [0, 0]]]),
  "ADBE Angle Control": E("Angle Control", [["Angle", "-0001", 0]]),
  "ADBE Dropdown Control": E("Dropdown Menu Control", [["Menu", "-0001", 1]]),
  "ADBE Geometry2": E("Transform", [["Anchor Point", "-0001", [540, 960]], ["Position", "-0002", [540, 960]], ["Uniform Scale", "-0011", 1], ["Scale", "-0003", 100], ["Scale Width", "-0004", 100], ["Skew", "-0005", 0], ["Skew Axis", "-0006", 0], ["Rotation", "-0007", 0], ["Opacity", "-0008", 100], ["Use Composition's Shutter Angle", "-0009", 1], ["Shutter Angle", "-0010", 0], ["Sampling", "-0012", 1]]),
  "ADBE Tile": E("Motion Tile", [["Tile Center", "-0001", [540, 960]], ["Tile Width", "-0002", 100], ["Tile Height", "-0003", 100], ["Output Width", "-0004", 100], ["Output Height", "-0005", 100], ["Mirror Edges", "-0006", 0], ["Phase", "-0007", 0]]),
  "ADBE Exposure2": E("Exposure", [["Channels", "-0001", 1], ["Exposure", "-0003", 0], ["Offset", "-0004", 0], ["Gamma Correction", "-0005", 1]]),
  "ADBE Box Blur2": E("Fast Box Blur", [["Blur Radius", "-0001", 0], ["Iterations", "-0002", 3]]),
  "ADBE Motion Blur": E("Directional Blur", [["Direction", "-0001", 0], ["Blur Length", "-0002", 0]]),
  "CC Radial Fast Blur": E("CC Radial Fast Blur", [["Center", "-0001", [540, 960]], ["Amount", "-0002", 0], ["Zoom", "-0003", 1]]),
  "ADBE Radial Blur": E("Radial Blur", [["Amount", "-0001", 0], ["Center", "-0002", [540, 960]], ["Type", "-0003", 1]]),
  "ADBE Wave Warp": E("Wave Warp", [["Wave Type", "-0001", 1], ["Wave Height", "-0002", 10], ["Wave Width", "-0003", 40], ["Direction", "-0004", 90], ["Wave Speed", "-0005", 1], ["Pinning", "-0006", 1], ["Phase", "-0007", 0]]),
  "ADBE Optics Compensation": E("Optics Compensation", [["Field Of View (FOV)", "-0001", 0], ["Reverse Lens Distortion", "-0002", 0], ["View Center", "-0003", [540, 960]]]),
  "ADBE Posterize Time": E("Posterize Time", [["Frame Rate", "-0001", 24]]),
  "ADBE Glo2": E("Glow", [["Glow Based On", "-0001", 2], ["Glow Threshold", "-0002", 60], ["Glow Radius", "-0003", 10], ["Glow Intensity", "-0004", 1]]),
  "ADBE Drop Shadow": E("Drop Shadow", [["Shadow Color", "-0001", [0, 0, 0, 1]], ["Opacity", "-0002", 127.5], ["Direction", "-0003", 135], ["Distance", "-0004", 5], ["Softness", "-0005", 0], ["Shadow Only", "-0006", 0]]),
  "ADBE Tint": E("Tint", [["Map Black To", "-0001", [0, 0, 0, 1]], ["Map White To", "-0002", [1, 1, 1, 1]], ["Amount to Tint", "-0003", 100]]),
  "ADBE CHANNEL MIXER": E("Channel Mixer", ["Red-Red", "Red-Green", "Red-Blue", "Red-Const", "Green-Red", "Green-Green", "Green-Blue", "Green-Const", "Blue-Red", "Blue-Green", "Blue-Blue", "Blue-Const"].map((n, i) => [n, "-" + String(i + 1).padStart(4, "0"), /^(Red-Red|Green-Green|Blue-Blue)$/.test(n) ? 100 : 0])),
  "ADBE Fractal Noise": E("Fractal Noise", [["Contrast", "-0004", 100], ["Brightness", "-0005", 0], ["Scale", "-0010", 100], ["Complexity", "-0015", 6], ["Evolution", "-0023", 0]]),
  "ADBE Tritone": E("Tritone", [["Highlights", "-0001", [1, 1, 1, 1]], ["Midtones", "-0002", [0.5, 0.5, 0.5, 1]], ["Shadows", "-0003", [0, 0, 0, 1]], ["Blend With Original", "-0004", 0]]),
  "ADBE Noise": E("Noise", [["Amount of Noise", "-0001", 0], ["Noise Type", "-0002", 1], ["Clipping", "-0003", 1]]),
  "ADBE Venetian Blinds": E("Venetian Blinds", [["Transition Completion", "-0001", 0], ["Direction", "-0002", 0], ["Width", "-0003", 10], ["Feather", "-0004", 0]]),
  "ADBE Lumetri": E("Lumetri Color", [["Temperature", "-0001", 0], ["Tint", "-0002", 0], ["Exposure", "-0003", 0], ["Contrast", "-0004", 0], ["Highlights", "-0005", 0], ["Shadows", "-0006", 0], ["Saturation", "-0007", 100], ["Vibrance", "-0008", 0]]),
  "ADBE Ramp": E("Gradient Ramp", [["Start of Ramp", "-0001", [0, 0]], ["Start Color", "-0002", [0, 0, 0, 1]], ["End of Ramp", "-0003", [100, 0]], ["End Color", "-0004", [1, 1, 1, 1]], ["Ramp Shape", "-0005", 1]]),
  "PEDG": E("Deep Glow", [["Radius", "-0001", 100]]),
  "ADBE Grid": E("Grid", [["Anchor", "-0001", [0, 0]], ["Size From", "-0002", 2], ["Corner", "-0003", [100, 100]], ["Width", "-0004", 50], ["Height", "-0005", 50], ["Border", "-0006", 1], ["Color", "-0009", [1, 1, 1, 1]]]),
};
const makeEffect = (mn, probe) => {
  const def = EFFECTS[mn];
  if (!def) return null;
  if (probe) return true;
  const g = new Group(def[0], mn, null, false);
  def[1].forEach(([n, suf, v]) => g.push(P2(n, mn + suf, v)));
  return g;
};
const TEXT_PROPS = {
  "ADBE Text Scale 3D": ["Scale", [100, 100, 100]], "ADBE Text Opacity": ["Opacity", 100], "ADBE Text Position 3D": ["Position", [0, 0, 0]],
  "ADBE Text Blur": ["Blur", [0, 0]], "ADBE Text Rotation X": ["X Rotation", 0], "ADBE Text Tracking Amount": ["Tracking Amount", 0],
  "ADBE Text Character Offset": ["Character Offset", 0], "ADBE Text Fill Color": ["Fill Color", [1, 0, 0, 1]],
};
const makeAnimator = (mn, probe) => {
  if (mn !== "ADBE Text Animator") return null;
  if (probe) return true;
  const sels = new Group("Selectors", "ADBE Text Selectors", (m, pr) => {
    if (m !== "ADBE Text Expressible Selector" && m !== "ADBE Text Selector") return null;
    if (pr) return true;
    return new Group("Expression Selector 1", m, null, false).push(new Prop("Based On", "ADBE Text Range Type2", 1)).push(new Prop("Amount", "ADBE Text Expressible Amount", [100, 100, 100], PVT.ThreeD));
  }, true);
  const props = new Group("Properties", "ADBE Text Animator Properties", (m, pr) => {
    const d = TEXT_PROPS[m];
    if (!d) return null;
    if (pr) return true;
    return P2(d[0], m, d[1]);
  }, true);
  return new Group("Animator 1", mn, null, false).push(sels).push(props);
};
const makeVector = (mn, probe) => {
  const ok2 = ["ADBE Vector Group", "ADBE Vector Shape - Rect", "ADBE Vector Shape - Ellipse", "ADBE Vector Graphic - Fill"].includes(mn);
  if (!ok2) return null;
  if (probe) return true;
  if (mn === "ADBE Vector Group") {
    return new Group("Group 1", mn, null, false).push(new Group("Contents", "ADBE Vectors Group", makeVector, true))
      .push(new Group("Transform: Group 1", "ADBE Vector Transform Group", null, false).push(P2("Position", "ADBE Vector Position", [0, 0])).push(P2("Scale", "ADBE Vector Scale", [100, 100])));
  }
  if (mn === "ADBE Vector Shape - Rect") return new Group("Rectangle Path 1", mn, null, false).push(P2("Size", "ADBE Vector Rect Size", [100, 100])).push(P2("Position", "ADBE Vector Rect Position", [0, 0])).push(new Prop("Roundness", "ADBE Vector Rect Roundness", 0));
  if (mn === "ADBE Vector Shape - Ellipse") return new Group("Ellipse Path 1", mn, null, false).push(P2("Size", "ADBE Vector Ellipse Size", [100, 100])).push(P2("Position", "ADBE Vector Ellipse Position", [0, 0]));
  return new Group("Fill 1", mn, null, false).push(P2("Color", "ADBE Vector Fill Color", [1, 1, 1, 1]));
};
const makeMask = (mn, probe) => {
  if (mn !== "ADBE Mask Atom") return null;
  if (probe) return true;
  const g = new Group("Mask 1", mn, null, false).push(new Prop("Mask Path", "ADBE Mask Shape", null, PVT.SHAPE)).push(P2("Mask Feather", "ADBE Mask Feather", [0, 0]));
  g.maskMode = 1;
  return g;
};

// ------------------------------------------------------------------ calques, comp, projet
class MarkerValue { constructor(c) { this.comment = c; } }
class KeyframeEase { constructor(s, i) { this.speed = s; this.influence = i; } }
class Shape { constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = false; } }
class Item {
  constructor(name) { this.name = name; this.id = uid++; this._pf = null; }
  get parentFolder() { return this._pf; }
  set parentFolder(f) { if (this._pf && this._pf.items) this._pf.items.splice(this._pf.items.indexOf(this), 1); this._pf = f; if (f && f.items) f.items.push(this); }
  get usedIn() { return proj.items._all.filter((c) => c instanceof CompItem && c.list.some((l) => l.source === this)); }
  remove() {
    if (this.items) this.items.slice().forEach((it) => it.remove());
    this.parentFolder = null;
    const i = proj.items._all.indexOf(this);
    if (i >= 0) proj.items._all.splice(i, 1);
    S.removed.push(this.name);
  }
}
class FolderItem extends Item { constructor(n) { super(n); this.items = []; } get numItems() { return this.items.length; } item(i) { return this.items[i - 1]; } }
class SolidSource { constructor(c) { this.color = c; } }
class FootageItem extends Item {
  constructor(n, w, h, src, file) { super(n); Object.assign(this, { width: w, height: h, mainSource: src || null, file: file || null, duration: src ? 0 : 20 }); this.hasAudio = !!file; this.hasVideo = !file; }
}
class TextDoc { constructor(t) { Object.assign(this, { text: t, fontSize: 100, fillColor: [1, 1, 1], applyFill: true, applyStroke: false, strokeColor: [0, 0, 0], strokeWidth: 0, font: "Arial", justification: 1 }); } }
class AVLayer {
  constructor(name, comp, source) {
    Object.assign(this, { name, comp, source: source || null, selected: false, locked: false, enabled: true, inPoint: 0, outPoint: comp.duration,
      startTime: 0, adjustmentLayer: false, nullLayer: false, comment: "", hasAudio: false, hasVideo: true, threeDLayer: false, stretch: 100, parent: null,
      blendingMode: 1, motionBlur: false, timeRemapEnabled: false, frameBlendingType: 0, threeDPerChar: false });
    this.canSetTimeRemapEnabled = !!(source && !source.mainSource);
    this.root = new Group(name, "ADBE AV Layer", null, false)
      .push(new Prop("Marker", "ADBE Marker", null, PVT.MARKER))
      .push(new Prop("Time Remap", "ADBE Time Remapping", 0))
      .push(new Group("Masks", "ADBE Mask Parade", makeMask, true))
      .push(new Group("Effects", "ADBE Effect Parade", makeEffect, true))
      .push(new Group("Transform", "ADBE Transform Group", null, false)
        .push(P2("Position", "ADBE Position", [540, 960, 0])).push(P2("Scale", "ADBE Scale", [100, 100, 100])).push(new Prop("Opacity", "ADBE Opacity", 100)));
  }
  property(x) { return this.root.property(x); }
  get numProperties() { return this.root.numProperties; }
  get index() { return this.comp.list.indexOf(this) + 1; }
  moveBefore(o) { const l = this.comp.list; l.splice(l.indexOf(this), 1); l.splice(l.indexOf(o), 0, this); }
  moveAfter(o) { const l = this.comp.list; l.splice(l.indexOf(this), 1); l.splice(l.indexOf(o) + 1, 0, this); }
  remove() { this.comp.list.splice(this.comp.list.indexOf(this), 1); }
  sourceRectAtTime() { return { left: -200, top: -60, width: 400, height: 80 }; }
}
class TextLayer extends AVLayer {
  constructor(name, comp, txt) {
    super(name, comp);
    this.root.push(new Group("Text", "ADBE Text Properties", null, false)
      .push(new Prop("Source Text", "ADBE Text Document", new TextDoc(txt || name), PVT.TEXT_DOCUMENT))
      .push(new Group("Animators", "ADBE Text Animators", makeAnimator, true)));
  }
}
class ShapeLayer extends AVLayer {
  constructor(comp) { super("Shape Layer 1", comp); this.root.push(new Group("Contents", "ADBE Root Vectors Group", makeVector, true)); }
}
class CameraLayer {}
class LightLayer {}
class CompItem extends Item {
  constructor(name, w, h, dur, fps) {
    super(name);
    Object.assign(this, { width: w || 1080, height: h || 1920, frameRate: fps || 60, frameDuration: 1 / (fps || 60), duration: dur || 10, time: 1, pixelAspect: 1, list: [],
      frameBlending: false, motionBlur: false, resolutionFactor: [1, 1], bgColor: [0, 0, 0] });
    const comp = this;
    this.layers = {
      add(item) { const L = new AVLayer(item.name, comp, item); if (item.hasAudio) { L.hasAudio = true; L.hasVideo = false; } comp.list.unshift(L); return L; },
      addSolid(color, name, w, h) { const src = new FootageItem(name, w, h, new SolidSource(color)); proj.items._all.push(src); const L = new AVLayer(name, comp, src); comp.list.unshift(L); return L; },
      addText(t) { const L = new TextLayer(t, comp, t); comp.list.unshift(L); return L; },
      addShape() { const L = new ShapeLayer(comp); comp.list.unshift(L); return L; },
    };
    this.selectedProperties = [];
  }
  get numLayers() { return this.list.length; }
  layer(i) { return typeof i === "number" ? this.list[i - 1] : this.list.find((l) => l.name === i); }
  get selectedLayers() { return this.list.filter((l) => l.selected); }
}
class ImportOptions { constructor(f) { this.file = f; } }
// File de rendu : render() « écrit » le fichier de chaque élément coché.
const RQ_TEMPLATES = ["Best Settings", "Lossless", "H.264 - Match Render Settings - 15 Mbps", "H.264 - Match Render Settings - 5 Mbps", "H.264 - Match Render Settings - 40 Mbps", "_HIDDEN X-Factor 16"];
class OutputModule { constructor() { this.templates = RQ_TEMPLATES.slice(); this.template = "Lossless"; this.file = null; } applyTemplate(n) { if (!this.templates.includes(n)) throw new Error("modèle inconnu " + n); this.template = n; } }
class RQItem {
  constructor(comp) { this.comp = comp; this.render = true; this.om = new OutputModule(); this.settings = "Best Settings"; }
  outputModule(i) { if (i !== 1) throw new Error("om " + i); return this.om; }
  applyTemplate(n) { if (n !== "Best Settings" && n !== "Current Settings") throw new Error("modèle de rendu inconnu " + n); this.settings = n; }
  remove() { const l = proj.renderQueue.list; l.splice(l.indexOf(this), 1); }
}
const renderQueue = {
  list: [], rendered: [],
  items: { add(comp) { const it = new RQItem(comp); renderQueue.list.push(it); return it; } },
  get numItems() { return this.list.length; },
  item(i) { return this.list[i - 1]; },
  render() {
    const todo = this.list.filter((it) => it.render);
    if (!todo.length) throw new Error("rien à rendre");
    todo.forEach((it) => {
      if (!it.om.file) throw new Error("pas de fichier de sortie");
      if (S.files.has(it.om.file.fsName)) throw new Error("le fichier existe déjà (AE demanderait d'écraser) : " + it.om.file.fsName);
      S.files.set(it.om.file.fsName, "VIDEO " + it.comp.name + " " + it.om.template + " " + it.settings + " res " + it.comp.resolutionFactor.join("x"));
      this.rendered.push(it.comp.name);
    });
  },
};
const proj = {
  activeItem: null, expressionEngine: "javascript-1.0", renderQueue,
  items: {
    _all: [],
    addFolder(n) { const f = new FolderItem(n); this._all.push(f); return f; },
    addComp(n, w, h, pa, dur, fps) { const c = new CompItem(n, w, h, dur, fps); this._all.push(c); return c; },
  },
  get numItems() { return this.items._all.length; },
  item(i) { return this.items._all[i - 1]; },
  importFile(io) { const it = new FootageItem(io.file.displayName, 0, 0, null, io.file); this.items._all.push(it); return it; },
};
const effectsList = Object.keys(EFFECTS).map((mn) => ({ displayName: EFFECTS[mn][0], matchName: mn, category: "Mock" }));
const app = {
  version: "25.1x68", isoLanguage: "en_US", project: proj, effects: effectsList,
  preferences: { havePref: () => true, getPrefAsLong: () => 1 },
  beginUndoGroup(n) { S.undo++; S.undoLog.push(n); },
  endUndoGroup() { S.undo--; },
  findMenuCommandId: (n) => (n === "Convert Audio to Keyframes" ? 5015 : 0),
  executeCommand(id) {
    // Convert Audio to Keyframes : calque "Audio Amplitude" avec 3 sliders animés (pics toutes les 0,5 s)
    const comp = proj.activeItem, L = new AVLayer("Audio Amplitude", comp, null), fx = L.property("ADBE Effect Parade");
    for (let k = 0; k < 3; k++) {
      const e = fx.addProperty("ADBE Slider Control");
      for (let f = 0; f < 240; f++) e.property(1).setValueAtTime(f / 60, (f % 30 === 15) ? 20 : 3 + (f % 7));
    }
    comp.list.unshift(L);
  },
  fonts: { getFontsByFamilyNameAndStyleName: (fam) => (fam === "Bebas Neue" || fam === "Rajdhani" ? [{ postScriptName: fam.replace(/ /g, "") + "-Regular" }] : []) },
};
const sb = {
  app, File, Folder, Shape, PropertyType, PropertyValueType: PVT, MarkerValue, KeyframeEase, KeyframeInterpolationType: { LINEAR: 1, BEZIER: 2, HOLD: 3 },
  ParagraphJustification: { CENTER_JUSTIFY: 1, RIGHT_JUSTIFY: 2 }, BlendingMode: { NORMAL: 1, LIGHTEN: 2, OVERLAY: 3, SCREEN: 4, ADD: 5 },
  MaskMode: { ADD: 1, SUBTRACT: 2 }, FrameBlendingType: { NO_FRAME_BLEND: 0, PIXEL_MOTION: 2 },
  CompItem, FolderItem, FootageItem, SolidSource, AVLayer, TextLayer, ShapeLayer, CameraLayer, LightLayer, ImportOptions,
  timeToCurrentFormat: (t) => "0:00:" + t.toFixed(2),
  alert: (m) => S.alerts.push(m), confirm: () => false,
};
sb.$ = { global: sb, fileName: "C:/projet/cep/host/yexofx_host.jsx", os: "Windows (mock)" };
const ctx = vm.createContext(sb);
vm.runInContext(HOST, ctx, { filename: "yexofx_host.jsx" });
const api = (cmd, args) => JSON.parse(vm.runInContext("YFX.api.call(" + JSON.stringify(JSON.stringify({ cmd, args })) + ")", ctx));

// ------------------------------------------------------------------ mini moteur d'expressions
const markerApi = (layer) => {
  const marker = layer.property("ADBE Marker");
  return {
    get numKeys() { return marker.numKeys; },
    key: (i) => ({ time: marker.keyTime(i), index: i, comment: marker.keyValue(i).comment }),
    nearestKey: (t) => { let best = 1, bd = Infinity; for (let i = 1; i <= marker.numKeys; i++) { const d = Math.abs(marker.keyTime(i) - t); if (d < bd) { bd = d; best = i; } } return { index: best, time: marker.keyTime(best) }; },
  };
};
const layerApi = (layer) => {
  const fx = layer.property("ADBE Effect Parade");
  return {
    marker: markerApi(layer), inPoint: layer.inPoint, outPoint: layer.outPoint, startTime: layer.startTime,
    source: { duration: 20 }, sourceRectAtTime: () => layer.sourceRectAtTime(),
    effect: (name) => { const e = fx.property(name); if (!e) throw new Error("effet introuvable dans l'expression : " + name); return (i) => e.property(i).value; },
  };
};
const evalExpr = (prop, layer, comp, time, extra) => {
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const L = layerApi(layer);
  let value = prop.value;
  if (prop.matchName === "ADBE Text Document") value = prop.value.text;
  if (prop.matchName === "ADBE Time Remapping") value = time - layer.startTime;
  const env = {
    value, time, Math, thisLayer: L, inPoint: layer.inPoint, outPoint: layer.outPoint, sourceRectAtTime: L.sourceRectAtTime,
    thisComp: { frameDuration: comp.frameDuration, width: comp.width, height: comp.height, layer: (n) => { const l = comp.layer(n); if (!l) throw new Error("calque introuvable dans l'expression : " + n); return layerApi(l); } },
    effect: L.effect, textIndex: 1, textTotal: 4,
    seedRandom: (s) => { seed = (Math.abs(Math.floor(s * 7919)) % 2147483646) + 1; },
    random: (a, b) => (a === undefined ? rnd() : b === undefined ? rnd() * a : a + rnd() * (b - a)),
    wiggle: (f, a) => (Array.isArray(prop.value) ? prop.value.map((v) => v + a * 0.3) : prop.value + a * 0.3),
    ...extra,
  };
  return vm.runInNewContext(prop.expression, env);
};
const checkSyntax = (expr) => { acorn.parse(expr, { ecmaVersion: 3, allowReserved: true }); new vm.Script(expr); return true; };
const validResult = (r) => (typeof r === "number" ? Number.isFinite(r) : typeof r === "string" ? true : Array.isArray(r) && r.every((v) => Number.isFinite(v)));
const allExprProps = (comp) => {
  const out = [];
  const walk = (layer, g) => g.children.forEach((c) => { if (c instanceof Group) walk(layer, c); else if (c.expression) out.push({ layer, prop: c }); });
  comp.list.forEach((l) => walk(l, l.root));
  return out;
};

// ------------------------------------------------------------------ scène
const comp = new CompItem("EDIT");
const titre = new TextLayer("TITRE", comp, "HEADSHOT");
const clip = new AVLayer("Clip_ace.mp4", comp, new FootageItem("Clip_ace.mp4", 1080, 1920));
const clip2 = new AVLayer("Clip_b.mp4", comp, new FootageItem("Clip_b.mp4", 1080, 1920));
const music = new AVLayer("musique.wav", comp, new FootageItem("musique.wav", 0, 0, null, new File("C:/assets/musique.wav")));
music.hasAudio = true; music.hasVideo = false;
clip2.inPoint = 3;
comp.list.push(titre, clip, clip2, music);
proj.items._all.push(comp);
proj.activeItem = comp;
const fd = comp.frameDuration;
const deselect = () => comp.list.forEach((l) => { l.selected = false; });

console.log("\n1. API de base");
let r = api("ping");
ok(r.ok && r.data.version === "0.5.0", "ping : moteur v" + (r.data && r.data.version));
r = api("presets");
const ids = r.data || [];
ok(r.ok && ids.length >= 73 && !ids.includes("dev_throw"), `presets disponibles : ${ids.length}`);
titre.selected = true;
r = api("context");
ok(r.ok && r.data.comp.name === "EDIT" && r.data.sel.length === 1 && r.data.sel[0].kind === "texte", "context : comp + sélection");
r = api("nimporte");
ok(!r.ok && /inconnue/.test(r.error), "commande inconnue refusée");

console.log("\n2. Scénarios précis");
const curve = { b: [0.34, 1.56, 0.64, 1], special: false, name: "Back" };
r = api("apply", { id: "pop", params: { frames: 16, intensity: 1, curve, dir: "in", by: "car" } });
const anim = titre.property("ADBE Text Properties").property("ADBE Text Animators").property("YFX_Pop");
const amount = anim && anim.property("ADBE Text Selectors").property(1).property("ADBE Text Expressible Amount");
const popAt = (t, idx) => evalExpr(amount, titre, comp, t, { textIndex: idx, textTotal: 4 })[0];
let minV = 100;
for (let f = 0; f <= 16; f++) minV = Math.min(minV, popAt(f * fd, 1));
ok(r.ok && near(popAt(0, 1), 100) && near(popAt(16 * fd, 1), 0) && minV < -1 && near(popAt(0, 4), 100), `Pop : 100 → 0 avec overshoot (min ${minV.toFixed(1)}), lettre 4 décalée`);
deselect();
comp.time = 2;
r = api("apply", { id: "impact", params: { frames: 12, intensity: 1, curve } });
const imp = comp.layer("YFX_Impact");
const pos = imp && imp.property("ADBE Effect Parade").property("YFX_Impact_Transform").property("Position");
const hit = pos && evalExpr(pos, imp, comp, 2 + 2 * fd);
ok(r.ok && imp.adjustmentLayer && evalExpr(pos, imp, comp, 1.9).join() === "540,960" && (Math.abs(hit[0] - 540) + Math.abs(hit[1] - 960)) > 3 && evalExpr(pos, imp, comp, 2 + 13 * fd).join() === "540,960", "Impact : secousse uniquement pendant 12 f après le marker");
comp.time = 5;
r = api("apply", { id: "impact", params: {} });
ok(r.ok && comp.list.filter((l) => l.name === "YFX_Impact").length === 1 && imp.property("ADBE Marker").numKeys === 2, "2e clic : marker ajouté sur le même calque");
music.property("ADBE Marker").setValueAtTime(1, new MarkerValue("beat"));
music.property("ADBE Marker").setValueAtTime(1.5, new MarkerValue("beat"));
music.property("ADBE Marker").setValueAtTime(2.5, new MarkerValue("beat"));
music.selected = true;
r = api("apply", { id: "flash", params: { frames: 4, intensity: 1, curve: { b: [0.16, 1, 0.3, 1], name: "Expo" } } });
const fl = comp.layer("YFX_Flash");
ok(r.ok && fl && near(evalExpr(fl.property("ADBE Transform Group").property("ADBE Opacity"), fl, comp, comp.time), 85, 0.01), "Flash : opacité 85 au marker");
r = api("apply", { id: "killhit", params: { frames: 8 } });
const kh = comp.layer("YFX_KillHit");
ok(r.ok && kh && kh.property("ADBE Marker").numKeys === 3 && /3 impacts/.test(r.data.msg), "Kill Hit sur la musique sélectionnée : un impact par beat (" + (r.data ? r.data.msg : r.error) + ")");
ok(comp.layer("YFX_KillHit_RGB_R") && comp.layer("YFX_KillHit_RGB_R").blendingMode === sb.BlendingMode.LIGHTEN && comp.layer("YFX_KillHit_RGB_R").index === kh.index + 2, "Kill Hit : calques RGB rouge / bleu en Éclaircir sous le calque d'impact");
const ghost = comp.layer("YFX_KillHit_RGB_R").property("ADBE Effect Parade").property("YFX_KillHit_Decalage").property("Position");
ok(evalExpr(ghost, comp.layer("YFX_KillHit_RGB_R"), comp, 1)[0] > 540 && evalExpr(ghost, comp.layer("YFX_KillHit_RGB_R"), comp, 0.9)[0] === 540, "RGB : décalage au moment du beat, aligné avant");
deselect();
clip.selected = true;
comp.time = 4;
r = api("apply", { id: "velocity", params: { frames: 30, intensity: 1, curve } });
const tr = clip.property("ADBE Time Remapping");
ok(r.ok && clip.timeRemapEnabled && clip.frameBlendingType === 2 && /YFX_Velocity/.test(tr.expression), "Velocity : Time Remapping + Pixel Motion + expression");
const src = (t) => evalExpr(tr, clip, comp, t);
const spAt = (t) => (src(t + fd) - src(t - fd)) / (2 * fd);
ok(near(src(3), 3, 0.001) && spAt(4) < 0.6 && spAt(3.75) > 1.3 && near(src(5) - 5, src(5.5) - 5.5, 0.001), `Velocity : normale avant, rapide puis lente au marker (x${spAt(3.75).toFixed(2)} → x${spAt(4).toFixed(2)}), vitesse 1 après`);
r = api("apply", { id: "freeze", params: { frames: 20 } });
ok(r.ok && /YFX_Velocity/.test(tr.expression) && /YFX_Freeze/.test(tr.expression), "Freeze sur le même clip : expression combinée (velocity + freeze)");
deselect();
comp.selectedProperties = [];
const sc = clip.property("ADBE Transform Group").property("ADBE Scale");
sc.setValueAtTime(0, [100, 100, 100]); sc.setValueAtTime(1, [150, 150, 100]);
sc.selectedKeys = [1, 2];
comp.selectedProperties = [sc];
r = api("apply", { id: "ease", params: { curve: { b: [0.16, 1, 0.3, 1], name: "Expo" } } });
ok(r.ok && Math.abs(sc.keys[0].outE[0].influence - 16) < 0.01 && Math.abs(sc.keys[0].outE[0].speed - 50 / 0.16) < 0.01, "Easing keys : bézier → influence 16 %, vitesse " + (sc.keys[0].outE ? sc.keys[0].outE[0].speed.toFixed(1) : "?"));
comp.selectedProperties = [];
music.selected = true;
r = api("apply", { id: "beat", params: { frames: 8, intensity: 1 } });
ok(r.ok && music.property("ADBE Marker").numKeys > 3 && !comp.layer("Audio Amplitude"), "Beat sync : markers posés, calque Audio Amplitude supprimé (" + (r.data ? r.data.msg : r.error) + ")");
deselect();
r = api("apply", { id: "marker", params: {} });
ok(!r.ok && r.user && /au moins un calque/.test(r.error), "erreur utilisateur claire : " + r.error);
clip.selected = true;
r = api("apply", { id: "pop", params: {} });
ok(!r.ok && r.user && /calque texte/.test(r.error), "Pop sur un clip : " + r.error);
r = api("sfx", { path: "C:/assets/sfx/impact/impact_02.wav", mode: "cti" });
ok(r.ok, "SFX placé au CTI");

console.log("\n3. Tous les presets (application + expressions évaluées)");
const setup = {
  text: () => [titre], av: () => [clip], two: () => [clip, clip2], audio: () => [music], layer: () => [clip], comp: () => [], any: () => [],
};
const needsOf = {};
vm.runInContext("YFX.reg.list", ctx).forEach((p) => { needsOf[p.id] = p.needs; });
let applied = 0;
const failed = [];
for (const id of ids) {
  if (id === "tools_clean" || id === "ease") continue;
  deselect();
  comp.time = 2 + (applied % 5) * 0.4;
  (setup[needsOf[id]] || setup.comp)().forEach((l) => { l.selected = true; });
  r = api("apply", { id, params: { frames: 10, intensity: 1, curve, dir: "both", by: "mot" } });
  if (r.ok) applied++; else failed.push(id + " → " + r.error);
}
ok(failed.length === 0, `${applied} presets appliqués sans erreur` + (failed.length ? "\n      " + failed.join("\n      ") : ""));
const exprs = allExprProps(comp);
const bad = [];
for (const { layer, prop } of exprs) {
  try { checkSyntax(prop.expression); } catch (e) { bad.push(`${layer.name} > ${prop.name} : syntaxe ${e.message}`); continue; }
  for (const t of [0, 1, 2.05, 2.5, 4.1, 6]) {
    let res;
    try { res = evalExpr(prop, layer, comp, t); } catch (e) { bad.push(`${layer.name} > ${prop.name} @${t}s : ${e.message}`); break; }
    if (!validResult(res)) { bad.push(`${layer.name} > ${prop.name} @${t}s : résultat invalide ${JSON.stringify(res)}`); break; }
  }
}
ok(bad.length === 0, `${exprs.length} expressions vérifiées (syntaxe ES3 + JS, évaluées à 6 instants)` + (bad.length ? "\n      " + bad.slice(0, 12).join("\n      ") : ""));
ok(S.undo === 0, "undo groups équilibrés (" + S.undoLog.length + " actions)");
ok(S.alerts.length === 0, "aucune boîte de dialogue côté moteur");

console.log("\n4. Nettoyer");
deselect();
titre.selected = true;
r = api("apply", { id: "tools_clean", params: {} });
ok(r.ok && titre.property("ADBE Effect Parade").numProperties === 0 && titre.property("ADBE Text Properties").property("ADBE Text Animators").numProperties === 0, "effets et animators YFX retirés du texte : " + (r.data ? r.data.msg : r.error));

console.log("\n5. Previews (génération dans AE)");
const isPv = (it) => /^YFX_PV_/.test(it.name) || it.name === "YFX_Previews";
deselect();
const userRq = renderQueue.items.add(comp);
clip.selected = true;
comp.time = 4;
r = api("pvInfo");
ok(r.ok && /Clip_ace\.mp4/.test(r.data.source) && r.data.queued === 1, "pvInfo : clip sélectionné proposé comme source, 1 rendu déjà en file (" + (r.data ? r.data.source : r.error) + ")");
deselect();
r = api("pvInfo");
ok(r.ok && r.data.source === null, "pvInfo sans sélection : scène de démo");
r = api("pvBegin");
const scene = proj.items._all.find((it) => it.name === "YFX_PV_Scene");
ok(r.ok && /5 Mbps/.test(r.data.template) && userRq.render === false && scene && scene.parentFolder.name === "YFX_Previews" && scene.list.length >= 8,
  `pvBegin : modèle « ${r.data && r.data.template} », file de l'utilisateur mise de côté, scène de démo (${scene ? scene.list.length : 0} calques)`);
const kinds = { killhit: "hit", pop: "text", zoom: "cut", popin: "cut", velocity: "hit", grain: "hit", feed: "text", val: "text", "tw-slide": "hit", rumble: "hit", letterbox: "hit", kin: "text" };
const pvBad = [];
for (const [id, kind] of Object.entries(kinds)) {
  r = api("pvRender", { id, kind, word: "ACE", params: { frames: 0, intensity: 1, curve } });
  const f = r.ok && S.files.get(norm(r.data.file));
  if (!r.ok) pvBad.push(id + " → " + r.error);
  else if (!f || !/\.mp4$/.test(r.data.file) || !/5 Mbps Current Settings res 2x2/.test(f)) pvBad.push(id + " → fichier " + r.data.file + " : " + f);
  else if (proj.items._all.some((it) => it.name === "YFX_PV_" + id)) pvBad.push(id + " → comp de preview non supprimée");
}
ok(pvBad.length === 0, `pvRender : ${Object.keys(kinds).length} previews rendues en .mp4 (H.264, demi-résolution), comps supprimées` + (pvBad.length ? "\n      " + pvBad.join("\n      ") : ""));
r = api("pvRender", { id: "killhit", kind: "hit", keep: true, params: { frames: 8 } });
const pvComp = proj.items._all.find((it) => it.name === "YFX_PV_killhit");
r = api("pvRender", { id: "killhit", kind: "hit", keep: true, params: { frames: 8 } });
ok(r.ok, "rendu à nouveau du même preset : l'ancien fichier est remplacé");
const pvExprBad = [];
if (pvComp) {
  for (const { layer, prop } of allExprProps(pvComp)) {
    for (const t of [0, 0.69, 0.75, 1.2, 1.9]) {
      try { if (!validResult(evalExpr(prop, layer, pvComp, t))) pvExprBad.push(layer.name + " > " + prop.name + " @" + t); } catch (e) { pvExprBad.push(layer.name + " > " + prop.name + " @" + t + " : " + e.message); }
    }
  }
}
const srcL = pvComp && pvComp.list.find((l) => l.source === scene);
ok(pvComp && srcL && near(srcL.startTime, -0.5, 1e-6) && pvComp.layer("YFX_KillHit") && pvComp.layer("YFX_KillHit").property("ADBE Marker").keyTime(1) === 0.7 && pvExprBad.length === 0,
  "comp de preview gardée (keep) : kill de la scène calé à 0,7 s, marker d'impact à 0,7 s, expressions valides" + (pvExprBad.length ? "\n      " + pvExprBad.slice(0, 6).join("\n      ") : ""));
r = api("pvRender", { id: "beat", kind: "hit" });
ok(!r.ok && r.user, "Beat sync : pas de preview (" + r.error + ")");
r = api("pvEnd", {});
ok(r.ok && !proj.items._all.some(isPv) && userRq.render === true && !proj.items._all.some((it) => /_1080x1352$/.test(it.name)),
  `pvEnd : ${r.data && r.data.removed} élément(s) de démo supprimés, file de l'utilisateur rétablie`);
clip.selected = true;
comp.time = 4;
r = api("pvBegin");
const r2 = api("pvRender", { id: "zoom", kind: "cut" });
ok(r.ok && /Clip_ace/.test(r.data.source) && r2.ok && !proj.items._all.some((it) => it.name === "YFX_PV_Scene"), "avec ton clip sélectionné : preview rendue sur le clip, sans scène de démo");
api("pvEnd", {});
userRq.remove();
ok(S.undo === 0 && S.alerts.length === 0, "undo groups équilibrés et aucune boîte de dialogue après les previews");

console.log(failures ? `\nECHEC : ${failures} test(s) en échec\n` : "\nOK : moteur validé (mocks)\n");
process.exit(failures ? 1 : 0);
