// Catalogue YexoFX : validation, perf, anti-doublon, verrou des ids, données du panel.
//   1. lit le schéma des primitives dans le moteur buildé (vm Node) -> catalog/prims.json
//   2. valide catalog/<catégorie>.json (champs, primitives, paramètres, hôtes)
//   3. calcule la perf (somme des coûts), vérifie ids.lock (aucun id publié ne disparaît)
//   4. lint anti-doublon (distance entre recettes) + couverture des styles
//   5. écrit cep/js/catalog.data.js (panel) et docs/CATALOGUE.md (tableau récapitulatif)
// Usage : node tools/catalog.mjs [--strict] [--quiet]
//   --strict : la couverture des styles (>= 30 presets) devient bloquante.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAT_DIR = join(ROOT, "catalog");
const args = new Set(process.argv.slice(2));
const STRICT = args.has("--strict");
const QUIET = args.has("--quiet");

export const CATS = [
  { id: "impacts", label: "Impacts", en: "Hits", prefix: "imp" },
  { id: "text", label: "Texte", en: "Text", prefix: "txt" },
  { id: "styles", label: "Styles", en: "Looks", prefix: "sty" },
  { id: "shake", label: "Shake", en: "Shake", prefix: "shk" },
  { id: "twitch", label: "Twitch", en: "Twitch", prefix: "twi" },
  { id: "speed", label: "Vitesse", en: "Speed", prefix: "spd" },
  { id: "trans", label: "Transitions", en: "Transitions", prefix: "trn" },
  { id: "fx", label: "FX", en: "FX", prefix: "fx" },
  { id: "hud", label: "Overlays & HUD", en: "Overlays & HUD", prefix: "hud" },
  { id: "cam3d", label: "Caméra 3D", en: "3D camera", prefix: "cam" },
];
const ROLES = ["in", "hit", "hold", "out", "transition"];
const HOSTS = ["any", "adj", "layer", "text", "clip", "cut", "two", "new", "comp"];
const DRIVES = ["marker", "cut", "loop", "inout", "static"];
const SELS = ["comp", "any", "layer", "av", "text", "audio", "two"];
const CURVES = ["main", "linear", "expo", "back", "quint", "smooth", "snap", "antic", "aggro", "elastic"];
const SHAPES = ["decay", "attack", "bell", "hold", "ramp", "pulse", "strobe", "steps"];
const PREVIEW = ["hit", "text", "cut", "loop", "none"];
const HEX = /^#[0-9a-fA-F]{6}$/;

// ---------------------------------------------------------------- 1. moteur -> schéma des primitives
const loadEngine = () => {
  const code = readFileSync(join(ROOT, "cep", "host", "yexofx_host.jsx"), "utf8");
  class Folder { constructor(p) { this.fsName = String(p); } get exists() { return false; } get parent() { return null; } create() { return false; } }
  class File { constructor(p) { this.fsName = String(p); } get exists() { return false; } get parent() { return new Folder("x"); } }
  Folder.userData = new Folder("C:/x");
  Folder.myDocuments = new Folder("C:/x");
  const sb = { app: { version: "0", preferences: { havePref: () => false }, effects: [] }, File, Folder };
  sb.$ = { global: sb, fileName: "" };
  vm.createContext(sb);
  vm.runInContext(code, sb, { filename: "yexofx_host.jsx" });
  const Y = sb.YFX;
  return { prims: JSON.parse(JSON.stringify(Y.prim.schema())), native: Y.reg.ids() };
};

// ---------------------------------------------------------------- 2. lecture et validation
const readJson = (f) => JSON.parse(readFileSync(f, "utf8").replace(/^\uFEFF/, ""));
const sanitize = (s) => "YFX_" + String(s).replace(/[^A-Za-z0-9]/g, "");

