// =====================================================================
// RECETTES (v1.0) : registre des primitives, enveloppes, hôtes, interpréteur.
// Une recette vient du catalogue JSON du panel : { id, name, nameEn, host, drive, recipe: [étapes], needs, defaults }.
// Étape = { p: primitive, ...paramètres, env }. Tout passe par Y.exec (1 clic = 1 undo group).
// Les « keyframes relatives au CTI ou au beat » sont des enveloppes d'expression calées sur les markers :
// déplacer un marker déplace l'effet, un seul calque gère tous les beats.
// =====================================================================
Y.prim = { byId: {}, list: [] };

// def = { label, fx: [matchNames], cost, hosts, main, creates, params: { nom: [type, défaut, a, b, "k"] }, install(I, s) }
// types : "n" nombre (a = min, b = max), "e" choix (a = liste), "b" booléen, "c" couleur #rrggbb, "l" liste de choix (a),
//         "a" tableau de nombres, "t" texte. Drapeau "k" : multiplié par l'Intensité (réglable après coup).
Y.prim.def = function (id, def) {
    if (Y.prim.byId[id]) { throw new Error("Primitive en double : " + id); }
    def.id = id;
    def.params = def.params || {};
    Y.prim.byId[id] = def;
    Y.prim.list.push(def);
    return def;
};

Y.prim.ids = function () {
    var r = [], i;
    for (i = 0; i < Y.prim.list.length; i++) { r.push(Y.prim.list[i].id); }
    return r;
};

// Schéma lisible par le build (catalog/prims.json) et le lint.
Y.prim.schema = function () {
    var out = {}, i, d;
    for (i = 0; i < Y.prim.list.length; i++) {
        d = Y.prim.list[i];
        out[d.id] = { label: d.label, fx: d.fx || [], cost: d.cost || 1, hosts: d.hosts || "", main: d.main || null,
                      creates: !!d.creates, params: d.params };
    }
    return out;
};

Y.rx = {};

// Courbes nommées (mêmes valeurs que le panel). Elastic = [-1, -1] (courbe spéciale).
Y.rx.CURVES = {
    linear: [0, 0, 1, 1], expo: [0.16, 1, 0.3, 1], back: [0.34, 1.56, 0.64, 1], quint: [0.22, 1, 0.36, 1],
    smooth: [0.65, 0, 0.35, 1], snap: [0.05, 0.9, 0.1, 1], antic: [0.68, -0.55, 0.27, 1.55], aggro: [0.9, 0, 0.1, 1],
    elastic: [-1, -1, -1, -1]
};
Y.rx.SHAPES = { decay: 1, attack: 2, bell: 3, hold: 4, ramp: 5, pulse: 6, strobe: 7, steps: 8 };

// Nombre -> littéral court (pas d'exposant).
Y.rx.f = function (v) {
    var r = Math.round(Number(v) * 10000) / 10000;
    if (isNaN(r)) { r = 0; }
    return String(r);
};

// "#ff4655" -> [1, 0.2745, 0.3333]
Y.rx.rgb = function (hex) {
    var h = String(hex || "#ffffff").replace("#", "");
    if (h.length !== 6) { h = "ffffff"; }
    return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255];
};
Y.rx.rgba = function (hex) {
    var c = Y.rx.rgb(hex);
    return [c[0], c[1], c[2], 1];
};

// Bibliothèque d'expressions des recettes : enveloppes, clés relatives, marker suivant.
Y.x.LIB_ENV = [
    "function yfxEnv(s, x, c1, c2, n, w, f, ev) {",
    "  if (s == 5) { return (x <= 0) ? 0 : ((x >= 1) ? 1 : yfxCurve(x, c1, c2)); }",
    "  if (x < 0 || x >= 1) { return 0; }",
    "  if (s == 1) { return 1 - yfxCurve(x, c1, c2); }",
    "  if (s == 2) { return yfxCurve(x, c1, c2); }",
    "  if (s == 3) { return yfxCurve(1 - Math.abs(2 * x - 1), c1, c2); }",
    "  if (s == 4) { return 1; }",
    "  if (s == 6) { return ((x * n) % 1 < w) ? 1 - x : 0; }",
    "  if (s == 7) { return (Math.round(f) % Math.max(1, ev) == 0) ? 1 : 0; }",
    "  if (s == 8) { return 1 - Math.floor(yfxCurve(x, c1, c2) * n + 0.0001) / n; }",
    "  return 0;",
    "}",
    "function yfxKeys(k, u, c1, c2) {",
    "  if (u <= k[0][0]) { return k[0][1]; }",
    "  for (var i = 1; i < k.length; i++) {",
    "    if (u < k[i][0]) { return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * yfxCurve((u - k[i - 1][0]) / (k[i][0] - k[i - 1][0]), c1, c2); }",
    "  }",
    "  return k[k.length - 1][1];",
    "}",
    "function yfxNextTag(L, t, tag) {",
    "  var m = L.marker, i = 1;",
    "  for (i = 1; i <= m.numKeys; i++) {",
    "    if (m.key(i).time > t && (tag == \"\" || m.key(i).comment == tag)) { return m.key(i); }",
    "  }",
    "  return null;",
    "}"
].join("\n");


