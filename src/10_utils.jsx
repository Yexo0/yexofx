// =====================================================================
// UTILS : fonctions ES3, erreurs, environnement, fichiers, log
// =====================================================================

Y.u = {};

Y.u.isArray = function (v) {
    return Object.prototype.toString.call(v) === "[object Array]";
};

// Remplace Array.indexOf (absent en ES3).
Y.u.idx = function (arr, v) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === v) { return i; }
    }
    return -1;
};

Y.u.has = function (arr, v) {
    return Y.u.idx(arr, v) !== -1;
};

// Position d'une sous-chaîne (String.indexOf, lui, existe bien en ES3).
Y.u.strPos = function (s, sub) {
    return String(s).indexOf(sub); // es3-ok
};

Y.u.begins = function (s, prefix) {
    s = String(s);
    return s.substr(0, prefix.length) === prefix;
};

Y.u.strip = function (s) {
    return String(s).replace(/^\s+|\s+$/g, "");
};

Y.u.clamp = function (v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
};

Y.u.round = function (v, decimals) {
    var p = Math.pow(10, decimals || 0);
    return Math.round(v * p) / p;
};

Y.u.near = function (a, b, tol) {
    return Math.abs(a - b) <= (tol === undefined ? 0.001 : tol);
};

Y.u.pad = function (n, len) {
    var s = String(n);
    while (s.length < len) { s = "0" + s; }
    return s;
};

Y.u.extend = function (dst, src) {
    for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) { dst[k] = src[k]; }
    }
    return dst;
};

Y.u.objKeys = function (o) {
    var r = [];
    for (var k in o) {
        if (Object.prototype.hasOwnProperty.call(o, k)) { r.push(k); }
    }
    return r;
};

Y.u.ms = function () {
    return new Date().getTime();
};

// "2026-11-15 14:22:33", ou "20261115_142233" pour un nom de fichier.
Y.u.stamp = function (forFile) {
    var d = new Date(), p = Y.u.pad;
    var sepD = forFile ? "" : "-", sepH = forFile ? "" : ":";
    var day = d.getFullYear() + sepD + p(d.getMonth() + 1, 2) + sepD + p(d.getDate(), 2);
    var hour = p(d.getHours(), 2) + sepH + p(d.getMinutes(), 2) + sepH + p(d.getSeconds(), 2);
    return day + (forFile ? "_" : " ") + hour;
};

// Minuscules sans accents (pour la recherche).
Y.u.FOLD = [
    [/[àâäáãå]/g, "a"], [/ç/g, "c"], [/[éèêë]/g, "e"], [/[íìîï]/g, "i"], [/ñ/g, "n"],
    [/[óòôöõ]/g, "o"], [/[úùûü]/g, "u"], [/[ýÿ]/g, "y"], [/œ/g, "oe"], [/æ/g, "ae"]
];
Y.u.fold = function (s) {
    s = String(s).toLowerCase();
    for (var i = 0; i < Y.u.FOLD.length; i++) {
        s = s.replace(Y.u.FOLD[i][0], Y.u.FOLD[i][1]);
    }
    return s;
};

// Temps -> format d'affichage de la comp (timecode ou frames, selon les réglages du projet).
Y.u.tc = function (t, comp) {
    try { return timeToCurrentFormat(t, comp.frameRate); } catch (e) { return Y.u.round(t, 2) + " s"; }
};

// Nombre "à la française" : 0.2 -> "0,2".
Y.u.fr = function (v, decimals) {
    return String(Y.u.round(v, decimals)).replace(".", ",");
};


// =====================================================================
// ERREURS
// Y.fail() = erreur "utilisateur" (mauvaise sélection...) : message clair, pas un bug.
// Tout le reste (Error) = bug : message + numéro de ligne + log.
// =====================================================================
Y.UserError = function (msg) {
    this.message = msg;
    this.yfx = true;
};
Y.UserError.prototype.toString = function () { return this.message; };

