// =====================================================================
// KIT : briques communes aux presets
//   Y.fxe  : ajout d'effets natifs (matchName, sinon recherche par nom) et accès à leurs paramètres
//   Y.kit  : contrôles, enveloppes d'expression (markers / fenêtre de transition), cibles
//   Y.rgb  : écart RGB natif (2 calques d'ajustement rouge / bleu en mode Éclaircir)
// =====================================================================

Y.fxe = {};

// Ajoute le premier effet disponible parmi mns (sinon recherche par nom affiché). Renvoie son nom réel.
Y.fxe.add = function (L, mns, re, name) {
    var i, mn = null, found;
    for (i = 0; i < mns.length; i++) {
        if (Y.fx.has(mns[i])) { mn = mns[i]; break; }
    }
    if (!mn && re) {
        found = Y.fx.search(re);
        if (found.length) { mn = found[0].match; }
    }
    if (!mn) { Y.fail("Effet natif introuvable dans ton AE : " + mns[0] + ". Lance Réglages > Liste des effets et envoie-la moi."); }
    return Y.p.addEffect(L, mn, name).name;
};
Y.fxe.p = function (L, fxName, keys) {
    return Y.p.prop(Y.p.findEffect(L, fxName), keys, fxName);
};
Y.fxe.set = function (L, fxName, keys, v) {
    Y.fxe.p(L, fxName, keys).setValue(v);
};
Y.fxe.expr = function (L, fxName, keys, code) {
    Y.x.set(Y.fxe.p(L, fxName, keys), code);
};

// Paramètres d'effets natifs : matchName, puis nom anglais.
Y.FX = {
    expo: ["ADBE Exposure2"], expoV: ["Exposure"],
    boxBlur: ["ADBE Box Blur2"], boxR: ["ADBE Box Blur2-0001", "Blur Radius"],
    dirBlur: ["ADBE Motion Blur"], dirAngle: ["ADBE Motion Blur-0001", "Direction"], dirLen: ["ADBE Motion Blur-0002", "Blur Length"],
    radial: ["CC Radial Fast Blur", "ADBE Radial Blur"], radAmt: ["Amount"],
    spin: ["ADBE Radial Blur"], spinAmt: ["ADBE Radial Blur-0001", "Amount"], spinType: ["ADBE Radial Blur-0003", "Type"],
    wave: ["ADBE Wave Warp"], waveType: ["ADBE Wave Warp-0001", "Wave Type"], waveH: ["ADBE Wave Warp-0002", "Wave Height"],
    waveW: ["ADBE Wave Warp-0003", "Wave Width"], waveDir: ["ADBE Wave Warp-0004", "Direction"], waveSpeed: ["ADBE Wave Warp-0005", "Wave Speed"],
    wavePhase: ["ADBE Wave Warp-0007", "Phase"],
    optics: ["ADBE Optics Compensation"], fov: ["ADBE Optics Compensation-0001", "Field Of View (FOV)"],
    fovRev: ["ADBE Optics Compensation-0002", "Reverse Lens Distortion"],
    post: ["ADBE Posterize Time"], postRate: ["ADBE Posterize Time-0001", "Frame Rate"],
    glow: ["ADBE Glo2"], glowThr: ["ADBE Glo2-0002", "Glow Threshold"], glowRad: ["ADBE Glo2-0003", "Glow Radius"], glowInt: ["ADBE Glo2-0004", "Glow Intensity"],
    shadow: ["ADBE Drop Shadow"], shColor: ["ADBE Drop Shadow-0001", "Shadow Color"], shOpacity: ["ADBE Drop Shadow-0002", "Opacity"],
    shDir: ["ADBE Drop Shadow-0003", "Direction"], shDist: ["ADBE Drop Shadow-0004", "Distance"], shSoft: ["ADBE Drop Shadow-0005", "Softness"],
    tint: ["ADBE Tint"], tintAmt: ["ADBE Tint-0003", "Amount to Tint"]
};


Y.kit = {};

// Référence à la valeur d'un contrôle : sur ce calque (src = "") ou sur un autre (src = 'thisComp.layer("X").').
Y.kit.C = function (src, name) {
    return (src || "") + "effect(\"" + Y.x.esc(name) + "\")(1)";
};
Y.kit.layerRef = function (name) {
    return "thisComp.layer(\"" + Y.x.esc(name) + "\").";
};