// ---------------------------------------------------------------- validation
Y.rx.isHex = function (v) {
    return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
};

// Vérifie une recette reçue du panel. Lève Y.fail (message clair) si elle est incohérente.
Y.rx.check = function (def) {
    var i, s, P, k, spec, v, j;
    if (!def || typeof def !== "object") { Y.fail("Recette absente."); }
    if (!def.id || !def.nameEn) { Y.fail("Recette incomplète (id ou nameEn manquant)."); }
    if (!Y.u.isArray(def.recipe) || !def.recipe.length) { Y.fail(def.name + " : recette vide."); }
    for (i = 0; i < def.recipe.length; i++) {
        s = def.recipe[i];
        P = Y.prim.byId[s.p];
        if (!P) { Y.fail(def.name + " · étape " + (i + 1) + " : primitive « " + s.p + " » absente de ce moteur. Recharge le moteur après une mise à jour."); }
        for (k in s) {
            if (!s.hasOwnProperty(k) || k === "p" || k === "env" || k === "label") { continue; }
            spec = P.params[k];
            if (!spec) { Y.fail(def.name + " · étape " + (i + 1) + " (" + s.p + ") : paramètre inconnu « " + k + " »."); }
            v = s[k];
            if (spec[0] === "e" && !Y.u.has(spec[2], v)) {
                Y.fail(def.name + " · étape " + (i + 1) + " (" + s.p + ") : « " + k + " » = " + v + " (attendu : " + spec[2].join(", ") + ").");
            }
            if (spec[0] === "c" && !Y.rx.isHex(v)) { Y.fail(def.name + " · étape " + (i + 1) + " : couleur « " + k + " » invalide (" + v + ")."); }
            if (spec[0] === "l") {
                if (!Y.u.isArray(v)) { Y.fail(def.name + " · étape " + (i + 1) + " : « " + k + " » doit être une liste."); }
                for (j = 0; j < v.length; j++) {
                    if (!Y.u.has(spec[2], v[j])) { Y.fail(def.name + " · étape " + (i + 1) + " : « " + v[j] + " » inconnu dans " + k + "."); }
                }
            }
        }
    }
};

// Valeur brute d'un paramètre (défaut du schéma si absent).
Y.rx.val = function (I, s, name) {
    var spec = I.P.params[name];
    if (s[name] !== undefined) { return s[name]; }
    return spec ? spec[1] : undefined;
};
Y.rx.isK = function (I, name) {
    var spec = I.P.params[name];
    return !!(spec && spec[4] && Y.u.strPos(spec[4], "k") !== -1);
};


// ---------------------------------------------------------------- instance (une application sur un calque)
// I = { c, def, comp, L (calque qui porte les réglages), base, tag, drive, src ("" ou réf. au calque maître),
//       n: noms des réglages communs, P: primitive en cours, s: étape en cours, k: index d'étape, lastFx }
Y.rx.inst = function (c, def, L, base, tag) {
    return { c: c, def: def, comp: c.comp, L: L, M: L, base: base, tag: tag || null, drive: def.drive, src: "", n: {},
             P: null, s: null, k: 0, lastFx: null, lastParam: null, made: [], main: {}, tc: null };
};

// Réglages communs : Durée, Intensité, Courbe (sur le calque maître).
Y.rx.init = function (I) {
    var c = I.c, L = I.M;
    if (I.n.int) { return I.n; }
    I.n.int = Y.ctl.add(L, "slider", I.base + "_Intensite", Math.round(c.intensity * 100)).name;
    if (I.drive !== "static" && I.drive !== "loop") {
        I.n.dur = Y.ctl.add(L, "slider", I.base + "_Duree", c.frames).name;
        I.n.curve = Y.ctl.addCurve(L, I.base, c.curve);
    }
    return I.n;
};