export const loadCatalog = () => {
  const engine = loadEngine();
  const styles = readJson(join(CAT_DIR, "edit-styles.json")).styles;
  const styleIds = styles.map((s) => s.id);
  const errors = [], warns = [], presets = [];
  const err = (p, m) => errors.push(`${p ? p.id || "?" : "catalogue"} : ${m}`);
  const warn = (p, m) => warns.push(`${p ? p.id || "?" : "catalogue"} : ${m}`);
  // un fichier par catégorie (<cat>.json), plus un fichier par lot (<cat>.2.json, <cat>.3.json…)
  const all = readdirSync(CAT_DIR);
  for (const c of CATS) {
    const files = all.filter((n) => new RegExp("^" + c.id + "(\\.\\d+)?\\.json$").test(n)).sort((a, b) => (a.length - b.length) || a.localeCompare(b));
    if (!files.length) { warns.push(`catalog/${c.id}.json absent`); continue; }
    for (const name of files) {
      let data;
      try { data = readJson(join(CAT_DIR, name)); } catch (e) { errors.push(`catalog/${name} illisible : ${e.message}`); continue; }
      if (data.category !== c.id) err(null, `catalog/${name} : category = ${data.category}`);
      (data.presets || []).forEach((p) => { p._file = c.id; p._order = presets.length; presets.push(p); });
    }
  }
  const ids = new Set(), bases = new Map();
  const legacyBases = new Set();
  for (const p of presets) if (p.impl === "native") legacyBases.add(sanitize(p.name)), legacyBases.add(sanitize(p.nameEn));
  for (const p of presets) {
    const P = engine.prims;
    if (!/^[a-z0-9][a-z0-9-]{1,47}$/.test(p.id || "")) err(p, "id invalide");
    if (ids.has(p.id)) err(p, "id en double"); ids.add(p.id);
    for (const k of ["name", "nameEn", "category", "styles", "tags", "role", "host", "drive", "recipe", "defaults", "needs", "preview"]) if (p[k] === undefined) err(p, `champ manquant : ${k}`);
    if (p.category !== p._file) err(p, `catégorie ${p.category} dans ${p._file}.json`);
    if (p.impl !== "native" && !p.tool) {
      const cat = CATS.find((c) => c.id === p.category);
      if (cat && !p.id.startsWith(cat.prefix + "-")) err(p, `id sans préfixe ${cat.prefix}-`);
    }
    if (p.impl === "native" && !engine.native.includes(p.id)) err(p, "impl native mais id absent du registre du moteur");
    if (typeof p.nameEn !== "string" || !/^[A-Za-z0-9 .+&'\/-]+$/.test(p.nameEn)) err(p, "nameEn invalide (ASCII)");
    const b = sanitize(p.nameEn);
    if (bases.has(b)) err(p, `nameEn « ${p.nameEn} » donne le même nom de calque que ${bases.get(b)}`); else bases.set(b, p.id);
    if (p.impl !== "native" && legacyBases.has(b)) err(p, `nameEn « ${p.nameEn} » entre en collision avec un preset v0.6`);
    if (!Array.isArray(p.styles) || p.styles.length < 1 || p.styles.length > 3) err(p, "1 à 3 styles");
    (p.styles || []).forEach((s) => { if (!styleIds.includes(s)) err(p, `style inconnu ${s}`); });
    if (!Array.isArray(p.tags) || p.tags.length < 2) err(p, "au moins 2 tags");
    if (!ROLES.includes(p.role)) err(p, `role ${p.role}`);
    if (!HOSTS.includes(p.host)) err(p, `host ${p.host}`);
    if (!DRIVES.includes(p.drive)) err(p, `drive ${p.drive}`);
    if (!p.needs || !SELS.includes(p.needs.sel)) err(p, "needs.sel invalide");
    if (!p.preview || !PREVIEW.includes(p.preview.kind)) err(p, "preview.kind invalide");
    const d = p.defaults || {};
    if (d.curve && !CURVES.includes(d.curve)) err(p, `courbe ${d.curve}`);
    if (d.frames !== undefined && d.frames !== "loop" && !(Number.isInteger(d.frames) && d.frames >= 1 && d.frames <= 240)) err(p, "defaults.frames");
    // cohérence hôte / pilotage / sélection
    if (p.impl !== "native") {
      if (p.host === "cut" && p.drive !== "cut") err(p, "host cut => drive cut");
      if (p.drive === "cut" && p.host !== "cut") err(p, "drive cut => host cut");
      if (p.host === "two" && p.needs.sel !== "two") err(p, "host two => needs.sel two");
      if (p.host === "text" && p.needs.sel !== "text") err(p, "host text => needs.sel text");
      if (p.host === "clip" && !["av", "any"].includes(p.needs.sel)) err(p, "host clip => needs.sel av");
      if (p.host === "layer" && !["layer", "av"].includes(p.needs.sel)) err(p, "host layer => needs.sel layer/av");
      if (p.host === "text" && !["inout", "static", "loop"].includes(p.drive)) err(p, "host text => drive inout, static ou loop");
    }
    // étapes
    if (!Array.isArray(p.recipe) || !p.recipe.length) { err(p, "recette vide"); continue; }
    let creates = false;
    p.recipe.forEach((s, i) => {
      const pr = P[s.p];
      const at = `étape ${i + 1} (${s.p})`;
      if (!pr) { err(p, `${at} : primitive inconnue`); return; }
      if (pr.creates) { if (i === 0) creates = true; }
      if (p.impl !== "native") {
        const hosts = pr.hosts.split(" ");
        if (!hosts.includes(p.host) && !(p.host === "new" && creates) && !(p.host === "adj" && hosts.includes("any"))) err(p, `${at} : hôte ${p.host} non supporté (${pr.hosts})`);
      }
      for (const [k, v] of Object.entries(s)) {
        if (k === "p" || k === "label") continue;
        if (k === "env") {
          if (typeof v === "string") { if (!["main", "loop", "none"].includes(v)) err(p, `${at} : env ${v}`); }
          else if (!v || !SHAPES.includes(v.shape)) err(p, `${at} : env.shape`);
          else {
            if (v.curve && !CURVES.includes(v.curve)) err(p, `${at} : env.curve ${v.curve}`);
            if (v.at !== undefined && (v.at < -1 || v.at > 1)) err(p, `${at} : env.at`);
            if (v.at < 0 && p.drive !== "marker") err(p, `${at} : anticipation (at < 0) seulement en pilotage marker`);
          }
          continue;
        }
        const spec = pr.params[k];
        if (!spec) { err(p, `${at} : paramètre inconnu ${k}`); continue; }
        const [type, , a, bb] = spec;
        if (type === "n") {
          if (typeof v === "number") { if (v < a || v > bb) err(p, `${at} : ${k}=${v} hors bornes [${a}, ${bb}]`); }
          else if (v && typeof v === "object" && (v.keys || v.from !== undefined)) { /* animé */ }
          else err(p, `${at} : ${k} doit être un nombre`);
        }
        if (type === "e" && !a.includes(v)) err(p, `${at} : ${k}=${v} (choix : ${a.join(", ")})`);
        if (type === "c" && !HEX.test(v)) err(p, `${at} : couleur ${k}=${v}`);
        if (type === "b" && typeof v !== "boolean") err(p, `${at} : ${k} booléen`);
        if (type === "l" && (!Array.isArray(v) || v.some((x) => !a.includes(x)))) err(p, `${at} : liste ${k}`);
        if (type === "t" && typeof v !== "string") err(p, `${at} : ${k} texte`);
      }
    });
    if (p.impl !== "native" && p.host === "new" && !creates) err(p, "host new : la première étape doit créer le calque (hud, textLayer, particles, camera)");
    if (p.impl !== "native" && p.host !== "new" && creates && !["any", "adj"].includes(p.host)) err(p, "primitive qui crée un calque hors host new");
    // perf
    const cost = p.recipe.reduce((sum, s) => {
      const pr = P[s.p]; if (!pr) return sum;
      let c = pr.cost;
      if (s.p === "glow") c = (s.passes || 1) > 1 ? 3 : 2;
      if (s.p === "radialBlur" && s.type === "spin") c = 4;
      if (s.p === "blocks" && s.kind === "mosh") c = 4;
      return sum + c;
    }, 0);
    const computed = cost >= 9 ? "lourd" : cost >= 4 ? "moyen" : "leger";
    if (!p.perf) p.perf = computed;
    p._cost = cost;
    if (p.perf === "lourd" && !p.alt && p.impl !== "native") warn(p, "preset lourd sans alternative légère (alt)");
  }
  for (const p of presets) if (p.alt && !ids.has(p.alt)) err(p, `alt ${p.alt} inconnu`);
  return { engine, styles, presets, errors, warns };
};

// ---------------------------------------------------------------- 4. anti-doublon
const HUE_NAMES = ["rouge", "orange", "jaune", "lime", "vert", "menthe", "cyan", "azur", "bleu", "violet", "magenta", "rose"];
const hexBucket = (hex) => {
  const r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 0.08) return l > 0.75 ? "blanc" : l < 0.2 ? "noir" : "gris";
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return HUE_NAMES[Math.floor(((h + 15) % 360) / 30)] + (l < 0.3 ? "-sombre" : l > 0.75 ? "-clair" : "");
};

// Primitives dont la présence d'un paramètre change la nature (props d'animator, réglages Lumetri…).
const PRESENCE = new Set(["textReveal", "grade", "levels", "hueSat", "colorBalance"]);

const signature = (p, P) => {
  const tok = new Map(), num = new Map(), kvec = new Map(), rel = new Map();
  const add = (k, w) => tok.set(k, Math.max(tok.get(k) || 0, w));
  add("h:" + p.host, 1); add("d:" + p.drive, 1); add("r:" + p.role, 1);
  const occ = {};
  for (const s of p.recipe) {
    const pr = P[s.p]; if (!pr) continue;
    occ[s.p] = (occ[s.p] || 0) + 1;
    const key = s.p + "#" + occ[s.p];
    add("p:" + key, 1);
    const env = typeof s.env === "object" ? s.env.shape + (s.env.at < 0 ? "-anticip" : "") : (s.env || "main");
    add(`e:${key}=${env}`, 0.5);
    for (const [k, spec] of Object.entries(pr.params)) {
      const [type, def, a, b, fl] = spec;
      const v = s[k] !== undefined ? s[k] : def;
      if (type === "e") add(`c:${key}.${k}=${v}`, 0.5);
      else if (type === "b") add(`c:${key}.${k}=${v}`, 0.4);
      else if (type === "l") (v || []).forEach((x) => add(`c:${key}.${k}=${x}`, 0.5));
      else if (type === "c" && s[k] !== undefined) add(`c:${key}.${k}~${hexBucket(v)}`, 0.5);
      else if (type === "a" && Array.isArray(v) && Array.isArray(v[0])) { /* polices : contenu, ignoré */ }
      else if (type === "n" || type === "a") {
        let x = v;
        if (Array.isArray(v)) x = v.reduce((m, y) => m + Math.abs(Number(y) || 0), 0) / Math.max(1, v.length);
        else if (v && typeof v === "object") { add(`c:${key}.${k}=anime`, 0.5); x = v.keys ? Math.max(...v.keys.map((q) => Math.abs(q[1]))) : Math.max(Math.abs(v.from), Math.abs(v.to)); }
        const span = (typeof a === "number" && typeof b === "number" && b > a) ? b - a : 1;
        const nv = Number(x) / span;
        num.set(`${key}.${k}`, nv);
        rel.set(`${key}.${k}`, { v: Number(x), floor: span * 0.05 });
        if (fl && fl.includes("k")) {
          kvec.set(`${key}.${k}`, Math.abs(Number(x)));
          // composant présent / absent (rotation, zoom…) ou sens inverse (zoom in / out) = vraie différence
          if (Number(x) !== 0) add(`c:${key}.${k}=${Number(x) < 0 ? "neg" : "on"}`, 0.5);
        }
        if (PRESENCE.has(s.p) && s[k] !== undefined && s[k] !== def) add(`c:${key}.${k}=${Number(x) < 0 ? "neg" : "pos"}`, 0.5);
      }
    }
  }
  return { tok, num, kvec, rel };
};

// Règle n° 1 : deux presets sont distincts s'ils diffèrent par la combinaison d'effets, un choix (axe, motif, type,
// mode, couleur, forme d'enveloppe), l'hôte, le pilotage ou le rôle (jetons), ou par un paramètre de forme (rythme,
// angle, cadence…) d'au moins 50 %. Sinon : intensité seule, réglage seul ou doublon (bloquants), ou « proche ».
const compare = (A, B) => {
  let inter = 0, uni = 0, same = A.tok.size === B.tok.size;
  const keys = new Set([...A.tok.keys(), ...B.tok.keys()]);
  for (const k of keys) {
    const a = A.tok.get(k) || 0, b = B.tok.get(k) || 0;
    inter += Math.min(a, b); uni += Math.max(a, b);
    if (a !== b) same = false;
  }
  const J = uni ? inter / uni : 1;
  let diff = 0, n = 0, maxRel = 0, kMax = 0;
  for (const k of new Set([...A.num.keys(), ...B.num.keys()])) {
    if (!A.num.has(k) || !B.num.has(k)) continue;
    diff += Math.min(1, Math.abs(A.num.get(k) - B.num.get(k))); n++;
    const ra = A.rel.get(k), rb = B.rel.get(k);
    const r = Math.min(1, Math.abs(ra.v - rb.v) / Math.max(Math.abs(ra.v), Math.abs(rb.v), ra.floor, 1e-9));
    if (A.kvec.has(k)) kMax = Math.max(kMax, r); else maxRel = Math.max(maxRel, r);
  }
  let cos = 1;
  const kk = [...A.kvec.keys()].filter((k) => B.kvec.has(k));
  if (kk.length) {
    let ab = 0, aa = 0, bb = 0;
    for (const k of kk) { const a = A.kvec.get(k), b = B.kvec.get(k); ab += a * b; aa += a * a; bb += b * b; }
    cos = (aa && bb) ? ab / Math.sqrt(aa * bb) : 1;
  }
  const D = 0.7 * (1 - J) + 0.3 * (n ? diff / n : 0);
  let kind = null;
  if (same) {
    if (maxRel >= 0.5) kind = null;
    else if (maxRel >= 0.25) kind = "PROCHE";
    else if (kMax < 0.1) kind = "RÉGLAGE SEUL";
    else if (cos > 0.98) kind = "INTENSITÉ SEULE";
    else kind = "DOUBLON";
  }
  return { D, J, kind };
};

export const lint = (presets, P) => {
  const list = presets.filter((p) => !p.tool);
  const sig = list.map((p) => signature(p, P));
  const flags = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const r = compare(sig[i], sig[j]);
      if (r.kind) flags.push({ kind: r.kind, a: list[i], b: list[j], D: r.D, legacy: list[i].impl === "native" && list[j].impl === "native" });
    }
  }
  return flags;
};