Y.fail = function (msg) {
    throw new Y.UserError(msg);
};

Y.errText = function (e) {
    if (e === undefined || e === null) { return "erreur inconnue"; }
    var s = (e.message !== undefined) ? String(e.message) : String(e);
    if (e.line) { s += " (ligne " + e.line + ")"; }
    return s;
};


// =====================================================================
// ENVIRONNEMENT
// =====================================================================
Y.env = {};

Y.env.ae = function () {
    return parseFloat(app.version);
};

Y.env.engine = function () {
    try { return app.project ? String(app.project.expressionEngine) : "?"; } catch (e) { return "?"; }
};

// Préférence "Allow Scripts to Write Files and Access Network".
// Si elle est introuvable, on suppose que c'est autorisé (l'écriture échouera proprement sinon).
Y.env.canWrite = function () {
    var secs = ["Main Pref Section v2", "Main Pref Section"];
    var key = "Pref_SCRIPTING_FILE_NETWORK_SECURITY", found = false, i;
    for (i = 0; i < secs.length; i++) {
        try {
            if (app.preferences.havePref(secs[i], key)) {
                found = true;
                if (app.preferences.getPrefAsLong(secs[i], key) === 1) { return true; }
            }
        } catch (e) {}
    }
    return !found;
};


// =====================================================================
// CHEMINS
// Program Files n'est pas inscriptible : config / favoris / log vont dans
// %APPDATA%\YexoFX, les assets dans un dossier YexoFX_assets trouvé ci-dessous.
// =====================================================================
Y.paths = {};

Y.paths.scriptFile = function () {
    return Y.bootPath ? new File(Y.bootPath) : null;
};

Y.paths.userDir = function () {
    return new Folder(Folder.userData.fsName + "/YexoFX");
};

Y.paths.configFile = function () {
    return new File(Y.paths.userDir().fsName + "/config.json");
};

Y.paths.logFile = function () {
    return new File(Y.paths.userDir().fsName + "/yexofx.log");
};

// Ordre de recherche : dossier choisi dans le panel, puis en remontant depuis le script
// (cep/host/ -> cep/ -> projet/), puis Documents.
Y.paths.assetCandidates = function () {
    var r = [], sf = Y.paths.scriptFile(), dir, i;
    if (Y.cfg && Y.cfg.data && Y.cfg.data.assetsPath) { r.push(Y.cfg.data.assetsPath); }
    dir = sf ? sf.parent : null;
    for (i = 0; i < 3 && dir; i++) {
        r.push(dir.fsName + "/YexoFX_assets");
        dir = dir.parent;
    }
    r.push(Folder.myDocuments.fsName + "/YexoFX_assets");
    return r;
};

Y.paths.assets = function () {
    var c = Y.paths.assetCandidates(), i, f;
    for (i = 0; i < c.length; i++) {
        f = new Folder(c[i]);
        if (f.exists) { return f; }
    }
    return null;
};


// =====================================================================
// FICHIERS (UTF-8)
// =====================================================================
Y.f = {};

Y.f.ensureFolder = function (folder) {
    if (!folder.exists) { folder.create(); }
    return folder.exists;
};

Y.f.read = function (file) {
    if (!file || !file.exists) { return null; }
    file.encoding = "UTF-8";
    if (!file.open("r")) { return null; }
    var s = file.read();
    file.close();
    return s;
};

Y.f.write = function (file, text, append) {
    if (!Y.env.canWrite()) { return false; }
    Y.f.ensureFolder(file.parent);
    file.encoding = "UTF-8";
    file.lineFeed = "Windows";
    if (!file.open(append ? "a" : "w")) { return false; }
    var ok = file.write(text);
    file.close();
    return ok !== false;
};