// Copie de l'instance pour un calque frère (solide, ajustement) qui lit les réglages et markers du maître.
Y.rx.child = function (I, L) {
    var J = {}, k;
    for (k in I) { if (I.hasOwnProperty(k)) { J[k] = I[k]; } }
    J.L = L;
    J.src = Y.kit.layerRef(I.M.name);
    return J;
};

// Calque frère placé au-dessus du maître, même durée. kind : "adj" | "solid". Renvoie l'instance enfant.
Y.rx.sibling = function (I, suffix, kind, color, blend) {
    var M = I.M, name = Y.kit.freeName(I.comp, I.base + "_" + suffix), L, tag = kind === "adj" ? "adj" : "sib_" + String(color || "#000000").replace("#", "");
    L = Y.l.addSolid(I.comp, name, kind === "adj" ? [1, 1, 1] : Y.rx.rgb(color), tag, { adjustment: kind === "adj", inPoint: M.inPoint, outPoint: M.outPoint });
    L.moveBefore(M);
    if (blend && BlendingMode[blend]) { L.blendingMode = BlendingMode[blend]; }
    I.made.push(L.name);
    return Y.rx.child(I, L);
};

// Calque d'ajustement « porte » : les effets qui ne s'animent pas (seuil, inversion, miroir…) sont posés dessus et son
// opacité suit l'enveloppe. En continu (loop / static), ils vont directement sur l'hôte.
Y.rx.gate = function (I, s, suffix, blend) {
    var J;
    if (I.drive === "loop" || I.drive === "static") { return I; }
    J = Y.rx.sibling(I, suffix, "adj", null, blend);
    Y.x.set(J.L.property("ADBE Transform Group").property("ADBE Opacity"), Y.rx.expr(J, s, "100 * EP;"));
    return J;
};


// ---------------------------------------------------------------- code d'expression
Y.rx.C = function (I, name) {
    return Y.kit.C(I.src, name);
};
Y.rx.lay = function (I) {
    return I.src ? I.src.substr(0, I.src.length - 1) : "thisLayer";
};

// Préambule selon le pilotage. Définit fd, K, c1, c2, tt (s depuis le déclencheur), u (progression), D, fr, sd (graine).
Y.rx.pre = function (I) {
    var n = Y.rx.init(I), C = function (x) { return Y.rx.C(I, x); }, lay = Y.rx.lay(I), d = I.drive, s;
    s = Y.x.LIB_CURVE + "\n" + Y.x.LIB_ENV + "\n" +
        "var fd = thisComp.frameDuration, K = " + C(n.int) + " / 100;\n" +
        "var LAY = " + lay + ";\n";
    if (d === "marker") {
        s += Y.x.LIB_MARKER + "\n" + Y.x.LIB_TAG + "\n" +
            "var c1 = " + C(n.curve.p1) + ", c2 = " + C(n.curve.p2) + ";\n" +
            "var D = Math.max(1, " + C(n.dur) + ") * fd;\n" +
            "var mk = " + (I.tag ? "yfxPrevTag(LAY, time, \"" + Y.x.esc(I.tag) + "\")" : "yfxPrevMarker(LAY, time)") + ";\n" +
            "var nk = yfxNextTag(LAY, time, \"" + (I.tag ? Y.x.esc(I.tag) : "") + "\");\n" +
            "var tt = mk ? time - mk.time : 1e6, tn = nk ? time - nk.time : -1e6;\n" +
            "var sd = mk ? mk.index : 0;\n";
    } else if (d === "cut") {
        s += "var c1 = " + C(n.curve.p1) + ", c2 = " + C(n.curve.p2) + ";\n" +
            "var D = Math.max(fd, LAY.outPoint - LAY.inPoint);\n" +
            "var tt = time - LAY.inPoint, tn = -1e6, sd = 1;\n" +
            "var p = Math.max(0, Math.min(1, tt / D)), half = (p < 0.5) ? 0 : 1, q = half ? (p - 0.5) * 2 : p * 2;\n" +
            "var outE = 1 - yfxCurve(1 - q, c1, c2), inE = yfxCurve(q, c1, c2);\n";
    } else if (d === "inout") {
        s += "var c1 = " + C(n.curve.p1) + ", c2 = " + C(n.curve.p2) + ";\n" +
            "var D = Math.max(1, " + C(n.dur) + ") * fd;\n" +
            "var tt = time - LAY.inPoint, tn = -1e6, sd = 1;\n" +
            "var IO = Math.min(yfxCurve(Math.max(0, Math.min(1, tt / D)), c1, c2), yfxCurve(Math.max(0, Math.min(1, (LAY.outPoint - time) / D)), c1, c2));\n";
    } else {
        s += "var c1 = [0, 0], c2 = [1, 1];\n" +
            "var D = Math.max(fd, LAY.outPoint - LAY.inPoint);\n" +
            "var tt = time - LAY.inPoint, tn = -1e6, sd = 1;\n";
    }
    s += "var u = tt / D, fr = Math.floor(tt / fd + 0.001);\n";
    return s;
};