// Contrôles d'un preset. defs : [type, clé, libellé, valeur, items] ; ["curve", clé] = Courbe P1/P2.
Y.kit.controls = function (L, base, c, defs) {
    var n = {}, i, d;
    for (i = 0; i < defs.length; i++) {
        d = defs[i];
        if (d[0] === "curve") { n[d[1]] = Y.ctl.addCurve(L, base, c.curve); }
        else { n[d[1]] = Y.ctl.add(L, d[0], base + "_" + d[2], d[3], d[4]).name; }
    }
    return n;
};

// Dernier marker du calque L avant t dont le commentaire vaut tag (calques non YFX : on ne suit
// que les markers posés par YexoFX pour ce preset).
Y.x.LIB_TAG = [
    "function yfxPrevTag(L, t, tag) {",
    "  var m = L.marker, r = null, i = 1;",
    "  for (i = 1; i <= m.numKeys; i++) {",
    "    if (m.key(i).time > t) { break; }",
    "    if (m.key(i).comment == tag) { r = m.key(i); }",
    "  }",
    "  return r;",
    "}"
].join("\n");

// Code d'expression : enveloppe après le dernier marker du calque source (src) ;
// tag = ne suivre que les markers de ce commentaire (calque qui n'est pas un calque YFX).
// Définit mk (marker ou null), d (durée en s), tt (s depuis le marker), e (1 -> 0 selon la courbe),
// ep (e borné à 0..1), fr (n° d'image depuis le marker).
Y.kit.envCode = function (n, src, tag) {
    var lay = src ? src.substr(0, src.length - 1) : "thisLayer";
    return Y.x.LIB_CURVE + "\n" + Y.x.LIB_MARKER + "\n" + Y.x.LIB_TAG + "\n" +
        "var mk = " + (tag ? "yfxPrevTag(" + lay + ", time, \"" + Y.x.esc(tag) + "\")" : "yfxPrevMarker(" + lay + ", time)") + ";\n" +
        "var d = Math.max(1, " + Y.kit.C(src, n.dur) + ") * thisComp.frameDuration;\n" +
        "var tt = mk ? time - mk.time : 1e6;\n" +
        "var e = (tt < d) ? 1 - yfxCurve(tt / d, " + Y.kit.C(src, n.curve.p1) + ", " + Y.kit.C(src, n.curve.p2) + ") : 0;\n" +
        "var ep = Math.max(0, Math.min(1, e));\n" +
        "var fr = Math.floor(tt / thisComp.frameDuration + 0.001);\n";
};

// Code d'expression : fenêtre de transition (le calque dure exactement la transition).
// Définit p (0..1), half (0 avant la coupe, 1 après), q (progression dans la moitié),
// outE (accélère vers la coupe), inE (freine après la coupe), bell (0 -> 1 à la coupe -> 0).
Y.kit.bellCode = function (n) {
    var C = Y.kit.C;
    return Y.x.LIB_CURVE + "\n" +
        "var span = Math.max(thisComp.frameDuration, thisLayer.outPoint - thisLayer.inPoint);\n" +
        "var p = Math.max(0, Math.min(1, (time - thisLayer.inPoint) / span));\n" +
        "var half = (p < 0.5) ? 0 : 1;\n" +
        "var q = half ? (p - 0.5) * 2 : p * 2;\n" +
        "var c1 = " + C("", n.curve.p1) + ", c2 = " + C("", n.curve.p2) + ";\n" +
        "var outE = 1 - yfxCurve(1 - q, c1, c2);\n" +
        "var inE = yfxCurve(q, c1, c2);\n" +
        "var bell = yfxCurve(1 - Math.abs(2 * p - 1), c1, c2);\n";
};

// Sépare la sélection : calques audio seuls (leurs markers = déclencheurs, ex. beats) et calques visuels (cibles).
Y.kit.split = function (layers) {
    var r = { targets: [], triggers: [], audioNames: [] }, i, L;
    for (i = 0; i < layers.length; i++) {
        L = layers[i];
        if (L.hasAudio && !L.hasVideo) {
            r.triggers = r.triggers.concat(Y.m.times(L));
            r.audioNames.push(L.name);
        } else {
            r.targets.push(L);
        }
    }
    return r;
};