// =====================================================================
// LOG : %APPDATA%\YexoFX\yexofx.log (remis à zéro au-delà de 500 Ko)
// =====================================================================
Y.log = function (level, msg) {
    try {
        if (!Y.env.canWrite()) { return; }
        var f = Y.paths.logFile();
        if (f.exists && f.length > 512000) { f.remove(); }
        Y.f.write(f, "[" + Y.u.stamp() + "] " + level + "  " + msg + "\n", true);
    } catch (e) {}
};


// =====================================================================
// PROJET
// =====================================================================
Y.proj = {};

// Dossier de projet (créé s'il n'existe pas).
Y.proj.folder = function (name) {
    var i, it;
    for (i = 1; i <= app.project.numItems; i++) {
        it = app.project.item(i);
        if ((it instanceof FolderItem) && it.name === name) { return it; }
    }
    return app.project.items.addFolder(name);
};


// =====================================================================
// CATALOGUE D'EFFETS (app.effects) : vérifie les natifs, détecte les tiers
// =====================================================================
Y.fx = { _list: null, _byMatch: null };

Y.fx.scan = function () {
    var all = app.effects, i, e, rec;
    Y.fx._list = [];
    Y.fx._byMatch = {};
    for (i = 0; i < all.length; i++) {
        e = all[i];
        rec = { name: String(e.displayName), match: String(e.matchName), cat: String(e.category) };
        Y.fx._list.push(rec);
        Y.fx._byMatch[rec.match] = rec;
    }
};

Y.fx.all = function () {
    if (!Y.fx._list) { Y.fx.scan(); }
    return Y.fx._list;
};

Y.fx.has = function (matchName) {
    Y.fx.all();
    return Object.prototype.hasOwnProperty.call(Y.fx._byMatch, matchName);
};

Y.fx.label = function (matchName) {
    Y.fx.all();
    var r = Y.fx._byMatch[matchName];
    return r ? r.name : matchName;
};

Y.fx.search = function (re) {
    var l = Y.fx.all(), r = [], i;
    for (i = 0; i < l.length; i++) {
        if (re.test(l[i].name) || re.test(l[i].match)) { r.push(l[i]); }
    }
    return r;
};

// Effets tiers utilisables en option "si installé" (jamais requis).
Y.fx.THIRD = [
    { label: "Deep Glow", re: /deep\s*glow/i },
    { label: "Sapphire", re: /sapphire|^S_/i },
    { label: "Boris BCC", re: /^bcc|boris/i },
    { label: "Twixtor", re: /twixtor/i },
    { label: "RSMB", re: /reelsmart|rsmb/i }
];

Y.fx.thirdParty = function () {
    var l = Y.fx.all(), found = [], i, j, t;
    for (j = 0; j < Y.fx.THIRD.length; j++) {
        t = Y.fx.THIRD[j];
        for (i = 0; i < l.length; i++) {
            if (t.re.test(l[i].name) || t.re.test(l[i].match) || t.re.test(l[i].cat)) {
                found.push(t.label);
                break;
            }
        }
    }
    return found;
};


// =====================================================================
// PROPRIÉTÉS / EFFETS
// Les références AE deviennent invalides après un addProperty : on garde
// l'index et on reprend une référence fraîche à chaque étape.
// =====================================================================
Y.p = {};

Y.p.parade = function (layer) {
    return layer.property("ADBE Effect Parade");
};

Y.p.findEffect = function (layer, name) {
    var fx = Y.p.parade(layer), i;
    if (!fx) { return null; }
    for (i = 1; i <= fx.numProperties; i++) {
        if (fx.property(i).name === name) { return fx.property(i); }
    }
    return null;
};

// "YFX_Truc" si libre, sinon "YFX_Truc 2", "YFX_Truc 3"...
Y.p.uniqueName = function (layer, base) {
    if (!Y.p.findEffect(layer, base)) { return base; }
    var n = 2;
    while (Y.p.findEffect(layer, base + " " + n)) { n++; }
    return base + " " + n;
};