// Code de l'enveloppe d'une étape : définit E (peut dépasser 0..1 avec une courbe à rebond) et EP (borné 0..1).
Y.rx.envCode = function (I, s) {
    var e = s ? s.env : null, d = I.drive, shape, len, at, cv, cc, x, xn, args, out, b;
    if (e === "none") { return "var E = 1, EP = 1;\n"; }
    if (!e || e === "main") {
        if (d === "marker") { return "var E = (tt >= 0 && tt < D) ? 1 - yfxCurve(tt / D, c1, c2) : 0;\nvar EP = Math.max(0, Math.min(1, E));\n"; }
        if (d === "cut") { return "var E = yfxCurve(1 - Math.abs(2 * p - 1), c1, c2);\nvar EP = Math.max(0, Math.min(1, E));\n"; }
        if (d === "inout") { return "var E = IO, EP = Math.max(0, Math.min(1, IO));\n"; }
        return "var E = 1, EP = 1;\n";
    }
    if (e === "loop") { return "var E = 1, EP = 1;\n"; }
    shape = Y.rx.SHAPES[e.shape] || 1;
    at = Number(e.at || 0);
    cv = e.curve || "main";
    if (cv === "main") { cc = "c1, c2"; } else {
        b = Y.rx.CURVES[cv] || Y.rx.CURVES.linear;
        cc = "[" + Y.rx.f(b[0]) + ", " + Y.rx.f(b[1]) + "], [" + Y.rx.f(b[2]) + ", " + Y.rx.f(b[3]) + "]";
    }
    len = e.frames ? "(" + Y.rx.f(e.frames) + " * fd)" : "(" + Y.rx.f(e.len || 1) + " * D)";
    args = cc + ", " + Y.rx.f(e.n || 3) + ", " + Y.rx.f(e.duty || 0.5) + ", ";
    if (d === "loop" || d === "static") {
        // en continu : l'enveloppe se répète (respiration, pulsations).
        x = "((time % " + len + ") / " + len + ")";
        out = "var E = yfxEnv(" + shape + ", " + x + ", " + args + "Math.floor((time % " + len + ") / fd + 0.001), " + Y.rx.f(e["every"] || 2) + ");\n";
    } else {
        x = "((tt - " + Y.rx.f(at) + " * D) / " + len + ")";
        out = "var E = yfxEnv(" + shape + ", " + x + ", " + args + "Math.floor((tt - " + Y.rx.f(at) + " * D) / fd + 0.001), " + Y.rx.f(e["every"] || 2) + ");\n";
        if (at < 0 && d === "marker") {
            xn = "((tn - " + Y.rx.f(at) + " * D) / " + len + ")";
            out += "E = Math.max(E, yfxEnv(" + shape + ", " + xn + ", " + args + "Math.floor((tn - " + Y.rx.f(at) + " * D) / fd + 0.001), " + Y.rx.f(e["every"] || 2) + "));\n";
        }
        if (d === "inout") { out += "E = E * IO;\n"; }
    }
    return out + "var EP = Math.max(0, Math.min(1, E));\n";
};

// Expression complète : préambule + enveloppe de l'étape + corps.
Y.rx.expr = function (I, s, body) {
    return Y.rx.pre(I) + Y.rx.envCode(I, s) + body;
};

// Valeur numérique d'un paramètre, en code. Le paramètre principal de la primitive devient un réglage
// (slider) sur le calque maître. "k" : multiplié par K (Intensité).
Y.rx.num = function (I, s, name) {
    var v = Y.rx.val(I, s, name), code, k = Y.rx.isK(I, name), label;
    if (v && typeof v === "object" && !Y.u.isArray(v)) {
        if (v.keys) { code = "yfxKeys(" + Y.json.stringify(v.keys) + ", u, c1, c2)"; }
        else { code = "(" + Y.rx.f(v.from) + " + " + Y.rx.f(Number(v.to) - Number(v.from)) + " * E)"; }
    } else if (I.P.main === name && typeof v === "number") {
        if (!I.main[I.k]) {
            label = s.label || I.P.label;
            I.main[I.k] = Y.ctl.add(I.M, "slider", I.base + "_" + label, Y.u.round(v, 3)).name;
        }
        code = Y.rx.C(I, I.main[I.k]);
    } else {
        code = Y.rx.f(v);
    }
    return k ? "(" + code + " * K)" : code;
};