// Pose un preset "any" :
//  - calques visuels sélectionnés : effets posés dessus (ou marker ajouté s'ils sont déjà équipés) ;
//  - sinon : calque d'ajustement YFX_<Nom> créé (ou réutilisé : marker ajouté).
// Impacts (markerDriven) : un marker au CTI, ou un marker par marker des calques audio sélectionnés (beats).
// install(L) pose effets + contrôles sur un calque neuf.
Y.kit.apply = function (c, layerName, markerDriven, install) {
    var s = Y.kit.split(c.layers), times, i, j, L, done = 0, reused = 0, existing, what;
    times = (markerDriven && s.triggers.length) ? s.triggers : [c.time];
    what = times.length > 1 ? times.length + " impacts (markers de " + s.audioNames.join(", ") + ")"
                            : "impact à " + Y.u.tc(times[0], c.comp);
    if (s.targets.length) {
        for (i = 0; i < s.targets.length; i++) {
            L = s.targets[i];
            if (markerDriven && Y.p.findEffect(L, layerName + "_Duree")) {
                reused++;
            } else {
                install(L);
                done++;
            }
            if (markerDriven) {
                for (j = 0; j < times.length; j++) { Y.m.add(L, times[j], layerName); }
            }
        }
        return (done ? done + " calque(s) équipé(s)" : "") + (done && reused ? ", " : "") +
               (reused ? "déjà équipé(s) : marker ajouté" : "") + (markerDriven ? " · " + what : "");
    }
    existing = Y.l.findByName(c.comp, layerName);
    if (existing && markerDriven) {
        if (existing.locked) { Y.fail(Y.MSG.locked(existing)); }
        for (j = 0; j < times.length; j++) { Y.m.add(existing, times[j], layerName); }
        return what + " ajouté(s) sur " + layerName + " (" + Y.m.prop(existing).numKeys + " au total)";
    }
    if (existing && !markerDriven) {
        existing.selected = true;
        return layerName + " existe déjà dans la comp : il est sélectionné, règle-le dans Effect Controls.";
    }
    L = Y.l.addSolid(c.comp, layerName, [1, 1, 1], "adj", { adjustment: true });
    install(L);
    if (markerDriven) {
        for (j = 0; j < times.length; j++) { Y.m.add(L, times[j], layerName); }
        return "Calque " + layerName + " créé · " + what + " · recliquer ajoute un impact au CTI";
    }
    return "Calque " + layerName + " créé sur toute la comp";
};

// Fenêtre de transition : durée c.frames centrée sur la coupe (2 calques sélectionnés : début du plan
// entrant ; sinon : CTI). Renvoie { t, inT, outT }.
Y.kit.transWindow = function (c) {
    var t = c.time, half = c.frames * c.fd / 2, s = Y.kit.split(c.layers).targets;
    if (s.length >= 2) { t = Math.max(s[0].inPoint, s[1].inPoint); }
    return { t: t, inT: Math.max(0, t - half), outT: Math.min(c.comp.duration, t + half) };
};

// Nom de calque libre : "YFX_Zoom", sinon "YFX_Zoom 2"...
Y.kit.freeName = function (comp, base) {
    if (!Y.l.findByName(comp, base)) { return base; }
    var n = 2;
    while (Y.l.findByName(comp, base + " " + n)) { n++; }
    return base + " " + n;
};


// =====================================================================
// RGB NATIF : deux calques d'ajustement (rouge seul / bleu seul via Channel Mixer), décalés
// horizontalement et fusionnés en mode Éclaircir. offCode doit définir la variable "off" (pixels).
// place : { after: calque } (sous le maître) ou { before: calque } (au-dessus d'un clip).
// =====================================================================
Y.rgb = {};
Y.rgb.ghosts = function (comp, base, inT, outT, place, offCode) {
    var defs = [["R", 1, ["Green-Green", "Blue-Blue"]], ["B", -1, ["Red-Red", "Green-Green"]]];
    var i, j, L, cm, tn, made = [];
    for (i = 0; i < defs.length; i++) {
        L = Y.l.addSolid(comp, base + "_RGB_" + defs[i][0], [1, 1, 1], "adj", { adjustment: true, inPoint: inT, outPoint: outT });
        if (place && place.after) { L.moveAfter(place.after); }
        if (place && place.before) { L.moveBefore(place.before); }
        L.blendingMode = BlendingMode.LIGHTEN;
        cm = Y.fxe.add(L, ["ADBE CHANNEL MIXER", "ADBE Channel Mixer"], /channel mixer/i, base + "_Canaux");
        for (j = 0; j < defs[i][2].length; j++) { Y.fxe.set(L, cm, [defs[i][2][j]], 0); }
        tn = Y.p.addEffect(L, "ADBE Geometry2", base + "_Decalage").name;
        Y.fxe.expr(L, tn, Y.shake.TR.pos, offCode + "\n[value[0] + " + defs[i][1] + " * off, value[1]];");
        made.push(L);
    }
    return made;
};