// Propriété d'un groupe (effet, animator...) trouvée par matchName, puis par nom affiché.
// keys = liste ["ADBE Geometry2-0002", "Position"]. Lève une erreur claire si rien ne correspond.
Y.p.prop = function (group, keys, label) {
    var i, j, k, sub;
    for (k = 0; k < keys.length; k++) {
        for (i = 1; i <= group.numProperties; i++) {
            sub = group.property(i);
            if (sub && (sub.matchName === keys[k] || sub.name === keys[k])) { return sub; }
        }
    }
    // dernier recours : recherche dans les sous-groupes (topics d'effets)
    for (i = 1; i <= group.numProperties; i++) {
        sub = group.property(i);
        if (sub && sub.propertyType !== PropertyType.PROPERTY && sub.numProperties) {
            for (j = 0; j < keys.length; j++) {
                try { return Y.p.prop(sub, [keys[j]], label); } catch (e) {}
            }
        }
    }
    throw new Error("Propriété introuvable : " + (label || group.name) + " > " + keys.join(" / ") +
                    " (lance Outils > Dump calque et envoie-moi le fichier)");
};

// Ajoute un effet par matchName (indépendant de la langue d'AE).
Y.p.addEffect = function (layer, matchName, name) {
    var parade = Y.p.parade(layer), eff, idx, nm;
    if (!parade || !parade.canAddProperty(matchName)) {
        Y.fail("Impossible d'ajouter l'effet \"" + Y.fx.label(matchName) + "\" sur \"" + layer.name + "\".\n" +
               "Ce type de calque ne le permet pas, ou l'effet est absent de ton AE.");
    }
    nm = name ? Y.p.uniqueName(layer, name) : null;
    eff = parade.addProperty(matchName);
    idx = eff.propertyIndex;
    parade = Y.p.parade(layer);
    if (nm) { parade.property(idx).name = nm; }
    return parade.property(idx);
};


// =====================================================================
// EXPRESSION CONTROLS
// =====================================================================
Y.ctl = {};

Y.ctl.MN = {
    slider: "ADBE Slider Control",
    checkbox: "ADBE Checkbox Control",
    color: "ADBE Color Control",
    point: "ADBE Point Control",
    angle: "ADBE Angle Control",
    dropdown: "ADBE Dropdown Control",
    layer: "ADBE Layer Control"
};

// Ajoute un Expression Control nommé. items = libellés (menu déroulant uniquement).
// Renvoie l'effet ; son nom réel (suffixe " 2" si doublon) est dans .name.
Y.ctl.add = function (layer, type, name, value, items) {
    var mn = Y.ctl.MN[type], parade, eff, idx, v;
    if (!mn) { throw new Error("Type de contrôle inconnu : " + type); }
    eff = Y.p.addEffect(layer, mn, null);
    idx = eff.propertyIndex;
    parade = Y.p.parade(layer);
    if (type === "dropdown" && items && items.length) {
        // setPropertyParameters AVANT de renommer l'effet, puis référence fraîche.
        parade.property(idx).property(1).setPropertyParameters(items);
        parade = Y.p.parade(layer);
    }
    parade.property(idx).name = Y.p.uniqueName(layer, name);
    eff = Y.p.parade(layer).property(idx);
    if (value !== undefined && value !== null) {
        v = value;
        if (type === "checkbox") { v = value ? 1 : 0; }
        if (type === "color" && v.length === 3) { v = [v[0], v[1], v[2], 1]; }
        eff.property(1).setValue(v);
    }
    return Y.p.parade(layer).property(idx);
};