// Montant animé : un nombre suit l'enveloppe (x E) ; des clés ou from / to sont déjà animés.
Y.rx.amt = function (I, s, name, positive) {
    var v = Y.rx.val(I, s, name);
    if (v && typeof v === "object" && !Y.u.isArray(v)) { return Y.rx.num(I, s, name); }
    return "(" + Y.rx.num(I, s, name) + " * " + (positive ? "EP" : "E") + ")";
};


// ---------------------------------------------------------------- effets (avec trace pour les erreurs)
Y.rx.add = function (I, mns, re, suffix, L) {
    I.lastFx = mns[0];
    I.lastParam = null;
    return Y.fxe.add(L || I.L, mns, re, I.base + "_" + suffix);
};
Y.rx.p = function (I, fx, keys, L) {
    I.lastParam = keys.join(" / ");
    return Y.fxe.p(L || I.L, fx, keys);
};
Y.rx.set = function (I, fx, keys, v, L) {
    Y.rx.p(I, fx, keys, L).setValue(v);
};
Y.rx.setx = function (I, fx, keys, code, L) {
    Y.x.set(Y.rx.p(I, fx, keys, L), code);
};

// Motion Tile (bords en miroir) une seule fois par calque et par instance.
Y.rx.tile = function (I, pct) {
    var nm = I.base + "_Tile", t;
    if (!pct || Y.p.findEffect(I.L, nm)) { return; }
    I.lastFx = "ADBE Tile";
    t = Y.p.addEffect(I.L, "ADBE Tile", nm).name;
    Y.fxe.set(I.L, t, Y.shake.TILE.outW, pct);
    Y.fxe.set(I.L, t, Y.shake.TILE.outH, pct);
    Y.fxe.set(I.L, t, Y.shake.TILE.mirror, 1);
};

// Effet Transform (le calque garde sa propre transform). shutter = angle d'obturation (motion blur).
Y.rx.transform = function (I, suffix, shutter) {
    I.lastFx = "ADBE Geometry2";
    var tr = Y.p.addEffect(I.L, "ADBE Geometry2", Y.p.uniqueName(I.L, I.base + "_" + suffix)).name;
    Y.fxe.set(I.L, tr, Y.shake.TR.compShutter, 0);
    Y.fxe.set(I.L, tr, Y.shake.TR.shutter, shutter === undefined ? 180 : shutter);
    return tr;
};


// ---------------------------------------------------------------- exécution des étapes
Y.rx.steps = function (I) {
    var i, s, P, r = I.def.recipe;
    for (i = 0; i < r.length; i++) {
        s = r[i];
        P = Y.prim.byId[s.p];
        I.P = P;
        I.s = s;
        I.k = i;
        if (!I.L && !P.creates) { Y.fail(I.def.name + " : hôte « new » sans primitive qui crée le calque."); }
        try {
            P.install(I, s);
        } catch (e) {
            Y.rx.rethrow(I, i, s, e);
        }
    }
};

// Erreur d'une étape : on ajoute le preset, l'étape, l'effet AE en cause et quoi faire.
Y.rx.rethrow = function (I, i, s, e) {
    var where = I.def.name + " · étape " + (i + 1) + " (" + I.P.label + ")";
    var fx = I.lastFx ? " · effet " + Y.fx.label(I.lastFx) + " (" + I.lastFx + ")" + (I.lastParam ? ", paramètre " + I.lastParam : "") : "";
    if (e && e.yfx) { Y.fail(where + " : " + e.message); }
    throw new Error(where + fx + " : " + Y.errText(e) + ". À faire : Réglages > Diagnostic > Sonde des effets, puis envoie-moi le rapport.");
};

// Pose la recette sur un calque (réglages + étapes). Renvoie l'instance.
Y.rx.install = function (def, c, L, base, tag) {
    var I = Y.rx.inst(c, def, L, base, tag);
    if (I.drive !== "static" && def.host !== "text") { Y.rx.init(I); }
    Y.rx.steps(I);
    return I;
};


// ---------------------------------------------------------------- hôtes
Y.rx.addMarkers = function (L, times, tag) {
    for (var j = 0; j < times.length; j++) { Y.m.add(L, times[j], tag); }
};