// ---------------------------------------------------------------- 5. sorties
const run = () => {
  const { engine, styles, presets, errors, warns } = loadCatalog();
  writeFileSync(join(CAT_DIR, "prims.json"), JSON.stringify(engine.prims, null, 1) + "\n");
  // verrou des ids
  const lockFile = join(CAT_DIR, "ids.lock");
  const lock = existsSync(lockFile) ? readFileSync(lockFile, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
  const ids = new Set(presets.map((p) => p.id));
  const lost = lock.filter((id) => !ids.has(id));
  if (lost.length) errors.push(`ids publiés disparus (favoris cassés) : ${lost.join(", ")}`);
  const flags = lint(presets, engine.prims);
  const blocking = flags.filter((f) => f.kind !== "PROCHE" && !f.legacy);
  // couverture des styles
  const real = presets.filter((p) => !p.tool);
  const cover = {};
  styles.forEach((s) => { cover[s.id] = 0; });
  real.forEach((p) => p.styles.forEach((s) => { cover[s] = (cover[s] || 0) + 1; }));
  const thin = styles.filter((s) => cover[s.id] < 30);

  if (!QUIET) {
    console.log(`\nCatalogue : ${real.length} presets (+ ${presets.length - real.length} outils), ${Object.keys(engine.prims).length} primitives`);
    for (const c of CATS) {
      const ps = real.filter((p) => p.category === c.id);
      console.log(`  ${c.label.padEnd(16)} ${String(ps.length).padStart(4)}   léger ${ps.filter((p) => p.perf === "leger").length} · moyen ${ps.filter((p) => p.perf === "moyen").length} · lourd ${ps.filter((p) => p.perf === "lourd").length}`);
    }
    console.log("\nStyles (presets rattachés) :");
    console.log("  " + styles.map((s) => `${s.short} ${cover[s.id]}`).join(" · "));
    if (flags.length) {
      console.log("\nLint anti-doublon :");
      for (const f of flags.slice(0, 80)) console.log(`  ${f.legacy ? "(v0.6) " : ""}${f.kind.padEnd(16)} ${f.a.id} ~ ${f.b.id}  (D = ${f.D.toFixed(3)})`);
      if (flags.length > 80) console.log(`  … ${flags.length - 80} de plus`);
    }
    if (warns.length) { console.log("\nAvertissements :"); warns.slice(0, 40).forEach((w) => console.log("  " + w)); }
  }
  if (thin.length) {
    const msg = `styles sous 30 presets : ${thin.map((s) => `${s.short} (${cover[s.id]})`).join(", ")}`;
    if (STRICT) errors.push(msg); else if (!QUIET) console.log("\n" + msg);
  }
  if (blocking.length) errors.push(`${blocking.length} quasi-doublon(s) bloquant(s) (voir le lint ci-dessus)`);
  // packs de style : un look (Styles), une transition sur calque d'ajustement (coupe), un impact sur marker
  const packs = existsSync(join(CAT_DIR, "packs.json")) ? readJson(join(CAT_DIR, "packs.json")).packs : [];
  const byId = new Map(presets.map((p) => [p.id, p]));
  for (const k of packs) {
    if (!styles.some((s) => s.id === k.style)) errors.push(`pack ${k.id} : style ${k.style} inconnu`);
    const L = byId.get(k.look), C = byId.get(k.cut), B = byId.get(k.beat);
    if (!L || L.category !== "styles") errors.push(`pack ${k.id} : look ${k.look} absent ou hors Styles`);
    if (!C || C.host !== "cut") errors.push(`pack ${k.id} : transition ${k.cut} absente ou pas sur calque d'ajustement`);
    if (!B || B.drive !== "marker") errors.push(`pack ${k.id} : impact ${k.beat} absent ou pas piloté par marker`);
  }
  if (packs.length && styles.some((s) => !packs.some((k) => k.style === s.id))) errors.push("chaque style doit avoir son pack");
  if (errors.length) {
    console.error(`\nECHEC catalogue : ${errors.length} probleme(s)`);
    errors.slice(0, 60).forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  // ids.lock : on ajoute les nouveaux ids (jamais de retrait)
  const newLock = Array.from(new Set(lock.concat(presets.map((p) => p.id)))).sort();
  writeFileSync(lockFile, newLock.join("\n") + "\n");
  // données du panel
  const clean = presets.map((p) => {
    const o = {};
    for (const [k, v] of Object.entries(p)) if (!k.startsWith("_")) o[k] = v;
    o.cost = p._cost;
    return o;
  });
  const synonyms = existsSync(join(CAT_DIR, "synonyms.json")) ? readJson(join(CAT_DIR, "synonyms.json")).groups : [];
  const prims = {};
  for (const [k, v] of Object.entries(engine.prims)) prims[k] = { label: v.label, cost: v.cost, params: v.params };
  const data = { version: 1, cats: CATS.map(({ id, label, en }) => ({ id, label, en })), styles, presets: clean, packs, synonyms, prims };
  const js = "/* GÉNÉRÉ par tools/catalog.mjs depuis catalog/*.json : ne pas éditer. */\nwindow.YX = window.YX || {};\nwindow.YX.catalogData = " + JSON.stringify(data) + ";\n";
  writeFileSync(join(ROOT, "cep", "js", "catalog.data.js"), js);
  // tableau récapitulatif
  const roleFr = { in: "entrée", hit: "impact", hold: "maintien", out: "sortie", transition: "transition" };
  const perfFr = { leger: "léger", moyen: "moyen", lourd: "lourd" };
  let md = "# Catalogue YexoFX\n\nGénéré par `tools/catalog.mjs` : ne pas éditer à la main.\n\n";
  md += `${real.length} presets, ${Object.keys(engine.prims).length} primitives. Lint : ${flags.filter((f) => !f.legacy && f.kind !== "PROCHE").length} doublon(s) bloquant(s), ${flags.filter((f) => f.kind === "PROCHE").length} paire(s) proche(s).\n\n`;
  md += "| Catégorie | Presets | léger | moyen | lourd |\n|---|---|---|---|---|\n";
  for (const c of CATS) { const ps = real.filter((p) => p.category === c.id); md += `| ${c.label} | ${ps.length} | ${ps.filter((p) => p.perf === "leger").length} | ${ps.filter((p) => p.perf === "moyen").length} | ${ps.filter((p) => p.perf === "lourd").length} |\n`; }
  md += "\n| Style | Presets |\n|---|---|\n" + styles.map((s) => `| ${s.name} | ${cover[s.id]} |`).join("\n") + "\n";
  const near = flags.filter((f) => f.kind === "PROCHE");
  if (near.length) md += "\n## Paires proches (à justifier)\n\n" + near.map((f) => `- ${f.a.name} (${f.a.id}) ~ ${f.b.name} (${f.b.id}) : D = ${f.D.toFixed(3)}`).join("\n") + "\n";
  for (const c of CATS) {
    const ps = real.filter((p) => p.category === c.id);
    if (!ps.length) continue;
    md += `\n## ${c.label} (${ps.length})\n\n| Nom | Styles | Rôle | Perf | Recette |\n|---|---|---|---|---|\n`;
    for (const p of ps) md += `| ${p.name}${p.impl === "native" ? " ·v0.6" : ""} | ${p.styles.map((s) => styles.find((x) => x.id === s).short).join(", ")} | ${roleFr[p.role]} | ${perfFr[p.perf]} | ${p.recipe.map((s) => s.p + (s.pattern ? ":" + s.pattern : s.kind ? ":" + s.kind : s.shape ? ":" + s.shape : s.channel ? ":" + s.channel : "")).join(" + ")} |\n`;
  }
  writeFileSync(join(ROOT, "docs", "CATALOGUE.md"), md);
  // guide des styles d'edit : fiche par style, pack, presets phares (le mieux classé de chaque catégorie d'abord)
  const curveFr = { linear: "Linear", expo: "Expo", back: "Back", quint: "Quint", smooth: "Smooth", snap: "Snap", antic: "Anticipate", aggro: "Agressive", elastic: "Elastic" };
  const catFr = Object.fromEntries(CATS.map((c) => [c.id, c.label]));
  const rk = (p) => (typeof p.rank === "number" ? p.rank : 40);
  let sd = "# Les " + styles.length + " styles d'edit\n\nGénéré par `tools/catalog.mjs` depuis `catalog/edit-styles.json` et le catalogue : ne pas éditer à la main.\n\n";
  sd += "Dans le panel, la barre de styles au-dessus des cartes filtre toutes les catégories. Chaque style a son pack " +
    "(Bibliothèque > Packs de style) : un look sur toute la comp, une transition à chaque coupe, un impact sur chaque beat, " +
    "et ses sons (variante `<type>_<style>.wav` si elle existe dans la bibliothèque).\n\n";
  sd += "| Style | Presets | Tempo | Courbe | Pack |\n|---|---|---|---|---|\n";
  for (const s of styles) {
    const k = packs.find((x) => x.style === s.id);
    sd += `| ${s.name} | ${cover[s.id]} | ${s.bpm[0]}–${s.bpm[1]} BPM | ${curveFr[s.curve] || s.curve} | ${k ? k.name : "–"} |\n`;
  }
  for (const s of styles) {
    const ps = real.filter((p) => p.styles.includes(s.id)).sort((a, b) => rk(b) - rk(a));
    const top = [], seen = new Set();
    for (const p of ps) { if (!seen.has(p.category)) { top.push(p); seen.add(p.category); } if (top.length >= 8) break; }
    for (const p of ps) { if (top.length >= 8) break; if (!top.includes(p)) top.push(p); }
    const perCat = CATS.map((c) => [c.label, ps.filter((p) => p.category === c.id).length]).filter((x) => x[1]).map((x) => `${x[0]} ${x[1]}`).join(", ");
    const k = packs.find((x) => x.style === s.id);
    sd += `\n## ${s.name}\n\n${s.desc}\n\n`;
    sd += `- Palette : ${s.palette.map((c) => "`" + c + "`").join(" ")}\n`;
    sd += `- Tempo conseillé ${s.bpm[0]}–${s.bpm[1]} BPM · courbe ${curveFr[s.curve] || s.curve} · intensité type ${Math.round(s.intensity * 100)} %\n`;
    sd += `- Sons : ${(s.sfx || []).join(", ")}\n`;
    sd += `- ${ps.length} presets : ${perCat}\n`;
    if (k) sd += `- Pack « ${k.name} » : look ${byId.get(k.look).name}, coupe ${byId.get(k.cut).name}, beat ${byId.get(k.beat).name} (sons : ${k.sfx ? k.sfx.cut + " / " + k.sfx.beat : "aucun"})\n`;
    sd += `- Presets phares : ${top.map((p) => `${p.name} (${catFr[p.category].toLowerCase()})`).join(", ")}\n`;
  }
  writeFileSync(join(ROOT, "docs", "STYLES.md"), sd);
  console.log(`OK  catalogue : ${real.length} presets -> cep/js/catalog.data.js (${Math.round(js.length / 1024)} Ko), docs/CATALOGUE.md, docs/STYLES.md`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