// Courbe d'easing stockée dans deux Point Controls (P1, P2) = bézier cubique (x1,y1) (x2,y2).
// Elastic (non bézier) : P1 = [-1, -1]. Renvoie { p1: nom, p2: nom }.
Y.ctl.addCurve = function (layer, base, curve) {
    var b = (curve && curve.b) ? curve.b : [0.34, 1.56, 0.64, 1];
    var special = !!(curve && curve.special);
    var n1 = Y.ctl.add(layer, "point", base + "_CourbeP1", special ? [-1, -1] : [b[0], b[1]]).name;
    var n2 = Y.ctl.add(layer, "point", base + "_CourbeP2", special ? [-1, -1] : [b[2], b[3]]).name;
    return { p1: n1, p2: n2 };
};


// =====================================================================
// EXPRESSIONS
// Compatibles moteur JavaScript (défaut d'AE 2025) ET Legacy ExtendScript.
// Les contrôles sont lus par nom d'effet + index (1) : indépendant de la langue.
// =====================================================================
Y.x = {};

Y.x.esc = function (s) {
    return String(s).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
};

// Référence à la valeur d'un Expression Control.
Y.x.ctl = function (effName) {
    return "effect(\"" + Y.x.esc(effName) + "\")(1)";
};

Y.x.set = function (prop, expr) {
    if (!prop.canSetExpression) {
        throw new Error("La propriété \"" + prop.name + "\" n'accepte pas d'expression.");
    }
    try {
        prop.expression = expr;
    } catch (e) {
        throw new Error("Expression refusée par AE sur \"" + prop.name + "\" : " + Y.errText(e));
    }
    try { prop.expressionEnabled = true; } catch (e2) {}
};

// Évalue l'expression aux temps donnés. Renvoie "" si tout va bien, sinon l'erreur.
Y.x.check = function (prop, times) {
    var i, err;
    for (i = 0; i < times.length; i++) {
        try { prop.valueAtTime(times[i], false); } catch (e) { return Y.errText(e); }
        err = prop.expressionError;
        if (err) { return String(err); }
    }
    return "";
};

// Bibliothèque d'easing injectée dans les expressions : la même courbe que l'éditeur du panel.
// yfxBez(t, x1, y1, x2, y2) : bézier cubique (comme CSS cubic-bezier / Flow), t = progression 0..1.
// yfxCurve(t, p1, p2) : lit la courbe des Point Controls ; p1 = [-1, -1] = Elastic.
Y.x.LIB_CURVE = [
    "function yfxBez(t, x1, y1, x2, y2) {",
    "  if (t <= 0) { return 0; }",
    "  if (t >= 1) { return 1; }",
    "  var lo = 0, hi = 1, u = t, x = 0, i = 0;",
    "  for (i = 0; i < 24; i++) {",
    "    u = (lo + hi) / 2;",
    "    x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;",
    "    if (x < t) { lo = u; } else { hi = u; }",
    "  }",
    "  return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;",
    "}",
    "function yfxCurve(t, p1, p2) {",
    "  if (p1[0] < 0) {",
    "    if (t <= 0) { return 0; }",
    "    if (t >= 1) { return 1; }",
    "    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;",
    "  }",
    "  return yfxBez(t, p1[0], p1[1], p2[0], p2[1]);",
    "}"
].join("\n");

// Dernier marker du calque L avant (ou à) l'instant t, ou null.
Y.x.LIB_MARKER = [
    "function yfxPrevMarker(L, t) {",
    "  var m = L.marker;",
    "  if (m.numKeys < 1) { return null; }",
    "  var n = m.nearestKey(t).index;",
    "  if (m.key(n).time > t) { n = n - 1; }",
    "  return (n >= 1) ? m.key(n) : null;",
    "}"
].join("\n");


// =====================================================================
// MARKERS DE CALQUE
// =====================================================================
Y.m = {};

Y.m.prop = function (layer) {
    return layer.property("ADBE Marker");
};

Y.m.add = function (layer, t, comment) {
    Y.m.prop(layer).setValueAtTime(t, new MarkerValue(comment || ""));
};