// any / adj : calques visuels sélectionnés (sauf adj), sinon calque d'ajustement YFX_<Nom>.
Y.rx.hostAny = function (def, c, base, forceAdj) {
    var s = Y.kit.split(c.layers), md = def.drive === "marker", times, i, L, done = 0, reused = 0, existing, what, tg;
    times = (md && s.triggers.length) ? s.triggers : [c.time];
    what = times.length > 1 ? times.length + " impacts (markers de " + s.audioNames.join(", ") + ")" : "au CTI " + Y.u.tc(times[0], c.comp);
    if (s.targets.length && !forceAdj) {
        for (i = 0; i < s.targets.length; i++) {
            L = s.targets[i];
            tg = Y.u.begins(L.name, Y.PREFIX) ? null : base;
            if (md && Y.p.findEffect(L, base + "_Intensite")) { reused++; } else { Y.rx.install(def, c, L, base, tg); done++; }
            if (md) { Y.rx.addMarkers(L, times, base); }
        }
        return (done ? done + " calque(s) équipé(s)" : "") + (done && reused ? ", " : "") + (reused ? "marker ajouté" : "") + (md ? " · " + what : "");
    }
    existing = Y.l.findByName(c.comp, base);
    if (existing && md) {
        if (existing.locked) { Y.fail(Y.MSG.locked(existing)); }
        Y.rx.addMarkers(existing, times, base);
        return what + " ajouté sur " + base + " (" + Y.m.prop(existing).numKeys + " au total)";
    }
    if (existing && def.drive !== "inout") {
        existing.selected = true;
        return base + " existe déjà dans la comp : il est sélectionné, règle-le dans Effect Controls.";
    }
    if (def.drive === "inout") {
        L = Y.l.addSolid(c.comp, Y.kit.freeName(c.comp, base), [1, 1, 1], "adj", { adjustment: true, inPoint: c.time, outPoint: Math.min(c.comp.duration, c.time + 3) });
        Y.rx.install(def, c, L, base, null);
        return "calque " + L.name + " posé à " + Y.u.tc(c.time, c.comp) + " pour 3 s";
    }
    L = Y.l.addSolid(c.comp, base, [1, 1, 1], "adj", { adjustment: true });
    Y.rx.install(def, c, L, base, null);
    if (md) {
        Y.rx.addMarkers(L, times, base);
        return "calque " + base + " créé · " + what + " · recliquer ajoute un impact au CTI";
    }
    return "calque " + base + " créé sur toute la comp";
};

// layer / text / clip : uniquement les calques sélectionnés.
Y.rx.hostSel = function (def, c, base) {
    var i, L, n = 0, md = def.drive === "marker";
    for (i = 0; i < c.layers.length; i++) {
        L = c.layers[i];
        if (def.host === "text" && !(L instanceof TextLayer)) { continue; }
        if (def.host === "clip" && !L.canSetTimeRemapEnabled) { continue; }
        Y.rx.install(def, c, L, base, base);
        if (md) { Y.m.add(L, c.time, base); }
        n++;
    }
    if (!n) { Y.fail(def.host === "clip" ? "Sélectionne le clip (footage ou précomp) : ce preset utilise le Time Remapping." : Y.MSG.layer); }
    return n + " calque(s)" + (md ? " · au CTI " + Y.u.tc(c.time, c.comp) : "");
};

// cut : calque d'ajustement centré sur la coupe.
Y.rx.hostCut = function (def, c, base) {
    var w = Y.kit.transWindow(c), name = Y.kit.freeName(c.comp, base), L;
    L = Y.l.addSolid(c.comp, name, [1, 1, 1], "adj", { adjustment: true, inPoint: w.inT, outPoint: w.outT });
    Y.rx.install(def, c, L, name, null);
    return "posée sur la coupe (" + Y.u.tc(w.t, c.comp) + ") · " + c.frames + " f · calque " + name;
};

// two : plan sortant A + plan entrant B. Les réglages vont sur B, un marker (commentaire = nom) marque la coupe.
Y.rx.hostTwo = function (def, c, base) {
    var a = c.layers[0], b = c.layers[1], A = (b.inPoint >= a.inPoint) ? a : b, B = (A === a) ? b : a, I;
    I = Y.rx.inst(c, def, B, base, base);
    I.drive = "marker";
    I.A = A;
    I.B = B;
    I.cut = B.inPoint;
    Y.rx.init(I);
    Y.m.add(B, I.cut, base);
    Y.rx.steps(I);
    return A.name + " → " + B.name + " · coupe à " + Y.u.tc(I.cut, c.comp) + " · " + c.frames + " f";
};

// new : la première étape crée le calque (I.L) ; les suivantes s'y posent.
Y.rx.hostNew = function (def, c, base) {
    var md = def.drive === "marker", existing = md ? Y.l.findByName(c.comp, base) : null, I, times, s;
    s = Y.kit.split(c.layers);
    times = (md && s.triggers.length) ? s.triggers : [c.time];
    if (existing) {
        if (existing.locked) { Y.fail(Y.MSG.locked(existing)); }
        Y.rx.addMarkers(existing, times, base);
        return (times.length > 1 ? times.length + " déclenchements" : "déclenchement au CTI") + " ajouté(s) sur " + base;
    }
    I = Y.rx.inst(c, def, null, md ? base : Y.kit.freeName(c.comp, base), null);
    I.L = null;
    I.M = null;
    Y.rx.steps(I);
    if (md && I.M) { Y.rx.addMarkers(I.M, times, I.base); }
    return "calque " + (I.M ? I.M.name : base) + " créé" + (md ? " · recliquer ajoute un déclenchement au CTI" : " à " + Y.u.tc(c.time, c.comp));
};

// Appelé par une primitive « creates » : le calque créé devient l'hôte et reçoit les réglages.
// span : "comp" (toute la comp) ou "cti" (CTI -> CTI + 3 s).
Y.rx.adopt = function (I, L, span) {
    var c = I.c;
    L.comment = "YexoFX";
    L.name = I.base;
    if (span === "cti") {
        L.inPoint = c.time;
        L.outPoint = Math.min(c.comp.duration, c.time + 3);
    } else {
        L.inPoint = 0;
        L.outPoint = c.comp.duration;
    }
    I.L = L;
    I.M = L;
    if (I.drive !== "static") { Y.rx.init(I); }
    return L;
};

// Calque créé par une primitive : hôte principal s'il n'y en a pas encore, sinon calque secondaire au-dessus du maître.
Y.rx.place = function (I, L, suffix, span) {
    if (!I.L) { return Y.rx.adopt(I, L, span); }
    L.comment = "YexoFX";
    L.name = Y.kit.freeName(I.comp, I.base + "_" + suffix);
    L.inPoint = I.M.inPoint;
    L.outPoint = I.M.outPoint;
    L.moveBefore(I.M);
    I.made.push(L.name);
    return L;
};

Y.rx.run = function (def, c) {
    var base = Y.PREFIX + String(def.nameEn).replace(/[^A-Za-z0-9]/g, ""), h = def.host, msg;
    if (h === "any" || h === "adj") { msg = Y.rx.hostAny(def, c, base, h === "adj"); }
    else if (h === "layer" || h === "text" || h === "clip") { msg = Y.rx.hostSel(def, c, base); }
    else if (h === "cut") { msg = Y.rx.hostCut(def, c, base); }
    else if (h === "two") { msg = Y.rx.hostTwo(def, c, base); }
    else if (h === "new") { msg = Y.rx.hostNew(def, c, base); }
    else { Y.fail(def.name + " : hôte « " + h + " » inconnu."); }
    return def.name + " : " + msg;
};

// Point d'entrée : recette du catalogue -> preset éphémère exécuté par Y.execP (validation, undo group).
Y.rx.preset = function (def) {
    var needs = (def.needs && def.needs.sel) ? def.needs.sel : "comp", f = 12;
    Y.rx.check(def);
    if (!Object.prototype.hasOwnProperty.call(Y.NEEDS, needs)) { Y.fail(def.name + " : besoin inconnu « " + needs + " »."); }
    if (def.defaults && typeof def.defaults.frames === "number") { f = def.defaults.frames; }
    if (def.host === "clip" && needs === "any") { needs = "av"; }
    return { id: def.id, name: def.name, needs: needs, f: f, run: function (c) { return Y.rx.run(def, c); } };
};

Y.rx.exec = function (def, raw, comp, sel) {
    return Y.execP(Y.rx.preset(def), raw, comp, sel);
};