Y.m.times = function (layer) {
    var p = Y.m.prop(layer), r = [], i;
    for (i = 1; i <= p.numKeys; i++) { r.push(p.keyTime(i)); }
    return r;
};


// =====================================================================
// KEYFRAMES
// =====================================================================
Y.k = {};

// Nombre d'objets KeyframeEase attendus par AE pour cette propriété.
Y.k.easeDims = function (prop) {
    var t = prop.propertyValueType;
    if (t === PropertyValueType.TwoD) { return 2; }
    if (t === PropertyValueType.ThreeD) { return 3; }
    return 1;
};

// Easing d'une key : influences en % (0.1..100), vitesses en unités/s (0 = arrêt).
Y.k.ease = function (prop, keyIndex, inInfl, outInfl, inSpeed, outSpeed) {
    var n = Y.k.easeDims(prop), ein = [], eout = [], i;
    for (i = 0; i < n; i++) {
        ein.push(new KeyframeEase(inSpeed || 0, Y.u.clamp(inInfl, 0.1, 100)));
        eout.push(new KeyframeEase(outSpeed || 0, Y.u.clamp(outInfl, 0.1, 100)));
    }
    prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setTemporalEaseAtKey(keyIndex, ein, eout);
};


// =====================================================================
// CALQUES
// =====================================================================
Y.l = {};

Y.l.findByName = function (comp, name) {
    for (var i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i).name === name) { return comp.layer(i); }
    }
    return null;
};

// Nature d'un calque, pour l'affichage dans le panel.
Y.l.kind = function (L) {
    if (L instanceof TextLayer) { return "texte"; }
    if (L instanceof ShapeLayer) { return "forme"; }
    if (L instanceof CameraLayer) { return "caméra"; }
    if (L instanceof LightLayer) { return "lumière"; }
    if (L instanceof AVLayer) {
        if (L.nullLayer) { return "null"; }
        if (L.adjustmentLayer) { return "ajustement"; }
        if (L.source instanceof CompItem) { return "précomp"; }
        if (L.source && L.source.mainSource instanceof SolidSource) { return "solide"; }
        if (!L.hasVideo && L.hasAudio) { return "audio"; }
        return "footage";
    }
    return "?";
};

// Solide source déjà créé par YexoFX pour cette taille (rangé dans YFX_Solids).
Y.l.solidItem = function (comp, tag) {
    var folder = Y.proj.folder("YFX_Solids"), i, it;
    var name = Y.PREFIX + tag + "_" + comp.width + "x" + comp.height;
    for (i = 1; i <= folder.numItems; i++) {
        it = folder.item(i);
        if ((it instanceof FootageItem) && it.name === name && (it.mainSource instanceof SolidSource)) { return it; }
    }
    return null;
};

// Ajoute un solide (ou un adjustment) en réutilisant la même source :
// le projet ne se remplit pas de dizaines de solides.
// o = { adjustment: bool, above: calque, inPoint: s, outPoint: s }
Y.l.addSolid = function (comp, layerName, rgb, tag, o) {
    var item = Y.l.solidItem(comp, tag), layer;
    o = o || {};
    if (item) {
        layer = comp.layers.add(item, comp.duration);
    } else {
        layer = comp.layers.addSolid(rgb, layerName, comp.width, comp.height, comp.pixelAspect, comp.duration);
        item = layer.source;
        item.name = Y.PREFIX + tag + "_" + comp.width + "x" + comp.height;
        item.parentFolder = Y.proj.folder("YFX_Solids");
    }
    layer.name = layerName;
    layer.comment = "YexoFX";
    if (o.adjustment) { layer.adjustmentLayer = true; }
    if (o.above) { layer.moveBefore(o.above); }
    layer.startTime = 0;
    layer.inPoint = (o.inPoint !== undefined) ? o.inPoint : 0;
    layer.outPoint = (o.outPoint !== undefined) ? o.outPoint : comp.duration;
    return layer;
};