// Pack de style : look sur toute la comp, une transition à chaque coupe entre les clips sélectionnés, un impact sur
// chaque beat (markers du calque audio sélectionné, sinon chaque coupe). Un seul undo group pour tout.
// a = { name, look: def, cut: def, beat: def, params, sfx: { cut: chemin, beat: chemin } } (sons facultatifs)
Y.rx.pack = function (a) {
    var comp, sel, i, L, clips = [], audio = null, cuts = [], beats = [], t0, msgs = [], P = a.params || {}, run, n = 0, cutT = [], nS = 0, sfx = a.sfx || {};
    if (!app.project) { Y.fail(Y.MSG.noProject); }
    comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { Y.fail(Y.MSG.noComp); }
    sel = comp.selectedLayers;
    for (i = 0; i < sel.length; i++) {
        L = sel[i];
        if (!(L instanceof AVLayer) || Y.u.begins(L.name, Y.PREFIX)) { continue; }
        if (L.hasAudio && !L.hasVideo) { if (!audio) { audio = L; } } else { clips.push(L); }
    }
    if (clips.length < 2) { Y.fail("Sélectionne au moins 2 clips qui se suivent (et ta musique avec ses markers de beat si tu en as)."); }
    clips.sort(function (x, y) { return x.inPoint - y.inPoint; });
    for (i = 1; i < clips.length; i++) { cuts.push([clips[i - 1], clips[i]]); cutT.push(clips[i].inPoint); }
    beats = audio ? Y.m.times(audio) : [];
    t0 = comp.time;
    run = function (def, s, time) {
        var p, c;
        if (!def) { return; }
        p = (def.impl === "native") ? Y.reg.byId[def.id] : Y.rx.preset(def);
        if (!p) { Y.fail("Preset absent du moteur : " + def.id); }
        comp.time = time;
        c = Y.ctx(p, { frames: def.defaults && typeof def.defaults.frames === "number" ? def.defaults.frames : 0, intensity: P.intensity, curve: P.curve }, comp, s);
        msgs.push(p.run(c));
        n++;
    };
    app.beginUndoGroup("YexoFX : pack " + (a.name || ""));
    try {
        run(a.look, [], t0);
        for (i = 0; i < cuts.length; i++) { run(a.cut, cuts[i], cuts[i][1].inPoint); }
        if (a.beat) {
            if (audio && beats.length) { run(a.beat, [audio], t0); }
            else { for (i = 0; i < cuts.length; i++) { run(a.beat, [], cuts[i][1].inPoint); } }
        }
        // sons du style : un à chaque coupe, un sur chaque beat (ou chaque coupe sans musique)
        if (sfx.cut) { nS += Y.audio.addAt(comp, String(sfx.cut), cutT); }
        if (sfx.beat) { nS += Y.audio.addAt(comp, String(sfx.beat), (audio && beats.length) ? beats : (sfx.cut ? [] : cutT)); }
    } catch (e) {
        Y.log(e && e.yfx ? "WARN" : "ERROR", "pack " + a.name + " : " + Y.errText(e));
        throw e;
    } finally {
        comp.time = t0;
        app.endUndoGroup();
    }
    return "Pack " + (a.name || "") + " : look + " + cuts.length + " transition(s) + " + (a.beat ? (audio && beats.length ? beats.length + " impact(s) sur les beats" : cuts.length + " impact(s) sur les coupes") : "aucun impact") + (nS ? " + " + nS + " son(s)" : "") + " · Ctrl+Z annule tout";
};

// Pile (preset perso) : items = [{ id, def?, params }]. Tout est validé avant de toucher au projet, puis appliqué
// dans un seul undo group.
Y.rx.stack = function (items, name) {
    var comp, sel, ps = [], i, it, p, msgs = [];
    if (!app.project) { Y.fail(Y.MSG.noProject); }
    comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { Y.fail(Y.MSG.noComp); }
    if (!items.length) { Y.fail("Pile vide : ajoute au moins un preset."); }
    sel = comp.selectedLayers;
    for (i = 0; i < items.length; i++) {
        it = items[i];
        p = (it.def && it.def.impl !== "native") ? Y.rx.preset(it.def) : Y.reg.byId[String(it.id)];
        if (!p) { Y.fail("Preset absent du moteur : " + it.id); }
        ps.push({ p: p, c: Y.ctx(p, it.params || {}, comp, sel) });
    }
    app.beginUndoGroup("YexoFX : " + name);
    try {
        for (i = 0; i < ps.length; i++) { msgs.push(ps[i].p.run(ps[i].c)); }
    } catch (e) {
        Y.log(e && e.yfx ? "WARN" : "ERROR", "pile " + name + " : " + Y.errText(e));
        throw e;
    } finally {
        app.endUndoGroup();
    }
    Y.log("INFO", "pile " + name + " : " + ps.length + " preset(s)");
    return name + " : " + ps.length + " preset(s) appliqué(s) · " + msgs.join(" · ");
};
