// ---- src/00_header.jsx ----
/*
 * YexoFX : moteur ExtendScript de l'extension CEP (panel After Effects 2025, edits FPS)
 * ------------------------------------------------------------------
 * Ce fichier est G\u00c9N\u00c9R\u00c9 par build.mjs \u00e0 partir de src/*.jsx.
 * Ne pas l'\u00e9diter \u00e0 la main : modifier src/ puis relancer le build.
 * Le panel (cep/index.html) l'appelle via YFX.api.call("<json>").
 *
 * ExtendScript = ES3 : pas de let/const, arrow functions, template strings,
 * Array.forEach/map/indexOf, ni JSON natif (json2 embarqu\u00e9 plus bas).
 * Les accents sont encod\u00e9s en \uXXXX au build : le fichier final est 100 % ASCII.
 */
(function YexoFX(thisObj) {

var Y = {};
Y.VERSION = "0.6.0";
Y.BUILD = "2026-11-16 21:29";
Y.PREFIX = "YFX_";

// Chemin de ce script : fourni par le loader de dev / le bouton Recharger,
// sinon $.fileName. Lu une seule fois, au chargement.
Y.bootPath = null;
try {
    Y.bootPath = $.global.__YFX_PATH__ || $.fileName || null;
    $.global.__YFX_PATH__ = null;
} catch (eBoot) {}


// =====================================================================
// JSON : json2 (Douglas Crockford, domaine public), adapt\u00e9 ES3.
// Sortie 100 % ASCII : tout caract\u00e8re non ASCII est \u00e9crit en \uXXXX.
// =====================================================================
Y.json = (function () {
    var ESC = /[\\\"\u0000-\u001f\u007f-\uffff]/g;
    var META = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", "\"": "\\\"", "\\": "\\\\" };
    var CX = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function hex4(c) {
        var h = c.toString(16);
        while (h.length < 4) { h = "0" + h; }
        return h;
    }

    function quote(s) {
        return "\"" + s.replace(ESC, function (a) {
            var m = META[a];
            return (typeof m === "string") ? m : "\\u" + hex4(a.charCodeAt(0));
        }) + "\"";
    }

    function isArr(v) {
        return Object.prototype.toString.call(v) === "[object Array]";
    }

    function str(v, indent, gap) {
        var t = typeof v, i, k, parts, inner, s;
        if (v === null) { return "null"; }
        if (t === "string") { return quote(v); }
        if (t === "number") { return isFinite(v) ? String(v) : "null"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t !== "object") { return undefined; }
        inner = indent + gap;
        parts = [];
        if (isArr(v)) {
            for (i = 0; i < v.length; i++) {
                s = str(v[i], inner, gap);
                parts.push(s === undefined ? "null" : s);
            }
            if (parts.length === 0) { return "[]"; }
            return gap ? "[\n" + inner + parts.join(",\n" + inner) + "\n" + indent + "]"
                       : "[" + parts.join(",") + "]";
        }
        for (k in v) {
            if (Object.prototype.hasOwnProperty.call(v, k)) {
                s = str(v[k], inner, gap);
                if (s !== undefined) { parts.push(quote(k) + (gap ? ": " : ":") + s); }
            }
        }
        if (parts.length === 0) { return "{}"; }
        return gap ? "{\n" + inner + parts.join(",\n" + inner) + "\n" + indent + "}"
                   : "{" + parts.join(",") + "}";
    }

    function parse(text) {
        text = String(text).replace(/^\ufeff/, "");
        CX.lastIndex = 0;
        if (CX.test(text)) {
            text = text.replace(CX, function (a) { return "\\u" + hex4(a.charCodeAt(0)); });
        }
        if (/^[\],:{}\s]*$/.test(text
                .replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
                .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
                .replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
            return eval("(" + text + ")");
        }
        throw new Error("JSON invalide");
    }

    return {
        stringify: function (v, gap) {
            var r = str(v, "", gap || "");
            return (r === undefined) ? "" : r;
        },
        parse: parse
    };
})();
// ---- src/10_utils.jsx ----
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

// Position d'une sous-cha\u00eene (String.indexOf, lui, existe bien en ES3).
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
    [/[\u00e0\u00e2\u00e4\u00e1\u00e3\u00e5]/g, "a"], [/\u00e7/g, "c"], [/[\u00e9\u00e8\u00ea\u00eb]/g, "e"], [/[\u00ed\u00ec\u00ee\u00ef]/g, "i"], [/\u00f1/g, "n"],
    [/[\u00f3\u00f2\u00f4\u00f6\u00f5]/g, "o"], [/[\u00fa\u00f9\u00fb\u00fc]/g, "u"], [/[\u00fd\u00ff]/g, "y"], [/\u0153/g, "oe"], [/\u00e6/g, "ae"]
];
Y.u.fold = function (s) {
    s = String(s).toLowerCase();
    for (var i = 0; i < Y.u.FOLD.length; i++) {
        s = s.replace(Y.u.FOLD[i][0], Y.u.FOLD[i][1]);
    }
    return s;
};

// Temps -> format d'affichage de la comp (timecode ou frames, selon les r\u00e9glages du projet).
Y.u.tc = function (t, comp) {
    try { return timeToCurrentFormat(t, comp.frameRate); } catch (e) { return Y.u.round(t, 2) + " s"; }
};

// Nombre "\u00e0 la fran\u00e7aise" : 0.2 -> "0,2".
Y.u.fr = function (v, decimals) {
    return String(Y.u.round(v, decimals)).replace(".", ",");
};


// =====================================================================
// ERREURS
// Y.fail() = erreur "utilisateur" (mauvaise s\u00e9lection...) : message clair, pas un bug.
// Tout le reste (Error) = bug : message + num\u00e9ro de ligne + log.
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

// Pr\u00e9f\u00e9rence "Allow Scripts to Write Files and Access Network".
// Si elle est introuvable, on suppose que c'est autoris\u00e9 (l'\u00e9criture \u00e9chouera proprement sinon).
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
// %APPDATA%\YexoFX, les assets dans un dossier YexoFX_assets trouv\u00e9 ci-dessous.
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
// LOG : %APPDATA%\YexoFX\yexofx.log (remis \u00e0 z\u00e9ro au-del\u00e0 de 500 Ko)
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

// Dossier de projet (cr\u00e9\u00e9 s'il n'existe pas).
Y.proj.folder = function (name) {
    var i, it;
    for (i = 1; i <= app.project.numItems; i++) {
        it = app.project.item(i);
        if ((it instanceof FolderItem) && it.name === name) { return it; }
    }
    return app.project.items.addFolder(name);
};


// =====================================================================
// CATALOGUE D'EFFETS (app.effects) : v\u00e9rifie les natifs, d\u00e9tecte les tiers
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

// Effets tiers utilisables en option "si install\u00e9" (jamais requis).
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
// PROPRI\u00c9T\u00c9S / EFFETS
// Les r\u00e9f\u00e9rences AE deviennent invalides apr\u00e8s un addProperty : on garde
// l'index et on reprend une r\u00e9f\u00e9rence fra\u00eeche \u00e0 chaque \u00e9tape.
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

// Propri\u00e9t\u00e9 d'un groupe (effet, animator...) trouv\u00e9e par matchName, puis par nom affich\u00e9.
// keys = liste ["ADBE Geometry2-0002", "Position"]. L\u00e8ve une erreur claire si rien ne correspond.
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
    throw new Error("Propri\u00e9t\u00e9 introuvable : " + (label || group.name) + " > " + keys.join(" / ") +
                    " (lance Outils > Dump calque et envoie-moi le fichier)");
};

// Ajoute un effet par matchName (ind\u00e9pendant de la langue d'AE).
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

// Ajoute un Expression Control nomm\u00e9. items = libell\u00e9s (menu d\u00e9roulant uniquement).
// Renvoie l'effet ; son nom r\u00e9el (suffixe " 2" si doublon) est dans .name.
Y.ctl.add = function (layer, type, name, value, items) {
    var mn = Y.ctl.MN[type], parade, eff, idx, v;
    if (!mn) { throw new Error("Type de contr\u00f4le inconnu : " + type); }
    eff = Y.p.addEffect(layer, mn, null);
    idx = eff.propertyIndex;
    parade = Y.p.parade(layer);
    if (type === "dropdown" && items && items.length) {
        // setPropertyParameters AVANT de renommer l'effet, puis r\u00e9f\u00e9rence fra\u00eeche.
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

// Courbe d'easing stock\u00e9e dans deux Point Controls (P1, P2) = b\u00e9zier cubique (x1,y1) (x2,y2).
// Elastic (non b\u00e9zier) : P1 = [-1, -1]. Renvoie { p1: nom, p2: nom }.
Y.ctl.addCurve = function (layer, base, curve) {
    var b = (curve && curve.b) ? curve.b : [0.34, 1.56, 0.64, 1];
    var special = !!(curve && curve.special);
    var n1 = Y.ctl.add(layer, "point", base + "_CourbeP1", special ? [-1, -1] : [b[0], b[1]]).name;
    var n2 = Y.ctl.add(layer, "point", base + "_CourbeP2", special ? [-1, -1] : [b[2], b[3]]).name;
    return { p1: n1, p2: n2 };
};


// =====================================================================
// EXPRESSIONS
// Compatibles moteur JavaScript (d\u00e9faut d'AE 2025) ET Legacy ExtendScript.
// Les contr\u00f4les sont lus par nom d'effet + index (1) : ind\u00e9pendant de la langue.
// =====================================================================
Y.x = {};

Y.x.esc = function (s) {
    return String(s).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
};

// R\u00e9f\u00e9rence \u00e0 la valeur d'un Expression Control.
Y.x.ctl = function (effName) {
    return "effect(\"" + Y.x.esc(effName) + "\")(1)";
};

Y.x.set = function (prop, expr) {
    if (!prop.canSetExpression) {
        throw new Error("La propri\u00e9t\u00e9 \"" + prop.name + "\" n'accepte pas d'expression.");
    }
    try {
        prop.expression = expr;
    } catch (e) {
        throw new Error("Expression refus\u00e9e par AE sur \"" + prop.name + "\" : " + Y.errText(e));
    }
    try { prop.expressionEnabled = true; } catch (e2) {}
};

// \u00c9value l'expression aux temps donn\u00e9s. Renvoie "" si tout va bien, sinon l'erreur.
Y.x.check = function (prop, times) {
    var i, err;
    for (i = 0; i < times.length; i++) {
        try { prop.valueAtTime(times[i], false); } catch (e) { return Y.errText(e); }
        err = prop.expressionError;
        if (err) { return String(err); }
    }
    return "";
};

// Biblioth\u00e8que d'easing inject\u00e9e dans les expressions : la m\u00eame courbe que l'\u00e9diteur du panel.
// yfxBez(t, x1, y1, x2, y2) : b\u00e9zier cubique (comme CSS cubic-bezier / Flow), t = progression 0..1.
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

// Dernier marker du calque L avant (ou \u00e0) l'instant t, ou null.
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

// Nombre d'objets KeyframeEase attendus par AE pour cette propri\u00e9t\u00e9.
Y.k.easeDims = function (prop) {
    var t = prop.propertyValueType;
    if (t === PropertyValueType.TwoD) { return 2; }
    if (t === PropertyValueType.ThreeD) { return 3; }
    return 1;
};

// Easing d'une key : influences en % (0.1..100), vitesses en unit\u00e9s/s (0 = arr\u00eat).
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
    if (L instanceof CameraLayer) { return "cam\u00e9ra"; }
    if (L instanceof LightLayer) { return "lumi\u00e8re"; }
    if (L instanceof AVLayer) {
        if (L.nullLayer) { return "null"; }
        if (L.adjustmentLayer) { return "ajustement"; }
        if (L.source instanceof CompItem) { return "pr\u00e9comp"; }
        if (L.source && L.source.mainSource instanceof SolidSource) { return "solide"; }
        if (!L.hasVideo && L.hasAudio) { return "audio"; }
        return "footage";
    }
    return "?";
};

// Solide source d\u00e9j\u00e0 cr\u00e9\u00e9 par YexoFX pour cette taille (rang\u00e9 dans YFX_Solids).
Y.l.solidItem = function (comp, tag) {
    var folder = Y.proj.folder("YFX_Solids"), i, it;
    var name = Y.PREFIX + tag + "_" + comp.width + "x" + comp.height;
    for (i = 1; i <= folder.numItems; i++) {
        it = folder.item(i);
        if ((it instanceof FootageItem) && it.name === name && (it.mainSource instanceof SolidSource)) { return it; }
    }
    return null;
};

// Ajoute un solide (ou un adjustment) en r\u00e9utilisant la m\u00eame source :
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
// ---- src/20_core.jsx ----
// =====================================================================
// CORE : messages, pr\u00e9requis de s\u00e9lection, config, registre, ex\u00e9cution
// Le panel CEP envoie : id du preset + param\u00e8tres (dur\u00e9e, intensit\u00e9, courbe...).
// =====================================================================

Y.cleanHooks = [];   // function (layer) -> nombre d'\u00e9l\u00e9ments YFX retir\u00e9s par "Nettoyer"

Y.MSG = {
    noProject: "Aucun projet ouvert.",
    noComp: "Aucune composition active. Ouvre ta comp et clique dans sa timeline, puis relance.",
    layer: "S\u00e9lectionne au moins un calque dans la timeline.",
    av: "S\u00e9lectionne au moins un calque visuel : footage, pr\u00e9comp, solide, texte ou forme.",
    text: "S\u00e9lectionne au moins un calque texte (T) dans la timeline.",
    audio: "S\u00e9lectionne un calque qui contient de l'audio.",
    two: "S\u00e9lectionne exactement 2 calques : le plan sortant puis le plan entrant.",
    locked: function (L) {
        return "Le calque \"" + L.name + "\" est verrouill\u00e9 (cadenas). D\u00e9verrouille-le puis relance.";
    }
};

// needs d'un preset -> r\u00e8gles de validation.
// min/max = nombre de calques valides requis ; write:false = calques verrouill\u00e9s tol\u00e9r\u00e9s.
// "any" = calques visuels s\u00e9lectionn\u00e9s si pr\u00e9sents, sinon le preset cr\u00e9e son propre calque.
Y.NEEDS = {
    none: null,
    comp: { min: 0, write: false, msg: "", ok: function (L) { return true; } },
    any: { min: 0, msg: "", ok: function (L) { return (L instanceof AVLayer) && !Y.u.begins(L.name, Y.PREFIX); } },
    layer: { min: 1, msg: Y.MSG.layer, ok: function (L) { return true; } },
    av: { min: 1, msg: Y.MSG.av, ok: function (L) { return L instanceof AVLayer; } },
    text: { min: 1, msg: Y.MSG.text, ok: function (L) { return L instanceof TextLayer; } },
    audio: { min: 1, msg: Y.MSG.audio, ok: function (L) { return (L instanceof AVLayer) && L.hasAudio; } },
    two: { min: 2, max: 2, msg: Y.MSG.two, ok: function (L) { return L instanceof AVLayer; } }
};


// =====================================================================
// CONFIG : %APPDATA%\YexoFX\config.json (c\u00f4t\u00e9 moteur : dossier assets)
// Les pr\u00e9f\u00e9rences d'interface (favoris, dur\u00e9es, courbes) sont g\u00e9r\u00e9es par le panel.
// =====================================================================
Y.cfg = { data: null };

Y.cfg.defaults = function () {
    return { version: 2, assetsPath: "" };
};

Y.cfg.load = function () {
    var d = Y.cfg.defaults(), txt = null, o = null;
    try { txt = Y.f.read(Y.paths.configFile()); } catch (e) {}
    if (txt) {
        try { o = Y.json.parse(txt); } catch (e2) { Y.log("WARN", "config.json illisible : valeurs par d\u00e9faut."); }
    }
    if (o && typeof o === "object") { Y.u.extend(d, o); }
    if (typeof d.assetsPath !== "string") { d.assetsPath = ""; }
    Y.cfg.data = d;
};

Y.cfg.save = function () {
    if (!Y.cfg.data) { return false; }
    try {
        return Y.f.write(Y.paths.configFile(), Y.json.stringify(Y.cfg.data, "  "));
    } catch (e) {
        Y.log("WARN", "config non sauv\u00e9e : " + Y.errText(e));
        return false;
    }
};


// =====================================================================
// REGISTRE DES PRESETS (c\u00f4t\u00e9 moteur)
// L'id doit correspondre \u00e0 celui du catalogue du panel (cep/js/catalog.js) :
// le panel n'active que les presets que ce registre conna\u00eet.
//   id, name, needs (none|comp|any|layer|av|text|audio|two), run(ctx) -> message
//   f      dur\u00e9e par d\u00e9faut en images (si le panel n'en envoie pas)
//   noUndo true = pas d'undo group ; hidden true = jamais propos\u00e9 au panel
//   autotest false = ignor\u00e9 par l'auto-test
// =====================================================================
Y.reg = { list: [], byId: {} };

Y.reg.add = function (def) {
    if (!def || !def.id || typeof def.run !== "function") {
        throw new Error("Preset invalide : " + (def && def.id ? def.id : "?"));
    }
    if (Y.reg.byId[def.id]) { throw new Error("Preset en double : " + def.id); }
    if (def.needs === undefined) { def.needs = "comp"; }
    if (!Object.prototype.hasOwnProperty.call(Y.NEEDS, def.needs)) {
        throw new Error("needs inconnu pour " + def.id + " : " + def.needs);
    }
    def.name = def.name || def.id;
    Y.reg.list.push(def);
    Y.reg.byId[def.id] = def;
    return def;
};

Y.reg.title = function (p) {
    return p.name || p.id;
};

Y.reg.ids = function () {
    var r = [], i;
    for (i = 0; i < Y.reg.list.length; i++) {
        if (!Y.reg.list[i].hidden) { r.push(Y.reg.list[i].id); }
    }
    return r;
};


// =====================================================================
// PARAM\u00c8TRES ENVOY\u00c9S PAR LE PANEL (normalis\u00e9s)
//   intensity 0..2   frames 1..240   curve { b: [x1,y1,x2,y2], special: bool, name }
//   dir in|out|both  by car|mot|ligne
// =====================================================================
Y.CURVE_DEFAULT = { b: [0.34, 1.56, 0.64, 1], special: false, name: "Back" };

Y.params = function (p, raw) {
    var r = raw || {}, o = {}, n, b, i, ok;
    n = Number(r.intensity);
    o.intensity = isNaN(n) ? 1 : Y.u.clamp(n, 0, 2);
    n = Number(r.frames);
    o.frames = (isNaN(n) || n <= 0) ? (p.f || 12) : Y.u.clamp(Math.round(n), 1, 240);
    o.curve = Y.CURVE_DEFAULT;
    if (r.curve && Y.u.isArray(r.curve.b) && r.curve.b.length === 4) {
        b = [];
        ok = true;
        for (i = 0; i < 4; i++) {
            b.push(Number(r.curve.b[i]));
            if (isNaN(b[i])) { ok = false; }
        }
        if (ok) {
            b[0] = Y.u.clamp(b[0], 0, 1);
            b[2] = Y.u.clamp(b[2], 0, 1);
            o.curve = { b: b, special: !!r.curve.special, name: String(r.curve.name || "Perso") };
        }
    }
    o.dir = (r.dir === "out" || r.dir === "both") ? r.dir : "in";
    o.by = (r.by === "mot" || r.by === "ligne") ? r.by : "car";
    return o;
};


// =====================================================================
// CONTEXTE D'EX\u00c9CUTION
// Valide comp / s\u00e9lection selon p.needs. Lance Y.fail() avec un message clair sinon.
// comp et sel sont optionnels (auto-test) : par d\u00e9faut, comp active + calques s\u00e9lectionn\u00e9s.
// =====================================================================
Y.ctx = function (p, raw, comp, sel) {
    var rule = Y.NEEDS[p.needs], i, L, prm = Y.params(p, raw);
    var c = {
        preset: p,
        intensity: prm.intensity, frames: prm.frames, curve: prm.curve, dir: prm.dir, by: prm.by,
        comp: null, layers: [], layer: null, skipped: 0
    };
    if (!rule) { return c; }
    if (!comp) {
        if (!app.project) { Y.fail(Y.MSG.noProject); }
        comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) { Y.fail(Y.MSG.noComp); }
        sel = comp.selectedLayers;
    }
    c.comp = comp;
    c.fd = comp.frameDuration;
    c.fps = comp.frameRate;
    c.time = comp.time;
    c.dur = c.frames * comp.frameDuration;
    sel = sel || [];
    for (i = 0; i < sel.length; i++) {
        L = sel[i];
        if (rule.ok(L)) {
            if (L.locked && rule.write !== false) { Y.fail(Y.MSG.locked(L)); }
            c.layers.push(L);
        } else {
            c.skipped++;
        }
    }
    if (c.layers.length < rule.min || (rule.max && c.layers.length > rule.max)) { Y.fail(rule.msg); }
    c.layer = c.layers.length ? c.layers[0] : null;
    return c;
};


// =====================================================================
// Y.exec : point d'entr\u00e9e UNIQUE de tous les presets.
// Validation -> undo group -> ex\u00e9cution. L'undo group est toujours referm\u00e9 (finally) :
// un Ctrl+Z annule exactement une action. Renvoie le message de statut ;
// l\u00e8ve Y.UserError (message clair) ou Error (bug, avec ligne) en cas d'\u00e9chec.
// =====================================================================
Y.exec = function (id, raw, comp, sel) {
    var p = Y.reg.byId[id], c, msg;
    if (!p) { Y.fail("Ce preset n'est pas encore disponible dans le moteur (" + id + ")."); }
    c = Y.ctx(p, raw, comp, sel);
    if (!p.noUndo) { app.beginUndoGroup("YexoFX : " + Y.reg.title(p)); }
    try {
        msg = p.run(c);
    } catch (e) {
        Y.log(e && e.yfx ? "WARN" : "ERROR", p.id + " : " + Y.errText(e));
        throw e;
    } finally {
        if (!p.noUndo) { app.endUndoGroup(); }
    }
    msg = msg || ("OK : " + Y.reg.title(p));
    if (c.skipped) { msg += " (" + c.skipped + " calque(s) ignor\u00e9(s))"; }
    Y.log("INFO", p.id + " : " + msg);
    return msg;
};


// =====================================================================
// PRESETS UTILITAIRES
// =====================================================================
Y.reg.add({
    id: "tools_select_yfx", name: "S\u00e9lectionner les calques YFX", needs: "comp",
    run: function (c) {
        var n = 0, i, L, on;
        for (i = 1; i <= c.comp.numLayers; i++) {
            L = c.comp.layer(i);
            on = Y.u.begins(L.name, Y.PREFIX);
            L.selected = on;
            if (on) { n++; }
        }
        return n + " calque(s) YFX s\u00e9lectionn\u00e9(s).";
    }
});

Y.reg.add({
    id: "tools_clean", name: "Nettoyer YFX des calques", needs: "layer",
    run: function (c) {
        var n = 0, i, j, L, fx, an;
        for (i = 0; i < c.layers.length; i++) {
            L = c.layers[i];
            fx = Y.p.parade(L);
            if (fx) {
                for (j = fx.numProperties; j >= 1; j--) {
                    if (Y.u.begins(Y.p.parade(L).property(j).name, Y.PREFIX)) {
                        Y.p.parade(L).property(j).remove();
                        n++;
                    }
                }
            }
            if (L instanceof TextLayer) {
                an = L.property("ADBE Text Properties").property("ADBE Text Animators");
                for (j = an.numProperties; j >= 1; j--) {
                    an = L.property("ADBE Text Properties").property("ADBE Text Animators");
                    if (Y.u.begins(an.property(j).name, Y.PREFIX)) {
                        an.property(j).remove();
                        n++;
                    }
                }
            }
            for (j = 0; j < Y.cleanHooks.length; j++) { n += Y.cleanHooks[j](L) || 0; }
        }
        return n ? n + " \u00e9l\u00e9ment(s) YFX retir\u00e9(s) de " + c.layers.length + " calque(s)."
                 : "Rien \u00e0 nettoyer : aucun \u00e9l\u00e9ment YFX sur la s\u00e9lection.";
    }
});
// ---- src/30_text.jsx ----
// =====================================================================
// TEXTE : animators + s\u00e9lecteur d'expression (easing par lettre / mot / ligne)
// Chaque anim pose ses r\u00e9glages sur le calque texte : Dur\u00e9e, D\u00e9lai, Mode, Courbe P1/P2.
// Entr\u00e9e cal\u00e9e sur le In du calque, sortie sur le Out : trimme le calque, l'anim suit.
// =====================================================================
Y.text = {};

Y.text.animators = function (L) {
    return L.property("ADBE Text Properties").property("ADBE Text Animators");
};

Y.text.uniqueName = function (L, base) {
    var an = Y.text.animators(L), i, taken = {};
    for (i = 1; i <= an.numProperties; i++) { taken[an.property(i).name] = true; }
    if (!taken[base]) { return base; }
    i = 2;
    while (taken[base + " " + i]) { i++; }
    return base + " " + i;
};

// "Based On" du s\u00e9lecteur : 2 = caract\u00e8res (sans espaces), 3 = mots, 4 = lignes.
Y.text.BASED_ON = { car: 2, mot: 3, ligne: 4 };

// Cr\u00e9e un animator nomm\u00e9 avec ses propri\u00e9t\u00e9s (props = [{ mn, value, expr }]) et un s\u00e9lecteur d'expression.
Y.text.addAnimator = function (L, name, props, expr, by) {
    var anims = Y.text.animators(L), an, ai, nm, i, sel, si, pr;
    if (!anims.canAddProperty("ADBE Text Animator")) {
        Y.fail("Impossible d'ajouter un animator sur \"" + L.name + "\".");
    }
    nm = Y.text.uniqueName(L, name);
    an = anims.addProperty("ADBE Text Animator");
    ai = an.propertyIndex;
    Y.text.animators(L).property(ai).name = nm;
    for (i = 0; i < props.length; i++) {
        Y.text.animators(L).property(ai).property("ADBE Text Animator Properties").addProperty(props[i].mn);
        pr = Y.text.animators(L).property(ai).property("ADBE Text Animator Properties").property(props[i].mn);
        pr.setValue(props[i].value);
        if (props[i].expr) { Y.x.set(Y.text.animators(L).property(ai).property("ADBE Text Animator Properties").property(props[i].mn), props[i].expr); }
    }
    sel = Y.text.animators(L).property(ai).property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
    si = sel.propertyIndex;
    sel = Y.text.animators(L).property(ai).property("ADBE Text Selectors").property(si);
    try { sel.property("ADBE Text Range Type2").setValue(Y.text.BASED_ON[by] || 2); } catch (e) {}
    sel = Y.text.animators(L).property(ai).property("ADBE Text Selectors").property(si);
    Y.x.set(sel.property("ADBE Text Expressible Amount"), expr);
    return nm;
};

// Contr\u00f4les communs aux anims de texte. Renvoie les noms r\u00e9els.
Y.text.controls = function (L, base, c, delayFrames, more) {
    var mode = { "in": 1, out: 2, both: 3 }[c.dir] || 1;
    return Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "delay", "Delai", delayFrames],
        ["dropdown", "mode", "Mode", mode, ["Entr\u00e9e", "Sortie", "Entr\u00e9e + sortie"]],
        ["curve", "curve"]
    ].concat(more || []));
};

// S\u00e9lecteur "r\u00e9v\u00e9lation" : 100 = \u00e9tat cach\u00e9, 0 = \u00e9tat final ; la courbe peut d\u00e9passer (overshoot).
Y.text.selectorExpr = function (n) {
    var X = Y.x.ctl;
    return Y.x.LIB_CURVE + "\n" +
        "var fd = thisComp.frameDuration;\n" +
        "var d = Math.max(1, " + X(n.dur) + ") * fd;\n" +
        "var dl = Math.max(0, " + X(n.delay) + ") * fd;\n" +
        "var mode = Math.round(" + X(n.mode) + ");\n" +
        "var p1 = " + X(n.curve.p1) + ", p2 = " + X(n.curve.p2) + ";\n" +
        "var i = textIndex - 1, nb = textTotal;\n" +
        "var tin = (time - (thisLayer.inPoint + i * dl)) / d;\n" +
        "var tout = (time - (thisLayer.outPoint - d - (nb - 1 - i) * dl)) / d;\n" +
        "var v = 0;\n" +
        "if (mode == 1 || mode == 3) { v = 100 * (1 - yfxCurve(tin, p1, p2)); }\n" +
        "if (mode == 2 || mode == 3) { if (tout > 0) { v = 100 * (1 - yfxCurve(1 - tout, p1, p2)); } else if (mode == 2) { v = 0; } }\n" +
        "[v, v, v];";
};

Y.text.DELAY = { car: 2, mot: 5, ligne: 8 };

// Anim "r\u00e9v\u00e9lation" : props(c, L, n) = propri\u00e9t\u00e9s de l'animator ; extra(L, c, base, n) = effets en plus.
Y.text.reveal = function (id, name, f, props, extra, more) {
    Y.reg.add({
        id: id, name: name, needs: "text", f: f,
        run: function (c) {
            var i, L, base = Y.PREFIX + name.replace(/[^A-Za-z0-9]/g, ""), n;
            for (i = 0; i < c.layers.length; i++) {
                L = c.layers[i];
                n = Y.text.controls(L, base, c, Y.text.DELAY[c.by] || 2, more ? more(c) : []);
                if (id === "flip") { L.threeDPerChar = true; }
                Y.text.addAnimator(L, base, props(c, L, n), Y.text.selectorExpr(n), c.by);
                if (extra) { extra(L, c, base, n); }
            }
            return name + " sur " + c.layers.length + " calque(s) texte \u00b7 " + c.frames + " f \u00b7 " + c.curve.name + " \u00b7 r\u00e9glages " + base + "_*";
        }
    });
};

Y.text.reveal("pop", "Pop", 12, function () {
    return [{ mn: "ADBE Text Scale 3D", value: [0, 0, 0] }, { mn: "ADBE Text Opacity", value: 0 }];
});

Y.text.reveal("slide", "Slide", 14, function (c, L, n) {
    var C = Y.kit.C;
    return [{
        mn: "ADBE Text Position 3D", value: [0, 0, 0],
        expr: "var D = " + C("", n.dist) + ", dir = Math.round(" + C("", n.dir) + ");\n" +
              "(dir == 1) ? [0, D, 0] : (dir == 2) ? [0, -D, 0] : (dir == 3) ? [D, 0, 0] : [-D, 0, 0];"
    }, { mn: "ADBE Text Opacity", value: 0 }];
}, null, function (c) {
    return [["slider", "dist", "Distance", Math.round(90 * c.intensity)],
            ["dropdown", "dir", "Direction", 1, ["Du bas", "Du haut", "De droite", "De gauche"]]];
});

Y.text.reveal("blur", "Blur", 16, function (c) {
    var b = Math.round(16 * c.intensity);
    return [{ mn: "ADBE Text Blur", value: [b, b] }, { mn: "ADBE Text Opacity", value: 0 }, { mn: "ADBE Text Scale 3D", value: [115, 115, 100] }];
});

Y.text.reveal("flip", "Flip 3D", 14, function () {
    return [{ mn: "ADBE Text Rotation X", value: -95 }, { mn: "ADBE Text Opacity", value: 0 }];
});

Y.text.reveal("track", "Tracking", 20, function (c) {
    return [{ mn: "ADBE Text Tracking Amount", value: Math.round(60 * c.intensity) }, { mn: "ADBE Text Opacity", value: 0 }, { mn: "ADBE Text Blur", value: [6, 6] }];
});

// Stomp : les lettres tombent d'en haut et secouent le calque \u00e0 l'atterrissage.
Y.text.reveal("stomp", "Stomp", 10, function (c) {
    return [{ mn: "ADBE Text Position 3D", value: [0, -Math.round(170 * c.intensity), 0] }, { mn: "ADBE Text Scale 3D", value: [140, 140, 100] }, { mn: "ADBE Text Opacity", value: 0 }];
}, function (L, c, base, n) {
    var C = Y.kit.C, tr = Y.shake.addTransform(L, base, 0, 180);
    Y.x.set(Y.shake.trProp(L, tr, "pos"),
        "var land = thisLayer.inPoint + Math.max(1, " + C("", n.dur) + ") * thisComp.frameDuration;\n" +
        "var t = time - land, k = Math.max(0, 1 - t / (8 * thisComp.frameDuration));\n" +
        "(t >= 0 && k > 0) ? [value[0], value[1] + " + Math.round(9 * c.intensity) + " * k * Math.sin(t * 2 * Math.PI * 12)] : value;");
});

// Glitch : d\u00e9calages al\u00e9atoires par lettre + lettres qui flashent en rouge, \u00e0 l'entr\u00e9e et / ou \u00e0 la sortie.
Y.reg.add({
    id: "glitch", name: "Glitch", needs: "text", f: 10,
    run: function (c) {
        var i, L, base = Y.PREFIX + "Glitch", n, C = Y.kit.C, act;
        for (i = 0; i < c.layers.length; i++) {
            L = c.layers[i];
            n = Y.text.controls(L, base, c, 0, [["slider", "amp", "Decalage", Math.round(16 * c.intensity)]]);
            act = "var fd = thisComp.frameDuration, d = Math.max(1, " + C("", n.dur) + ") * fd, mode = Math.round(" + C("", n.mode) + ");\n" +
                  "var act = (mode != 2 && time - thisLayer.inPoint < d) || (mode != 1 && thisLayer.outPoint - time < d);\n" +
                  "var v = 0;\n";
            Y.text.addAnimator(L, base, [{ mn: "ADBE Text Position 3D", value: [0, 0, 0], expr: "[" + C("", n.amp) + ", 0, 0];" }],
                act + "if (act) { seedRandom(textIndex * 17 + Math.floor(time / fd / 2), true); v = (random() < 0.45) ? random(-100, 100) : 0; }\n[v, v, v];", "car");
            Y.text.addAnimator(L, base + "_Couleur", [{ mn: "ADBE Text Fill Color", value: [1, 0.2745, 0.3333, 1] }],
                act + "if (act) { seedRandom(textIndex * 29 + Math.floor(time / fd / 2), true); v = (random() < 0.3) ? 100 : 0; }\n[v, v, v];", "car");
        }
        return "Glitch sur " + c.layers.length + " calque(s) texte \u00b7 " + c.frames + " f";
    }
});

// Scramble : caract\u00e8res al\u00e9atoires qui se r\u00e9solvent un \u00e0 un.
Y.reg.add({
    id: "scramble", name: "Scramble", needs: "text", f: 24,
    run: function (c) {
        var i, L, base = Y.PREFIX + "Scramble", n, X = Y.x.ctl;
        for (i = 0; i < c.layers.length; i++) {
            L = c.layers[i];
            n = Y.text.controls(L, base, c, 2);
            Y.text.addAnimator(L, base, [{ mn: "ADBE Text Character Offset", value: 40 }],
                "var fd = thisComp.frameDuration, d = Math.max(1, " + X(n.dur) + ") * fd, dl = Math.max(0, " + X(n.delay) + ") * fd;\n" +
                "var mode = Math.round(" + X(n.mode) + "), i = textIndex - 1, nb = textTotal;\n" +
                "var hidden = false;\n" +
                "if (mode != 2) { hidden = time < thisLayer.inPoint + d * 0.4 + i * dl; }\n" +
                "if (mode != 1) { hidden = hidden || time > thisLayer.outPoint - d * 0.4 - (nb - 1 - i) * dl; }\n" +
                "var v = 0;\n" +
                "if (hidden) { seedRandom(textIndex * 13 + Math.floor(time / fd / 2), true); v = random(10, 100); }\n" +
                "[v, v, v];", "car");
        }
        return "Scramble sur " + c.layers.length + " calque(s) texte \u00b7 " + c.frames + " f";
    }
});

// Wave : vague continue (sinus) qui traverse le texte.
Y.reg.add({
    id: "wave", name: "Wave", needs: "text",
    run: function (c) {
        var i, L, base = Y.PREFIX + "Wave", n, C = Y.kit.C;
        for (i = 0; i < c.layers.length; i++) {
            L = c.layers[i];
            n = Y.kit.controls(L, base, c, [["slider", "amp", "Hauteur", Math.round(18 * c.intensity)], ["slider", "freq", "Frequence", 1.2], ["slider", "gap", "Ecart", 0.6]]);
            Y.text.addAnimator(L, base, [{ mn: "ADBE Text Position 3D", value: [0, -1, 0], expr: "[0, -" + C("", n.amp) + ", 0];" }],
                "var v = 100 * Math.sin(2 * Math.PI * " + C("", n.freq) + " * time + textIndex * " + C("", n.gap) + ");\n[v, v, v];", c.by);
        }
        return "Wave sur " + c.layers.length + " calque(s) texte (continu)";
    }
});

// Kinetic : chaque mot arrive sur un marker du calque texte (sinon tous les \u00ab Dur\u00e9e \u00bb images).
Y.reg.add({
    id: "kin", name: "Kinetic", needs: "text", f: 10,
    run: function (c) {
        var i, L, base = Y.PREFIX + "Kinetic", n, X = Y.x.ctl;
        for (i = 0; i < c.layers.length; i++) {
            L = c.layers[i];
            n = Y.kit.controls(L, base, c, [["slider", "dur", "Duree", c.frames], ["curve", "curve"]]);
            Y.text.addAnimator(L, base, [{ mn: "ADBE Text Scale 3D", value: [0, 0, 0] }, { mn: "ADBE Text Opacity", value: 0 }],
                Y.x.LIB_CURVE + "\n" +
                "var fd = thisComp.frameDuration, d = Math.max(1, " + X(n.dur) + ") * fd, mm = thisLayer.marker;\n" +
                "var t0 = (mm.numKeys >= textIndex) ? mm.key(textIndex).time : thisLayer.inPoint + (textIndex - 1) * d;\n" +
                "var v = 100 * (1 - yfxCurve((time - t0) / d, " + X(n.curve.p1) + ", " + X(n.curve.p2) + "));\n" +
                "[v, v, v];", "mot");
        }
        return "Kinetic : un mot par marker du calque texte (pose-les avec Marker au CTI) \u00b7 " + c.frames + " f";
    }
});

// Typewriter : le texte se tape lettre par lettre (Source Text), curseur clignotant en option.
Y.reg.add({
    id: "type", name: "Typewriter", needs: "text", f: 24,
    run: function (c) {
        var i, L, base = Y.PREFIX + "Typewriter", n, X = Y.x.ctl, txt, per, st;
        for (i = 0; i < c.layers.length; i++) {
            L = c.layers[i];
            st = L.property("ADBE Text Properties").property("ADBE Text Document");
            txt = String(st.value.text || "");
            per = Math.max(1, Math.round(c.frames / Math.max(1, txt.length)));
            n = Y.kit.controls(L, base, c, [
                ["slider", "per", "ImagesParLettre", per],
                ["checkbox", "cursor", "Curseur", true],
                ["dropdown", "mode", "Mode", { "in": 1, out: 2, both: 3 }[c.dir] || 1, ["Entr\u00e9e", "Sortie", "Entr\u00e9e + sortie"]]
            ]);
            Y.x.set(st,
                "var s = \"\" + value, nb = s.length, fd = thisComp.frameDuration;\n" +
                "var per = Math.max(0.5, " + X(n.per) + ") * fd, mode = Math.round(" + X(n.mode) + ");\n" +
                "var shown = nb;\n" +
                "if (mode != 2) { shown = Math.min(nb, Math.max(0, Math.floor((time - thisLayer.inPoint) / per))); }\n" +
                "if (mode != 1) { var left = Math.floor((thisLayer.outPoint - time) / per); if (left < nb) { shown = Math.min(shown, Math.max(0, left)); } }\n" +
                "var cur = \"\";\n" +
                "if (" + X(n.cursor) + " == 1) { cur = (Math.floor(time / 0.45) % 2 == 0) ? \"|\" : \" \"; }\n" +
                "s.substr(0, shown) + cur;");
        }
        return "Typewriter sur " + c.layers.length + " calque(s) texte \u00b7 curseur r\u00e9glable (" + base + "_Curseur)";
    }
});

// Kill Feed : bandeau (texte + fond) qui glisse depuis la droite, 3 s au CTI.
Y.reg.add({
    id: "feed", name: "Kill Feed", needs: "comp", f: 14,
    run: function (c) {
        var comp = c.comp, base = Y.kit.freeName(comp, Y.PREFIX + "KillFeed"), T, tp, td, B, n, C = Y.kit.C, gi, i, grp, root;
        var bars = [["Fond", [0.055, 0.055, 0.06, 1], 0], ["Barre", [1, 0.2745, 0.3333, 1], 1]], ref = "thisComp.layer(\"" + Y.x.esc(base) + "\")";
        T = comp.layers.addText("YEXO  >  ENEMY");
        T.name = base;
        T.comment = "YexoFX";
        tp = T.property("ADBE Text Properties").property("ADBE Text Document");
        td = tp.value;
        td.fontSize = Math.round(comp.height * 0.022);
        td.applyFill = true;
        td.fillColor = [1, 1, 1];
        td.justification = ParagraphJustification.RIGHT_JUSTIFY;
        tp.setValue(td);
        T.inPoint = c.time;
        T.outPoint = Math.min(comp.duration, c.time + 3);
        T.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width * 0.9, comp.height * 0.18]);
        n = Y.kit.controls(T, base, c, [["slider", "dur", "Duree", c.frames], ["slider", "dist", "Distance", Math.round(comp.width * 0.5)], ["curve", "curve"]]);
        Y.x.set(T.property("ADBE Transform Group").property("ADBE Position"),
            Y.x.LIB_CURVE + "\n" +
            "var d = Math.max(1, " + C("", n.dur) + ") * thisComp.frameDuration, c1 = " + C("", n.curve.p1) + ", c2 = " + C("", n.curve.p2) + ";\n" +
            "var a = Math.min(yfxCurve(Math.max(0, Math.min(1, (time - inPoint) / d)), c1, c2), yfxCurve(Math.max(0, Math.min(1, (outPoint - time) / d)), c1, c2));\n" +
            "[value[0] + " + C("", n.dist) + " * (1 - a), value[1]];");
        B = comp.layers.addShape();
        B.name = base + "_Fond";
        B.comment = "YexoFX";
        B.inPoint = T.inPoint;
        B.outPoint = T.outPoint;
        B.moveAfter(T);
        B.parent = T;
        root = B.property("ADBE Root Vectors Group");
        for (i = 0; i < bars.length; i++) {
            gi = root.addProperty("ADBE Vector Group").propertyIndex;
            grp = B.property("ADBE Root Vectors Group").property(gi);
            grp.name = bars[i][0];
            grp.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
            B.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
            grp = B.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group");
            grp.property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(bars[i][1]);
            Y.x.set(grp.property("ADBE Vector Shape - Rect").property("ADBE Vector Rect Size"),
                "var r = " + ref + ".sourceRectAtTime(time, false);\n" + (bars[i][2] ? "[6, r.height + 24];" : "[r.width + 40, r.height + 24];"));
            Y.x.set(B.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group").property("ADBE Vector Shape - Rect").property("ADBE Vector Rect Position"),
                "var r = " + ref + ".sourceRectAtTime(time, false);\n" + (bars[i][2] ? "[r.left + r.width + 23, r.top + r.height / 2];" : "[r.left + r.width / 2, r.top + r.height / 2];"));
        }
        return "Kill Feed pos\u00e9 \u00e0 " + Y.u.tc(c.time, comp) + " \u00b7 double-clique le texte " + base + " pour l'\u00e9diter";
    }
});
// ---- src/31_styles.jsx ----
// =====================================================================
// STYLES DE TEXTE : document texte (police, couleur, contour) + effets natifs (Drop Shadow,
// Gradient Ramp). Polices : la meilleure install\u00e9e dans une liste (app.fonts, AE 2024+).
// =====================================================================
Y.style = {};

// PostScript de la premi\u00e8re police install\u00e9e parmi cands = [[famille, style], ...], ou null.
Y.style.font = function (cands) {
    var i, r;
    try {
        if (!app.fonts || !app.fonts.getFontsByFamilyNameAndStyleName) { return null; }
        for (i = 0; i < cands.length; i++) {
            r = app.fonts.getFontsByFamilyNameAndStyleName(cands[i][0], cands[i][1]);
            if (r && r.length) { return r[0].postScriptName; }
        }
    } catch (e) {}
    return null;
};

Y.style.doc = function (L, fn) {
    var tp = L.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
    fn(td);
    tp.setValue(td);
};

// Ombre port\u00e9e nomm\u00e9e. o = { color, opacity, dir, dist, soft, distExpr }
Y.style.shadow = function (L, name, o) {
    var sh = Y.fxe.add(L, Y.FX.shadow, /drop shadow/i, name);
    Y.fxe.set(L, sh, Y.FX.shColor, o.color);
    Y.fxe.set(L, sh, Y.FX.shOpacity, Math.round((o.opacity === undefined ? 1 : o.opacity) * 255));
    Y.fxe.set(L, sh, Y.FX.shDir, o.dir || 0);
    Y.fxe.set(L, sh, Y.FX.shDist, o.dist || 0);
    Y.fxe.set(L, sh, Y.FX.shSoft, o.soft || 0);
    if (o.distExpr) { Y.fxe.expr(L, sh, Y.FX.shDist, o.distExpr); }
    return sh;
};

Y.style.preset = function (id, name, apply) {
    Y.reg.add({
        id: id, name: name, needs: "text",
        run: function (c) {
            var i, base = Y.PREFIX + name.replace(/[^A-Za-z0-9]/g, ""), font = null;
            for (i = 0; i < c.layers.length; i++) { font = apply(c.layers[i], c, base) || font; }
            return "Style " + name + " sur " + c.layers.length + " calque(s) texte" + (font ? " \u00b7 police " + font : "");
        }
    });
};

Y.style.preset("val", "Valorant", function (L, c, base) {
    var font = Y.style.font([["Tungsten", "Bold"], ["Bebas Neue", "Regular"], ["Anton", "Regular"], ["Oswald", "Bold"], ["Impact", "Regular"]]);
    Y.style.doc(L, function (td) {
        if (font) { try { td.font = font; } catch (e) {} }
        td.applyFill = true;
        td.fillColor = [1, 0.2745, 0.3333];
        td.applyStroke = true;
        td.strokeColor = [1, 1, 1];
        td.strokeWidth = Math.max(1, Math.round(4 * c.intensity));
        td.strokeOverFill = false;
        try { td.allCaps = true; } catch (e2) {}
    });
    Y.style.shadow(L, base + "_Ombre", { color: [0, 0, 0, 1], dir: 135, dist: Math.round(8 * c.intensity), soft: 0 });
    return font;
});

Y.style.preset("cs2", "CS2", function (L, c, base) {
    var font = Y.style.font([["Stratum2", "Bold"], ["Rajdhani", "Bold"], ["Teko", "SemiBold"], ["Barlow Condensed", "Bold"], ["Arial", "Bold"]]);
    Y.style.doc(L, function (td) {
        if (font) { try { td.font = font; } catch (e) {} }
        td.applyFill = true;
        td.fillColor = [0.949, 0.663, 0.231];
        try { td.fauxItalic = true; td.allCaps = true; } catch (e2) {}
    });
    Y.style.shadow(L, base + "_Ombre", { color: [0.16, 0.16, 0.16, 1], dir: 135, dist: Math.round(5 * c.intensity), soft: 0 });
    return font;
});

Y.style.preset("neon", "Neon", function (L, c, base) {
    Y.style.doc(L, function (td) { td.applyFill = true; td.fillColor = [0.957, 0.941, 1]; });
    Y.style.shadow(L, base + "_Halo", { color: [0.78, 0.75, 1, 1], dir: 0, dist: 0, soft: Math.round(18 * c.intensity) });
    Y.style.shadow(L, base + "_Halo2", { color: [0.557, 0.498, 1, 1], dir: 0, dist: 0, soft: Math.round(60 * c.intensity) });
    Y.x.set(L.property("ADBE Transform Group").property("ADBE Opacity"),
        "seedRandom(Math.floor(time * 12), true);\n(random() < 0.06) ? value * random(0.45, 0.8) : value;");
});

// Double contour : contour noir (texte) + contour lavande (4 ombres dures).
Y.style.preset("double", "Double contour", function (L, c, base) {
    var w = Math.max(1, Math.round(4 * c.intensity)), dirs = [0, 90, 180, 270], i;
    Y.style.doc(L, function (td) {
        td.applyStroke = true;
        td.strokeColor = [0, 0, 0];
        td.strokeWidth = w + 2;
        td.strokeOverFill = false;
    });
    for (i = 0; i < dirs.length; i++) {
        Y.style.shadow(L, base + "_Contour" + (i + 1), { color: [0.78, 0.75, 1, 1], dir: dirs[i], dist: w, soft: 0 });
    }
});

// Gradient : Gradient Ramp cal\u00e9 sur la bo\u00eete du texte, couleurs dans Effect Controls.
Y.style.preset("grad", "Gradient", function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["color", "a", "CouleurA", [0.78, 0.75, 1]],
        ["color", "b", "CouleurB", [1, 0.2745, 0.3333]],
        ["slider", "speed", "Vitesse", 0.4]
    ]), gr = Y.fxe.add(L, ["ADBE Ramp"], /gradient ramp/i, base + "_Degrade");
    Y.fxe.expr(L, gr, ["ADBE Ramp-0001", "Start of Ramp"], "var r = sourceRectAtTime(time, false), s = (time * " + C("", n.speed) + ") % 1;\n[r.left - r.width * s, r.top + r.height / 2];");
    Y.fxe.expr(L, gr, ["ADBE Ramp-0003", "End of Ramp"], "var r = sourceRectAtTime(time, false), s = (time * " + C("", n.speed) + ") % 1;\n[r.left + r.width * (1 - s), r.top + r.height / 2];");
    Y.fxe.expr(L, gr, ["ADBE Ramp-0002", "Start Color"], C("", n.a) + ";");
    Y.fxe.expr(L, gr, ["ADBE Ramp-0004", "End Color"], C("", n.b) + ";");
});

// Glitch fig\u00e9 : \u00e9cart rouge / cyan permanent avec des sauts ponctuels.
Y.style.preset("glitchs", "Glitch", function (L, c, base) {
    var dist = Math.max(1, Math.round(3 * c.intensity)), jump = "seedRandom(Math.floor(time * 12), true);\n(random() < 0.15) ? value * random(2, 4) : value;";
    Y.style.shadow(L, base + "_Rouge", { color: [1, 0.2745, 0.3333, 1], dir: 270, dist: dist, soft: 0, distExpr: jump });
    Y.style.shadow(L, base + "_Cyan", { color: [0.27, 0.88, 1, 1], dir: 90, dist: dist, soft: 0, distExpr: jump });
});
// ---- src/35_kit.jsx ----
// =====================================================================
// KIT : briques communes aux presets
//   Y.fxe  : ajout d'effets natifs (matchName, sinon recherche par nom) et acc\u00e8s \u00e0 leurs param\u00e8tres
//   Y.kit  : contr\u00f4les, enveloppes d'expression (markers / fen\u00eatre de transition), cibles
//   Y.rgb  : \u00e9cart RGB natif (2 calques d'ajustement rouge / bleu en mode \u00c9claircir)
// =====================================================================

Y.fxe = {};

// Ajoute le premier effet disponible parmi mns (sinon recherche par nom affich\u00e9). Renvoie son nom r\u00e9el.
Y.fxe.add = function (L, mns, re, name) {
    var i, mn = null, found;
    for (i = 0; i < mns.length; i++) {
        if (Y.fx.has(mns[i])) { mn = mns[i]; break; }
    }
    if (!mn && re) {
        found = Y.fx.search(re);
        if (found.length) { mn = found[0].match; }
    }
    if (!mn) { Y.fail("Effet natif introuvable dans ton AE : " + mns[0] + ". Lance R\u00e9glages > Liste des effets et envoie-la moi."); }
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

// Param\u00e8tres d'effets natifs : matchName, puis nom anglais.
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

// R\u00e9f\u00e9rence \u00e0 la valeur d'un contr\u00f4le : sur ce calque (src = "") ou sur un autre (src = 'thisComp.layer("X").').
Y.kit.C = function (src, name) {
    return (src || "") + "effect(\"" + Y.x.esc(name) + "\")(1)";
};
Y.kit.layerRef = function (name) {
    return "thisComp.layer(\"" + Y.x.esc(name) + "\").";
};

// Contr\u00f4les d'un preset. defs : [type, cl\u00e9, libell\u00e9, valeur, items] ; ["curve", cl\u00e9] = Courbe P1/P2.
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
// que les markers pos\u00e9s par YexoFX pour ce preset).
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

// Code d'expression : enveloppe apr\u00e8s le dernier marker du calque source (src) ;
// tag = ne suivre que les markers de ce commentaire (calque qui n'est pas un calque YFX).
// D\u00e9finit mk (marker ou null), d (dur\u00e9e en s), tt (s depuis le marker), e (1 -> 0 selon la courbe),
// ep (e born\u00e9 \u00e0 0..1), fr (n\u00b0 d'image depuis le marker).
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

// Code d'expression : fen\u00eatre de transition (le calque dure exactement la transition).
// D\u00e9finit p (0..1), half (0 avant la coupe, 1 apr\u00e8s), q (progression dans la moiti\u00e9),
// outE (acc\u00e9l\u00e8re vers la coupe), inE (freine apr\u00e8s la coupe), bell (0 -> 1 \u00e0 la coupe -> 0).
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

// S\u00e9pare la s\u00e9lection : calques audio seuls (leurs markers = d\u00e9clencheurs, ex. beats) et calques visuels (cibles).
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
//  - calques visuels s\u00e9lectionn\u00e9s : effets pos\u00e9s dessus (ou marker ajout\u00e9 s'ils sont d\u00e9j\u00e0 \u00e9quip\u00e9s) ;
//  - sinon : calque d'ajustement YFX_<Nom> cr\u00e9\u00e9 (ou r\u00e9utilis\u00e9 : marker ajout\u00e9).
// Impacts (markerDriven) : un marker au CTI, ou un marker par marker des calques audio s\u00e9lectionn\u00e9s (beats).
// install(L) pose effets + contr\u00f4les sur un calque neuf.
Y.kit.apply = function (c, layerName, markerDriven, install) {
    var s = Y.kit.split(c.layers), times, i, j, L, done = 0, reused = 0, existing, what;
    times = (markerDriven && s.triggers.length) ? s.triggers : [c.time];
    what = times.length > 1 ? times.length + " impacts (markers de " + s.audioNames.join(", ") + ")"
                            : "impact \u00e0 " + Y.u.tc(times[0], c.comp);
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
        return (done ? done + " calque(s) \u00e9quip\u00e9(s)" : "") + (done && reused ? ", " : "") +
               (reused ? "d\u00e9j\u00e0 \u00e9quip\u00e9(s) : marker ajout\u00e9" : "") + (markerDriven ? " \u00b7 " + what : "");
    }
    existing = Y.l.findByName(c.comp, layerName);
    if (existing && markerDriven) {
        if (existing.locked) { Y.fail(Y.MSG.locked(existing)); }
        for (j = 0; j < times.length; j++) { Y.m.add(existing, times[j], layerName); }
        return what + " ajout\u00e9(s) sur " + layerName + " (" + Y.m.prop(existing).numKeys + " au total)";
    }
    if (existing && !markerDriven) {
        existing.selected = true;
        return layerName + " existe d\u00e9j\u00e0 dans la comp : il est s\u00e9lectionn\u00e9, r\u00e8gle-le dans Effect Controls.";
    }
    L = Y.l.addSolid(c.comp, layerName, [1, 1, 1], "adj", { adjustment: true });
    install(L);
    if (markerDriven) {
        for (j = 0; j < times.length; j++) { Y.m.add(L, times[j], layerName); }
        return "Calque " + layerName + " cr\u00e9\u00e9 \u00b7 " + what + " \u00b7 recliquer ajoute un impact au CTI";
    }
    return "Calque " + layerName + " cr\u00e9\u00e9 sur toute la comp";
};

// Fen\u00eatre de transition : dur\u00e9e c.frames centr\u00e9e sur la coupe (2 calques s\u00e9lectionn\u00e9s : d\u00e9but du plan
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
// RGB NATIF : deux calques d'ajustement (rouge seul / bleu seul via Channel Mixer), d\u00e9cal\u00e9s
// horizontalement et fusionn\u00e9s en mode \u00c9claircir. offCode doit d\u00e9finir la variable "off" (pixels).
// place : { after: calque } (sous le ma\u00eetre) ou { before: calque } (au-dessus d'un clip).
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
// ---- src/40_shake.jsx ----
// =====================================================================
// SHAKE
// Effet Transform (pas la transform du calque : tes keyframes restent intactes) pr\u00e9c\u00e9d\u00e9
// de Motion Tile (bords en miroir : pas de bords noirs). Le shutter angle du Transform
// donne le motion blur du shake sans activer le MB du calque.
// Shakes "impact" : d\u00e9clench\u00e9s par les markers (voir Y.kit.apply) ; enveloppe = Dur\u00e9e + Courbe.
// =====================================================================
Y.shake = {};

Y.shake.TR = {
    anchor: ["ADBE Geometry2-0001", "Anchor Point"],
    pos: ["ADBE Geometry2-0002", "Position"],
    uniform: ["ADBE Geometry2-0011", "Uniform Scale"],
    scale: ["ADBE Geometry2-0003", "Scale", "Scale Height"],
    scaleW: ["ADBE Geometry2-0004", "Scale Width"],
    rot: ["ADBE Geometry2-0007", "Rotation"],
    compShutter: ["ADBE Geometry2-0009", "Use Composition's Shutter Angle"],
    shutter: ["ADBE Geometry2-0010", "Shutter Angle"]
};
Y.shake.TILE = {
    outW: ["ADBE Tile-0004", "Output Width"],
    outH: ["ADBE Tile-0005", "Output Height"],
    mirror: ["ADBE Tile-0006", "Mirror Edges"]
};

// Motion Tile + Transform nomm\u00e9s base_Tile / base_Transform. Renvoie le nom du Transform.
Y.shake.addTransform = function (L, base, tilePercent, shutter) {
    var tn, trn;
    if (tilePercent) {
        tn = Y.p.addEffect(L, "ADBE Tile", base + "_Tile").name;
        Y.fxe.set(L, tn, Y.shake.TILE.outW, tilePercent);
        Y.fxe.set(L, tn, Y.shake.TILE.outH, tilePercent);
        Y.fxe.set(L, tn, Y.shake.TILE.mirror, 1);
    }
    trn = Y.p.addEffect(L, "ADBE Geometry2", base + "_Transform").name;
    Y.fxe.set(L, trn, Y.shake.TR.compShutter, 0);
    Y.fxe.set(L, trn, Y.shake.TR.shutter, shutter === undefined ? 180 : shutter);
    return trn;
};

Y.shake.trProp = function (L, trn, key) {
    return Y.fxe.p(L, trn, Y.shake.TR[key]);
};

// Expressions d'impact : secousse qui d\u00e9marre sur le dernier marker, enveloppe e (Dur\u00e9e + Courbe).
Y.shake.impactPosExpr = function (n, tag) {
    var C = Y.kit.C;
    return Y.kit.envCode(n, "", tag) +
        "var r = value;\n" +
        "if (tt < d) {\n" +
        "  var a = " + C("", n.amp) + ", f = " + C("", n.freq) + ", ax = Math.round(" + C("", n.axis) + ");\n" +
        "  seedRandom(mk.index, true);\n" +
        "  var px = random(0, 6.2832), py = random(0, 6.2832);\n" +
        "  var x = a * e * Math.sin(2 * Math.PI * f * tt + px);\n" +
        "  var y = a * e * Math.sin(2 * Math.PI * f * 1.17 * tt + py);\n" +
        "  if (ax == 2) { y = 0; }\n" +
        "  if (ax == 3) { x = 0; }\n" +
        "  r = [value[0] + x, value[1] + y];\n" +
        "}\n" +
        "r;";
};

Y.shake.impactRotExpr = function (n, tag) {
    var C = Y.kit.C;
    return Y.kit.envCode(n, "", tag) +
        "var r = value;\n" +
        "if (tt < d) {\n" +
        "  seedRandom(mk.index + 7, true);\n" +
        "  r = value + " + C("", n.rot) + " * e * Math.sin(2 * Math.PI * " + C("", n.freq) + " * 0.8 * tt + random(0, 6.2832));\n" +
        "}\n" +
        "r;";
};

// Pose un impact shake complet (contr\u00f4les + Motion Tile + Transform) sur L.
Y.shake.installImpact = function (L, base, c, opt, tag) {
    var n = Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "amp", "Amplitude", Y.u.round(opt.amp * c.intensity, 1)],
        ["slider", "rot", "Rotation", Y.u.round(opt.rot * c.intensity, 2)],
        ["slider", "freq", "Frequence", opt.freq],
        ["dropdown", "axis", "Axe", opt.axis, ["X et Y", "X seulement", "Y seulement"]],
        ["curve", "curve"]
    ]);
    n.tr = Y.shake.addTransform(L, base, 140);
    Y.x.set(Y.shake.trProp(L, n.tr, "pos"), Y.shake.impactPosExpr(n, tag));
    Y.x.set(Y.shake.trProp(L, n.tr, "rot"), Y.shake.impactRotExpr(n, tag));
    return n;
};

// Shake continu : wiggle (fr\u00e9quence, amplitude, rotation).
Y.shake.installWiggle = function (L, base, c, opt) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "freq", "Frequence", opt.freq],
        ["slider", "amp", "Amplitude", Y.u.round(opt.amp * c.intensity, 1)],
        ["slider", "rot", "Rotation", Y.u.round(opt.rot * c.intensity, 2)]
    ]);
    n.tr = Y.shake.addTransform(L, base, 130);
    Y.x.set(Y.shake.trProp(L, n.tr, "pos"), "wiggle(" + C("", n.freq) + ", " + C("", n.amp) + ");");
    Y.x.set(Y.shake.trProp(L, n.tr, "rot"), "wiggle(" + C("", n.freq) + " * 0.8, " + C("", n.rot) + ");");
    return n;
};

// Enregistre un preset "any" : base = "YFX_<Nom>" ; install(L, c, base, tag) pose les effets.
// tag = commentaire des markers \u00e0 suivre quand le calque n'est pas un calque YFX (null sinon).
Y.shake.preset = function (id, name, f, markerDriven, install) {
    Y.reg.add({
        id: id, name: name, needs: "any", f: f,
        run: function (c) {
            var base = Y.PREFIX + name.replace(/[^A-Za-z0-9]/g, "");
            return name + " : " + Y.kit.apply(c, base, markerDriven, function (L) {
                install(L, c, base, L.name === base ? null : base);
            });
        }
    });
};

Y.shake.preset("impact", "Impact", 12, true, function (L, c, base, tag) {
    Y.shake.installImpact(L, base, c, { amp: 28, rot: 2, freq: 11, axis: 1 }, tag);
});
Y.shake.preset("hor", "Horizontal", 10, true, function (L, c, base, tag) {
    Y.shake.installImpact(L, base, c, { amp: 34, rot: 0, freq: 11, axis: 2 }, tag);
});
Y.shake.preset("ver", "Vertical", 10, true, function (L, c, base, tag) {
    Y.shake.installImpact(L, base, c, { amp: 34, rot: 0, freq: 11, axis: 3 }, tag);
});

Y.shake.preset("smooth", "Smooth", 0, false, function (L, c, base) {
    Y.shake.installWiggle(L, base, c, { freq: 1.2, amp: 14, rot: 0.7 });
});
Y.shake.preset("hand", "Handheld", 0, false, function (L, c, base) {
    Y.shake.installWiggle(L, base, c, { freq: 4, amp: 6, rot: 0.3 });
});

// Twitchy : immobilit\u00e9, puis rafales de secousse (dans l'esprit du mode Twitchy de S_Shake).
Y.shake.preset("twitchy", "Twitchy", 0, false, function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "amp", "Amplitude", Y.u.round(18 * c.intensity, 1)],
        ["slider", "freq", "Frequence", 14],
        ["slider", "dens", "Rafales", 45],
        ["slider", "seg", "Rythme", 0.45]
    ]), tr = Y.shake.addTransform(L, base, 140);
    Y.x.set(Y.shake.trProp(L, tr, "pos"),
        "var seg = Math.max(0.1, " + C("", n.seg) + ");\n" +
        "var si = Math.floor(time / seg);\n" +
        "seedRandom(si, true);\n" +
        "var r = value;\n" +
        "if (random() < " + C("", n.dens) + " / 100) {\n" +
        "  var lt = time - si * seg, k = Math.max(0, 1 - lt / (seg * 0.6));\n" +
        "  var a = " + C("", n.amp) + ", f = " + C("", n.freq) + ";\n" +
        "  var px = random(0, 6.2832), py = random(0, 6.2832);\n" +
        "  r = [value[0] + a * k * Math.sin(2 * Math.PI * f * lt + px), value[1] + a * k * Math.sin(2 * Math.PI * f * 1.2 * lt + py)];\n" +
        "}\n" +
        "r;");
});

// Jumpy : sauts soudains s\u00e9par\u00e9s par une d\u00e9rive lente.
Y.shake.preset("jumpy", "Jumpy", 0, false, function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "amp", "Amplitude", Y.u.round(20 * c.intensity, 1)],
        ["slider", "seg", "Rythme", 0.7]
    ]), tr = Y.shake.addTransform(L, base, 140);
    Y.x.set(Y.shake.trProp(L, tr, "pos"),
        "var a = " + C("", n.amp) + ", seg = Math.max(0.1, " + C("", n.seg) + ");\n" +
        "var si = Math.floor(time / seg);\n" +
        "seedRandom(si + 50, true);\n" +
        "var k = Math.max(0, 1 - (time - si * seg) / (6 * thisComp.frameDuration));\n" +
        "var jx = random(-1, 1) * a * k, jy = random(-1, 1) * a * k;\n" +
        "var w = wiggle(0.6, a * 0.3);\n" +
        "[w[0] + jx, w[1] + jy];");
});

// Rumble : vibration continue qui monte puis redescend apr\u00e8s le marker (pour un riser, une ult).
Y.shake.preset("rumble", "Rumble", 40, true, function (L, c, base, tag) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "amp", "Amplitude", Y.u.round(7 * c.intensity, 1)],
        ["slider", "freq", "Frequence", 18],
        ["curve", "curve"]
    ]), tr = Y.shake.addTransform(L, base, 120);
    Y.x.set(Y.shake.trProp(L, tr, "pos"),
        Y.kit.envCode(n, "", tag) +
        "var r = value;\n" +
        "if (tt < d) {\n" +
        "  var env = Math.sin(Math.PI * tt / d);\n" +
        "  var w = wiggle(" + C("", n.freq) + ", " + C("", n.amp) + " * env);\n" +
        "  r = [value[0] + (w[0] - value[0]) * 0.4, w[1]];\n" +
        "}\n" +
        "r;");
});

// Roll : la cam\u00e9ra roule doucement de gauche \u00e0 droite.
Y.shake.preset("roll", "Roll", 0, false, function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "rot", "Rotation", Y.u.round(2.4 * c.intensity, 2)],
        ["slider", "freq", "Frequence", 0.3]
    ]), tr = Y.shake.addTransform(L, base, 125);
    Y.x.set(Y.shake.trProp(L, tr, "rot"), "value + " + C("", n.rot) + " * Math.sin(time * 2 * Math.PI * " + C("", n.freq) + ");");
});
// ---- src/41_fx.jsx ----
// =====================================================================
// FX / LOOK
// Effets continus pos\u00e9s sur un calque d'ajustement YFX_<Nom> (ou sur les calques s\u00e9lectionn\u00e9s),
// ou sur un calque d\u00e9di\u00e9 (grain, vignette, letterbox, light leak, flash).
// =====================================================================
Y.look = {};

// Flash blanc : un solide YFX_Flash dont l'opacit\u00e9 suit les markers. Recliquer ajoute un flash au CTI.
Y.reg.add({
    id: "flash", name: "Flash", needs: "comp", f: 4,
    run: function (c) {
        var name = Y.PREFIX + "Flash", L = Y.l.findByName(c.comp, name), X = Y.x.ctl, n = {};
        if (L) {
            if (L.locked) { Y.fail(Y.MSG.locked(L)); }
            Y.m.add(L, c.time, "flash");
            return "Flash ajout\u00e9 \u00e0 " + Y.u.tc(c.time, c.comp) + " sur " + name + " (" + Y.m.prop(L).numKeys + " au total)";
        }
        L = Y.l.addSolid(c.comp, name, [1, 1, 1], "white", {});
        n.dur = Y.ctl.add(L, "slider", name + "_Duree", c.frames).name;
        n.peak = Y.ctl.add(L, "slider", name + "_Opacite", Y.u.clamp(Math.round(85 * c.intensity), 5, 100)).name;
        n.curve = Y.ctl.addCurve(L, name, c.curve);
        Y.x.set(L.property("ADBE Transform Group").property("ADBE Opacity"),
            Y.x.LIB_CURVE + "\n" + Y.x.LIB_MARKER + "\n" +
            "var r = 0;\n" +
            "var m = yfxPrevMarker(thisLayer, time);\n" +
            "if (m) {\n" +
            "  var d = Math.max(1, " + X(n.dur) + ") * thisComp.frameDuration;\n" +
            "  var t = (time - m.time) / d;\n" +
            "  if (t < 1) { r = " + X(n.peak) + " * (1 - yfxCurve(t, " + X(n.curve.p1) + ", " + X(n.curve.p2) + ")); }\n" +
            "}\n" +
            "Math.max(0, Math.min(100, r));");
        Y.m.add(L, c.time, "flash");
        return "Calque " + name + " cr\u00e9\u00e9 \u00b7 flash \u00e0 " + Y.u.tc(c.time, c.comp) + " \u00b7 recliquer ajoute un flash au CTI";
    }
});

// Calque d\u00e9di\u00e9 (solide) : r\u00e9utilis\u00e9 s'il existe d\u00e9j\u00e0 (s\u00e9lectionn\u00e9), sinon cr\u00e9\u00e9 par make(L).
Y.look.solid = function (id, name, color, tag, make) {
    Y.reg.add({
        id: id, name: name, needs: "comp", f: 0,
        run: function (c) {
            var lname = Y.PREFIX + name.replace(/[^A-Za-z0-9]/g, ""), L = Y.l.findByName(c.comp, lname);
            if (L) {
                L.selected = true;
                return lname + " existe d\u00e9j\u00e0 dans la comp : il est s\u00e9lectionn\u00e9, r\u00e8gle-le dans Effect Controls.";
            }
            L = Y.l.addSolid(c.comp, lname, color, tag, {});
            make(L, c, lname);
            return "Calque " + lname + " cr\u00e9\u00e9 sur toute la comp \u00b7 r\u00e9glages dans Effect Controls";
        }
    });
};

Y.look.solid("grain", "Grain", [0.5, 0.5, 0.5], "gris", function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "amt", "Intensite", Math.round(35 * c.intensity)],
        ["slider", "size", "Taille", 22]
    ]), fn = Y.fxe.add(L, ["ADBE Fractal Noise"], /fractal noise/i, base + "_Noise");
    Y.fxe.set(L, fn, ["Contrast"], 160);
    Y.fxe.set(L, fn, ["Complexity"], 3);
    Y.fxe.expr(L, fn, ["Scale"], C("", n.size) + ";");
    Y.fxe.expr(L, fn, ["Evolution"], "time * 2400;");
    L.blendingMode = BlendingMode.OVERLAY;
    Y.x.set(L.property("ADBE Transform Group").property("ADBE Opacity"), C("", n.amt) + ";");
});

Y.look.solid("vig", "Vignette", [0, 0, 0], "noir", function (L, c, base) {
    var C = Y.kit.C, w = c.comp.width, h = c.comp.height, n, mk, mi, s = new Shape(), k = 0.5523, rx = w * 0.56, ry = h * 0.56, cx = w / 2, cy = h / 2;
    n = Y.kit.controls(L, base, c, [["slider", "amt", "Intensite", Math.round(65 * c.intensity)], ["slider", "soft", "Douceur", Math.round(w * 0.45)]]);
    s.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
    s.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
    s.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
    s.closed = true;
    mk = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    mi = mk.propertyIndex;
    L.property("ADBE Mask Parade").property(mi).property("ADBE Mask Shape").setValue(s);
    L.property("ADBE Mask Parade").property(mi).maskMode = MaskMode.SUBTRACT;
    Y.x.set(L.property("ADBE Mask Parade").property(mi).property("ADBE Mask Feather"), "[" + C("", n.soft) + ", " + C("", n.soft) + "];");
    Y.x.set(L.property("ADBE Transform Group").property("ADBE Opacity"), C("", n.amt) + ";");
});

Y.look.solid("leak", "Light leak", [0, 0, 0], "noir", function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [["slider", "amt", "Intensite", Math.round(70 * c.intensity)], ["slider", "speed", "Vitesse", 40]]);
    var fn = Y.fxe.add(L, ["ADBE Fractal Noise"], /fractal noise/i, base + "_Noise"), tt;
    Y.fxe.set(L, fn, ["Contrast"], 120);
    Y.fxe.set(L, fn, ["Brightness"], -25);
    Y.fxe.set(L, fn, ["Complexity"], 2);
    Y.fxe.set(L, fn, ["Scale"], 900);
    Y.fxe.expr(L, fn, ["Evolution"], "time * " + C("", n.speed) + ";");
    tt = Y.fxe.add(L, ["ADBE Tritone"], /tritone/i, base + "_Couleurs");
    Y.fxe.set(L, tt, ["Highlights"], [1, 0.94, 0.82, 1]);
    Y.fxe.set(L, tt, ["Midtones"], [1, 0.45, 0.16, 1]);
    Y.fxe.set(L, tt, ["Shadows"], [0, 0, 0, 1]);
    L.blendingMode = BlendingMode.SCREEN;
    Y.x.set(L.property("ADBE Transform Group").property("ADBE Opacity"), C("", n.amt) + ";");
});

// Letterbox : bandes noires qui entrent au d\u00e9but du calque et sortent \u00e0 la fin (calque de 3 s au CTI).
Y.reg.add({
    id: "letterbox", name: "Letterbox", needs: "comp", f: 14,
    run: function (c) {
        var C = Y.kit.C, lname = Y.kit.freeName(c.comp, Y.PREFIX + "Letterbox"), L = c.comp.layers.addShape(), n, root, i, gi, grp, bars = [["Haut", -1], ["Bas", 1]], rect;
        L.name = lname;
        L.comment = "YexoFX";
        L.inPoint = c.time;
        L.outPoint = Math.min(c.comp.duration, c.time + 3);
        n = Y.kit.controls(L, lname, c, [["slider", "dur", "Duree", c.frames], ["slider", "pct", "Bandes", Math.round(11 * c.intensity)], ["curve", "curve"]]);
        root = L.property("ADBE Root Vectors Group");
        for (i = 0; i < bars.length; i++) {
            gi = root.addProperty("ADBE Vector Group").propertyIndex;
            grp = L.property("ADBE Root Vectors Group").property(gi);
            grp.name = bars[i][0];
            grp.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
            L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
            grp = L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group");
            grp.property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([0, 0, 0, 1]);
            rect = grp.property("ADBE Vector Shape - Rect");
            var hc = Y.x.LIB_CURVE + "\n" +
                "var d = Math.max(1, " + C("", n.dur) + ") * thisComp.frameDuration;\n" +
                "var c1 = " + C("", n.curve.p1) + ", c2 = " + C("", n.curve.p2) + ";\n" +
                "var a = Math.min(yfxCurve(Math.max(0, Math.min(1, (time - thisLayer.inPoint) / d)), c1, c2), yfxCurve(Math.max(0, Math.min(1, (thisLayer.outPoint - time) / d)), c1, c2));\n" +
                "var bh = thisComp.height * " + C("", n.pct) + " / 100 * Math.max(0, a);\n";
            Y.x.set(rect.property("ADBE Vector Rect Size"), hc + "[thisComp.width + 4, bh];");
            Y.x.set(L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group").property("ADBE Vector Shape - Rect").property("ADBE Vector Rect Position"),
                hc + "[0, " + bars[i][1] + " * (thisComp.height / 2 - bh / 2)];");
        }
        return "Letterbox pos\u00e9 \u00e0 " + Y.u.tc(c.time, c.comp) + " pour 3 s \u00b7 rallonge le calque " + lname + " dans la timeline";
    }
});

// Effets d'ajustement continus (calque YFX_<Nom> ou calques s\u00e9lectionn\u00e9s).
Y.shake.preset("rgb", "RGB leger", 0, false, function (L, c, base) {
    var src = Y.kit.layerRef(L.name), n = Y.kit.controls(L, base, c, [
        ["slider", "off", "Decalage", Y.u.round(4 * c.intensity, 1)],
        ["slider", "breath", "Respiration", 0.35]
    ]);
    Y.rgb.ghosts(c.comp, base, L.inPoint, L.outPoint, L.adjustmentLayer ? { after: L } : { before: L },
        "var off = " + Y.kit.C(src, n.off) + " * (1 + " + Y.kit.C(src, n.breath) + " * Math.sin(time * 2.4));");
});

Y.shake.preset("glow", "Glow", 0, false, function (L, c, base) {
    var deep = Y.fx.search(/deep\s*glow/i), gl;
    if (deep.length) {
        Y.p.addEffect(L, deep[0].match, base + "_DeepGlow");
        return;
    }
    gl = Y.fxe.add(L, Y.FX.glow, /^glow$/i, base + "_Glow");
    Y.fxe.set(L, gl, Y.FX.glowThr, 60);
    Y.fxe.set(L, gl, Y.FX.glowRad, 50);
    Y.fxe.set(L, gl, Y.FX.glowInt, Y.u.round(0.8 * c.intensity, 2));
});

Y.shake.preset("vhs", "VHS", 0, false, function (L, c, base) {
    var nz = Y.fxe.add(L, ["ADBE Noise"], /^noise$/i, base + "_Bruit"), vb, ww;
    Y.fxe.set(L, nz, ["Amount of Noise"], Y.u.round(5 * c.intensity, 1));
    vb = Y.fxe.add(L, ["ADBE Venetian Blinds"], /venetian blinds/i, base + "_Lignes");
    Y.fxe.set(L, vb, ["Transition Completion"], 18);
    Y.fxe.set(L, vb, ["Width"], 4);
    ww = Y.fxe.add(L, Y.FX.wave, /wave warp/i, base + "_Tracking");
    Y.fxe.set(L, ww, Y.FX.waveType, 9);
    Y.fxe.set(L, ww, Y.FX.waveH, Y.u.round(3 * c.intensity, 1));
    Y.fxe.set(L, ww, Y.FX.waveW, 260);
    Y.fxe.set(L, ww, Y.FX.waveDir, 0);
    Y.fxe.set(L, ww, Y.FX.waveSpeed, 2);
});

Y.shake.preset("lens", "Lens", 0, false, function (L, c, base) {
    var op = Y.fxe.add(L, Y.FX.optics, /optics compensation/i, base + "_Lens");
    Y.fxe.set(L, op, Y.FX.fovRev, 1);
    Y.fxe.set(L, op, Y.FX.fov, Math.round(28 * c.intensity));
});

// \u00c9talonnages rapides (Lumetri Color, r\u00e9glages de base).
Y.look.grade = function (id, name, values) {
    Y.shake.preset(id, name, 0, false, function (L, c, base) {
        var lu = Y.fxe.add(L, ["ADBE Lumetri"], /lumetri color/i, base + "_Lumetri"), k;
        for (k in values) {
            if (values.hasOwnProperty(k)) { Y.fxe.set(L, lu, [k], Y.u.round(values[k](c.intensity), 1)); }
        }
    });
};
Y.look.grade("cold", "Froid", {
    Temperature: function (k) { return -28 * k; }, Tint: function (k) { return 4 * k; }, Contrast: function (k) { return 12 * k; }, Saturation: function (k) { return 100 + 6 * k; }
});
Y.look.grade("warm", "Chaud", {
    Temperature: function (k) { return 26 * k; }, Tint: function (k) { return 6 * k; }, Saturation: function (k) { return 100 + 10 * k; }
});
Y.look.grade("punchy", "Punchy", {
    Contrast: function (k) { return 40 * k; }, Saturation: function (k) { return 100 + 18 * k; }, Vibrance: function (k) { return 30 * k; }, Highlights: function (k) { return -15 * k; }
});
// ---- src/42_impacts.jsx ----
// =====================================================================
// IMPACTS : combos pos\u00e9s au CTI (ou sur chaque beat d'un calque audio s\u00e9lectionn\u00e9).
// M\u00eame m\u00e9canique que les shakes : calque d'ajustement YFX_<Nom> pilot\u00e9 par ses markers.
// =====================================================================
Y.imp = {};

// Flash d'exposition (IL) qui retombe en "frames" images apr\u00e8s chaque marker.
Y.imp.exposureFlash = function (L, base, c, stops, frames, tag) {
    var C = Y.kit.C, nf = Y.kit.controls(L, base, c, [
        ["slider", "flash", "Flash", Y.u.round(stops * c.intensity, 2)],
        ["slider", "fdur", "FlashDuree", frames]
    ]);
    var ex = Y.fxe.add(L, Y.FX.expo, /^exposure$/i, base + "_Exposure");
    Y.fxe.expr(L, ex, Y.FX.expoV,
        Y.x.LIB_MARKER + "\n" + Y.x.LIB_TAG + "\n" +
        "var r = value;\n" +
        "var mk = " + (tag ? "yfxPrevTag(thisLayer, time, \"" + Y.x.esc(tag) + "\")" : "yfxPrevMarker(thisLayer, time)") + ";\n" +
        "if (mk) {\n" +
        "  var fd2 = Math.max(1, " + C("", nf.fdur) + ") * thisComp.frameDuration, t2 = time - mk.time;\n" +
        "  if (t2 < fd2) { r = value + " + C("", nf.flash) + " * (1 - t2 / fd2); }\n" +
        "}\n" +
        "r;");
    return ex;
};

// \u00c9cart RGB qui suit l'enveloppe du calque ma\u00eetre L (2 calques d'ajustement sous / au-dessus de L).
Y.imp.rgb = function (c, L, base, n, px, tag) {
    var nr = Y.ctl.add(L, "slider", base + "_RGB", Y.u.round(px * c.intensity, 1)).name;
    var src = Y.kit.layerRef(L.name);
    var place = L.adjustmentLayer ? { after: L } : { before: L };
    Y.rgb.ghosts(c.comp, base, L.inPoint, L.outPoint, place, Y.kit.envCode(n, src, tag) + "var off = " + Y.kit.C(src, nr) + " * ep;");
};

// Zoom punch : scale 100 + Zoom \u00d7 enveloppe (la courbe Back donne un rebond).
Y.imp.punch = function (L, c, n, zoom, tag) {
    var nz = Y.ctl.add(L, "slider", n.base + "_Zoom", Y.u.round(zoom * c.intensity, 1)).name;
    Y.x.set(Y.shake.trProp(L, n.tr, "scale"), Y.kit.envCode(n, "", tag) + "value + " + Y.kit.C("", nz) + " * e;");
};

// Contr\u00f4les Dur\u00e9e + Courbe et Transform, sans secousse.
Y.imp.base = function (L, base, c) {
    var n = Y.kit.controls(L, base, c, [["slider", "dur", "Duree", c.frames], ["curve", "curve"]]);
    n.base = base;
    n.tr = Y.shake.addTransform(L, base, 140);
    return n;
};

Y.shake.preset("killhit", "Kill Hit", 8, true, function (L, c, base, tag) {
    var n = Y.shake.installImpact(L, base, c, { amp: 24, rot: 1.5, freq: 12, axis: 1 }, tag);
    Y.imp.exposureFlash(L, base, c, 1.5, 3, tag);
    Y.imp.rgb(c, L, base, n, 12, tag);
});

Y.shake.preset("shaketwitch", "Shake Twitch", 10, true, function (L, c, base, tag) {
    var C = Y.kit.C, n = Y.shake.installImpact(L, base, c, { amp: 22, rot: 1.2, freq: 12, axis: 1 }, tag);
    var nt = Y.ctl.add(L, "slider", base + "_Twitch", Y.u.round(14 * c.intensity, 1)).name;
    Y.x.set(Y.shake.trProp(L, n.tr, "scale"),
        Y.kit.envCode(n, "", tag) +
        "var r = value;\n" +
        "if (tt < d) {\n" +
        "  seedRandom(mk.index * 31 + fr, true);\n" +
        "  if (random() < 0.5) { r = value + random(-1, 1) * " + C("", nt) + " * ep; }\n" +
        "}\n" +
        "r;");
});

Y.shake.preset("rgbpunch", "RGB Punch", 8, true, function (L, c, base, tag) {
    var n = Y.imp.base(L, base, c);
    Y.imp.punch(L, c, n, 22, tag);
    Y.imp.rgb(c, L, base, n, 18, tag);
});

Y.shake.preset("hspop", "Headshot Pop", 10, true, function (L, c, base, tag) {
    var n = Y.imp.base(L, base, c), rb;
    Y.imp.punch(L, c, n, 40, tag);
    rb = Y.fxe.add(L, Y.FX.radial, /radial (fast )?blur/i, base + "_Blur");
    Y.fxe.expr(L, rb, Y.FX.radAmt, Y.kit.envCode(n, "", tag) + Math.round(60 * c.intensity) + " * ep;");
    Y.imp.exposureFlash(L, base, c, 1.2, 2, tag);
});

Y.shake.preset("bassdrop", "Bass Drop", 14, true, function (L, c, base, tag) {
    var n = Y.shake.installImpact(L, base, c, { amp: 42, rot: 0.8, freq: 9, axis: 3 }, tag);
    Y.imp.exposureFlash(L, base, c, 1.2, 4, tag);
    Y.imp.rgb(c, L, base, n, 10, tag);
});

// Flicker : trois flashs d'exposition tr\u00e8s courts (une image sur deux).
Y.shake.preset("flicker", "Flicker", 6, true, function (L, c, base, tag) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "peak", "Flash", Y.u.round(1.6 * c.intensity, 2)],
        ["curve", "curve"]
    ]), ex = Y.fxe.add(L, Y.FX.expo, /^exposure$/i, base + "_Exposure");
    Y.fxe.expr(L, ex, Y.FX.expoV, Y.kit.envCode(n, "", tag) + "(tt < d && fr % 2 == 0) ? value + " + C("", n.peak) + " : value;");
});

// Choppy Hit : cadence 12 i/s pendant l'impact + secousse.
Y.shake.preset("choppy", "Choppy Hit", 12, true, function (L, c, base, tag) {
    var n = Y.shake.installImpact(L, base, c, { amp: 16, rot: 1, freq: 10, axis: 1 }, tag);
    var nr = Y.ctl.add(L, "slider", base + "_Cadence", 12).name;
    var pt = Y.fxe.add(L, Y.FX.post, /posterize time/i, base + "_Posterize");
    Y.fxe.expr(L, pt, Y.FX.postRate, Y.kit.envCode(n, "", tag) + "(tt < d) ? " + Y.kit.C("", nr) + " : 1 / thisComp.frameDuration;");
});

// Glow Hit : les hautes lumi\u00e8res s'embrasent puis retombent.
Y.shake.preset("glowhit", "Glow Hit", 12, true, function (L, c, base, tag) {
    var n = Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "glow", "Glow", Y.u.round(2.2 * c.intensity, 2)],
        ["curve", "curve"]
    ]), gl = Y.fxe.add(L, Y.FX.glow, /^glow$/i, base + "_Glow");
    Y.fxe.set(L, gl, Y.FX.glowThr, 55);
    Y.fxe.set(L, gl, Y.FX.glowRad, 60);
    Y.fxe.expr(L, gl, Y.FX.glowInt, Y.kit.envCode(n, "", tag) + Y.kit.C("", n.glow) + " * ep;");
    Y.imp.exposureFlash(L, base, c, 0.6, 6, tag);
});

// Lens Punch : bomb\u00e9 fa\u00e7on fisheye + zoom.
Y.shake.preset("lenspunch", "Lens Punch", 10, true, function (L, c, base, tag) {
    var n = Y.imp.base(L, base, c), op;
    Y.imp.punch(L, c, n, 16, tag);
    op = Y.fxe.add(L, Y.FX.optics, /optics compensation/i, base + "_Lens");
    Y.fxe.set(L, op, Y.FX.fovRev, 1);
    Y.fxe.expr(L, op, Y.FX.fov, Y.kit.envCode(n, "", tag) + Math.round(45 * c.intensity) + " * ep;");
});
// ---- src/43_twitch.jsx ----
// =====================================================================
// TWITCH : sauts al\u00e9atoires image par image pendant l'impact (scale, gliss\u00e9 + RGB, lumi\u00e8re, flou),
// dans l'esprit du plugin Twitch, en natif. Tous les op\u00e9rateurs d'un m\u00eame preset partagent la
// m\u00eame graine (mk.index + n\u00b0 d'image) : les sauts sont synchronis\u00e9s.
// =====================================================================
Y.tw = {};

// Code qui d\u00e9finit v (-1..1 sur les images "allum\u00e9es", 0 sinon) pour l'op\u00e9rateur sel (sel = sel de graine).
Y.tw.pick = function (n, salt) {
    return "var v = 0;\n" +
        "if (tt < d) {\n" +
        "  seedRandom(mk.index * 131 + fr * 7 + " + salt + ", true);\n" +
        "  if (random() < " + Y.kit.C("", n.dens) + " / 100) { v = random(-1, 1); }\n" +
        "}\n";
};

Y.tw.controls = function (L, base, c, extra) {
    return Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "dens", "Densite", 55],
        ["curve", "curve"]
    ].concat(extra));
};

Y.tw.scale = function (L, n, tag) {
    Y.x.set(Y.shake.trProp(L, n.tr, "scale"), Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 1) + "value + " + Y.kit.C("", n.sc) + " * v * ep;");
    Y.x.set(Y.shake.trProp(L, n.tr, "anchor"), Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 1) +
        "seedRandom(mk ? mk.index * 17 + fr : 0, true);\n" +
        "(v != 0) ? [value[0] + random(-0.2, 0.2) * thisComp.width, value[1] + random(-0.2, 0.2) * thisComp.height] : value;");
};
Y.tw.slide = function (L, n, tag) {
    Y.x.set(Y.shake.trProp(L, n.tr, "pos"), Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 2) + "[value[0] + " + Y.kit.C("", n.sl) + " * v * ep, value[1]];");
};
Y.tw.light = function (L, base, n, tag) {
    var ex = Y.fxe.add(L, Y.FX.expo, /^exposure$/i, base + "_Exposure");
    Y.fxe.expr(L, ex, Y.FX.expoV, Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 3) + "value + " + Y.kit.C("", n.lt) + " * v * ep;");
};
Y.tw.blur = function (L, base, n, tag) {
    var bb = Y.fxe.add(L, Y.FX.boxBlur, /fast box blur/i, base + "_Blur");
    Y.fxe.expr(L, bb, Y.FX.boxR, Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 4) + Y.kit.C("", n.bl) + " * Math.abs(v) * ep;");
};
// RGB qui ne s'allume que sur les sauts du gliss\u00e9 (m\u00eame graine que Y.tw.slide).
Y.tw.slideRgb = function (c, L, base, n, tag) {
    var src = Y.kit.layerRef(L.name);
    var nr = Y.ctl.add(L, "slider", base + "_RGB", Y.u.round(10 * c.intensity, 1)).name;
    var place = L.adjustmentLayer ? { after: L } : { before: L };
    Y.rgb.ghosts(c.comp, base, L.inPoint, L.outPoint, place,
        Y.kit.envCode(n, src, tag) +
        "var v = 0;\n" +
        "if (tt < d) { seedRandom(mk.index * 131 + fr * 7 + 2, true); if (random() < " + Y.kit.C(src, n.dens) + " / 100) { v = random(-1, 1); } }\n" +
        "var off = " + Y.kit.C(src, nr) + " * Math.abs(v) * ep;");
};

Y.shake.preset("tw-scale", "Twitch Scale", 8, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [["slider", "sc", "Scale", Y.u.round(14 * c.intensity, 1)]]);
    n.tr = Y.shake.addTransform(L, base, 150);
    Y.tw.scale(L, n, tag);
});
Y.shake.preset("tw-slide", "Twitch Slide", 8, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [["slider", "sl", "Glisse", Y.u.round(40 * c.intensity, 1)]]);
    n.tr = Y.shake.addTransform(L, base, 150);
    Y.tw.slide(L, n, tag);
    Y.tw.slideRgb(c, L, base, n, tag);
});
Y.shake.preset("tw-light", "Twitch Light", 8, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [["slider", "lt", "Lumiere", Y.u.round(1.4 * c.intensity, 2)]]);
    Y.tw.light(L, base, n, tag);
});
Y.shake.preset("tw-blur", "Twitch Blur", 8, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [["slider", "bl", "Flou", Y.u.round(14 * c.intensity, 1)]]);
    Y.tw.blur(L, base, n, tag);
});
Y.shake.preset("tw-full", "Twitch Full", 10, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [
        ["slider", "sc", "Scale", Y.u.round(12 * c.intensity, 1)],
        ["slider", "sl", "Glisse", Y.u.round(30 * c.intensity, 1)],
        ["slider", "lt", "Lumiere", Y.u.round(1.1 * c.intensity, 2)]
    ]);
    n.tr = Y.shake.addTransform(L, base, 150);
    Y.tw.scale(L, n, tag);
    Y.tw.slide(L, n, tag);
    Y.tw.light(L, base, n, tag);
    Y.tw.slideRgb(c, L, base, n, tag);
});
// ---- src/44_trans.jsx ----
// =====================================================================
// TRANSITIONS : un calque d'ajustement court, centr\u00e9 sur la coupe (2 calques s\u00e9lectionn\u00e9s :
// d\u00e9but du plan entrant ; sinon : CTI). Sa longueur = la dur\u00e9e de la transition : raccourcis-le
// ou rallonge-le dans la timeline. Courbe : acc\u00e9l\u00e8re vers la coupe, freine apr\u00e8s.
// =====================================================================
Y.trans = {};

// Cr\u00e9e le calque de transition et ses contr\u00f4les communs. Renvoie { L, n, w }.
Y.trans.layer = function (c, name, defs) {
    var w = Y.kit.transWindow(c), lname = Y.kit.freeName(c.comp, Y.PREFIX + name), L, n;
    L = Y.l.addSolid(c.comp, lname, [1, 1, 1], "adj", { adjustment: true, inPoint: w.inT, outPoint: w.outT });
    n = Y.kit.controls(L, lname, c, [["curve", "curve"]].concat(defs || []));
    return { L: L, n: n, w: w, base: lname };
};

Y.trans.preset = function (id, name, f, build) {
    Y.reg.add({
        id: id, name: name, needs: "comp", f: f,
        run: function (c) {
            var t = Y.trans.layer(c, name.replace(/[^A-Za-z0-9]/g, ""), build.defs ? build.defs(c) : []);
            build.run(t, c);
            return name + " pos\u00e9e sur la coupe (" + Y.u.tc(t.w.t, c.comp) + ") \u00b7 " + c.frames + " f \u00b7 calque " + t.L.name;
        }
    });
};

var TB = Y.kit.bellCode, TC = Y.kit.C;

Y.trans.preset("zoom", "Zoom in", 12, {
    defs: function (c) { return [["slider", "amt", "Zoom", Math.round(80 * c.intensity)], ["slider", "blur", "Flou", Math.round(70 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 200, 270), rb;
        Y.x.set(Y.shake.trProp(t.L, tr, "scale"), TB(t.n) + "var z = " + TC("", t.n.amt) + ";\nhalf ? 100 - z * 0.5 * (1 - inE) : 100 + z * outE;");
        rb = Y.fxe.add(t.L, Y.FX.radial, /radial (fast )?blur/i, t.base + "_Blur");
        Y.fxe.expr(t.L, rb, Y.FX.radAmt, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("zoomout", "Zoom out", 12, {
    defs: function (c) { return [["slider", "amt", "Zoom", Math.round(45 * c.intensity)], ["slider", "blur", "Flou", Math.round(60 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 300, 270), rb;
        Y.x.set(Y.shake.trProp(t.L, tr, "scale"), TB(t.n) + "var z = " + TC("", t.n.amt) + ";\nhalf ? 100 + z * 1.5 * (1 - inE) : 100 - z * outE;");
        rb = Y.fxe.add(t.L, Y.FX.radial, /radial (fast )?blur/i, t.base + "_Blur");
        Y.fxe.expr(t.L, rb, Y.FX.radAmt, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("whip", "Whip pan", 10, {
    defs: function (c) { return [["slider", "dist", "Distance", Math.round(110 * c.intensity)], ["slider", "blur", "Flou", Math.round(160 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 300, 360), db;
        Y.x.set(Y.shake.trProp(t.L, tr, "pos"), TB(t.n) + "var w = thisComp.width * " + TC("", t.n.dist) + " / 100;\n[value[0] + (half ? w * (1 - inE) : -w * outE), value[1]];");
        db = Y.fxe.add(t.L, Y.FX.dirBlur, /directional blur/i, t.base + "_Blur");
        Y.fxe.set(t.L, db, Y.FX.dirAngle, 90);
        Y.fxe.expr(t.L, db, Y.FX.dirLen, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("spin", "Spin", 12, {
    defs: function (c) { return [["slider", "rot", "Rotation", 150], ["slider", "zoom", "Zoom", Math.round(40 * c.intensity)], ["slider", "blur", "Flou", Math.round(30 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 300, 360), sb;
        Y.x.set(Y.shake.trProp(t.L, tr, "rot"), TB(t.n) + "var a = " + TC("", t.n.rot) + ";\nhalf ? -a * (1 - inE) : a * outE;");
        Y.x.set(Y.shake.trProp(t.L, tr, "scale"), TB(t.n) + "100 + " + TC("", t.n.zoom) + " * bell;");
        sb = Y.fxe.add(t.L, Y.FX.spin, /^radial blur$/i, t.base + "_Blur");
        Y.fxe.set(t.L, sb, Y.FX.spinType, 1);
        Y.fxe.expr(t.L, sb, Y.FX.spinAmt, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("rgbshake", "RGB Shake", 12, {
    defs: function (c) { return [["slider", "amp", "Amplitude", Math.round(90 * c.intensity)], ["slider", "rgb", "RGB", Math.round(16 * c.intensity)]]; },
    run: function (t, c) {
        var tr = Y.shake.addTransform(t.L, t.base, 160, 180), src = Y.kit.layerRef(t.L.name);
        Y.x.set(Y.shake.trProp(t.L, tr, "pos"), TB(t.n) + "[value[0], value[1] + " + TC("", t.n.amp) + " * bell * Math.sin(p * 6 * Math.PI)];");
        Y.rgb.ghosts(c.comp, t.base, t.w.inT, t.w.outT, { after: t.L },
            Y.x.LIB_CURVE + "\nvar M = " + src.substr(0, src.length - 1) + ";\n" +
            "var span = Math.max(thisComp.frameDuration, M.outPoint - M.inPoint);\n" +
            "var p = Math.max(0, Math.min(1, (time - M.inPoint) / span));\n" +
            "var bell = yfxCurve(1 - Math.abs(2 * p - 1), " + TC(src, t.n.curve.p1) + ", " + TC(src, t.n.curve.p2) + ");\n" +
            "var off = " + TC(src, t.n.rgb) + " * bell;");
    }
});
Y.trans.preset("whiteglitch", "White Glitch", 8, {
    defs: function (c) { return [["slider", "amp", "Glitch", Math.round(70 * c.intensity)], ["slider", "flash", "Flash", Y.u.round(2.5 * c.intensity, 2)]]; },
    run: function (t) {
        var ww = Y.fxe.add(t.L, Y.FX.wave, /wave warp/i, t.base + "_Tranches"), ex;
        Y.fxe.set(t.L, ww, Y.FX.waveType, 8);
        Y.fxe.set(t.L, ww, Y.FX.waveDir, 0);
        Y.fxe.set(t.L, ww, Y.FX.waveSpeed, 0);
        Y.fxe.expr(t.L, ww, Y.FX.waveH, TB(t.n) + TC("", t.n.amp) + " * bell;");
        Y.fxe.expr(t.L, ww, Y.FX.waveW, "seedRandom(Math.floor(time / thisComp.frameDuration), true);\nrandom(30, 160);");
        Y.fxe.expr(t.L, ww, Y.FX.wavePhase, "seedRandom(Math.floor(time / thisComp.frameDuration) + 9, true);\nrandom(0, 360);");
        ex = Y.fxe.add(t.L, Y.FX.expo, /^exposure$/i, t.base + "_Exposure");
        Y.fxe.expr(t.L, ex, Y.FX.expoV, TB(t.n) + "value + " + TC("", t.n.flash) + " * Math.pow(bell, 3);");
    }
});
Y.trans.preset("stretch", "Stretch", 10, {
    defs: function (c) { return [["slider", "amt", "Etirement", Math.round(200 * c.intensity)], ["slider", "blur", "Flou", Math.round(120 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 200, 270), db;
        Y.fxe.set(t.L, tr, Y.shake.TR.uniform, 0);
        Y.x.set(Y.shake.trProp(t.L, tr, "scaleW"), TB(t.n) + "100 + " + TC("", t.n.amt) + " * bell;");
        db = Y.fxe.add(t.L, Y.FX.dirBlur, /directional blur/i, t.base + "_Blur");
        Y.fxe.set(t.L, db, Y.FX.dirAngle, 90);
        Y.fxe.expr(t.L, db, Y.FX.dirLen, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("tflash", "Flash", 6, {
    defs: function (c) { return [["slider", "flash", "Flash", Y.u.round(3 * c.intensity, 2)]]; },
    run: function (t) {
        var ex = Y.fxe.add(t.L, Y.FX.expo, /^exposure$/i, t.base + "_Exposure");
        Y.fxe.expr(t.L, ex, Y.FX.expoV, TB(t.n) + "value + " + TC("", t.n.flash) + " * bell;");
    }
});

// Pop-in : le plan entrant surgit depuis le centre (effet Transform pos\u00e9 sur le plan entrant).
Y.reg.add({
    id: "popin", name: "Pop-in", needs: "two", f: 10,
    run: function (c) {
        var a = c.layers[0], b = c.layers[1], B, base = Y.PREFIX + "PopIn", n, tr;
        B = (b.inPoint >= a.inPoint) ? b : a;
        n = Y.kit.controls(B, base, c, [["slider", "dur", "Duree", c.frames], ["slider", "from", "Depart", 20], ["curve", "curve"]]);
        tr = Y.shake.addTransform(B, base, 0, 180);
        Y.x.set(Y.shake.trProp(B, tr, "scale"),
            Y.x.LIB_CURVE + "\n" +
            "var d = Math.max(1, " + TC("", n.dur) + ") * thisComp.frameDuration;\n" +
            "var t = (time - thisLayer.inPoint) / d, s0 = " + TC("", n.from) + ";\n" +
            "(t < 1) ? s0 + (100 - s0) * yfxCurve(t, " + TC("", n.curve.p1) + ", " + TC("", n.curve.p2) + ") : 100;");
        return "Pop-in sur " + B.name + " \u00b7 " + c.frames + " f \u00b7 r\u00e9glages " + base + "_*";
    }
});
// ---- src/50_timing.jsx ----
// =====================================================================
// VITESSE & RYTHME
// Time Remapping pilot\u00e9 par expression : chaque preset pose un marker (commentaire = nom du preset)
// sur le clip et ses r\u00e9glages dans Effect Controls. Une seule expression de Time Remapping combine
// tous les presets de vitesse du clip : d\u00e9place un marker pour d\u00e9placer l'effet.
// =====================================================================
Y.speed = {};
Y.speed.BASE = {
    velocity: "YFX_Velocity", slowkill: "YFX_SlowKill", speedup: "YFX_SpeedUp", freeze: "YFX_Freeze",
    rewind: "YFX_Rewind", twtime: "YFX_TwitchTime", freezehit: "YFX_FreezeHit"
};

Y.speed.clips = function (c) {
    var r = [], i;
    for (i = 0; i < c.layers.length; i++) {
        if (c.layers[i].canSetTimeRemapEnabled) { r.push(c.layers[i]); }
    }
    if (!r.length) { Y.fail("S\u00e9lectionne le clip (footage ou pr\u00e9comp) : ce preset utilise le Time Remapping."); }
    return r;
};

Y.speed.has = function (L, type, key) {
    return !!Y.p.findEffect(L, Y.speed.BASE[type] + "_" + key);
};

// Expression unique de Time Remapping (seuls les presets pr\u00e9sents sur le clip sont inclus).
Y.speed.expr = function (L) {
    var B = Y.speed.BASE, C = function (b, k) { return Y.kit.C("", b + "_" + k); }, s = "";
    if (Y.speed.has(L, "velocity", "Duree")) {
        s += "  if (cm == \"" + B.velocity + "\") {\n" +
             "    var D = Math.max(1, " + C(B.velocity, "Duree") + ") * fd, fa = " + C(B.velocity, "Rapide") + " / 100, sl = " + C(B.velocity, "Lent") + " / 100;\n" +
             "    var p1 = " + C(B.velocity, "CourbeP1") + ", p2 = " + C(B.velocity, "CourbeP2") + ";\n" +
             "    var tB = Math.min(time, t0 + D);\n" +
             "    for (var tf = t0 - D; tf < tB; tf += fd) {\n" +
             "      var u = Math.min(1, Math.abs(tf + fd / 2 - t0) / D);\n" +
             "      var sp = sl + (fa - sl) * yfxCurve(u, p1, p2);\n" +
             "      if (u > 0.85) { sp = sp + (1 - sp) * (u - 0.85) / 0.15; }\n" +
             "      src += (sp - 1) * Math.min(fd, tB - tf);\n" +
             "    }\n" +
             "  }\n";
    }
    if (Y.speed.has(L, "slowkill", "Vitesse")) {
        s += "  if (cm == \"" + B.slowkill + "\" && time > t0) { src += (" + C(B.slowkill, "Vitesse") + " / 100 - 1) * (time - t0); }\n";
    }
    if (Y.speed.has(L, "speedup", "Vitesse")) {
        s += "  if (cm == \"" + B.speedup + "\" && time > t0) { src += (" + C(B.speedup, "Vitesse") + " / 100 - 1) * (time - t0); }\n";
    }
    if (Y.speed.has(L, "freeze", "Duree")) {
        s += "  if (cm == \"" + B.freeze + "\" && time > t0) { src -= Math.min(Math.max(1, " + C(B.freeze, "Duree") + ") * fd, time - t0); }\n";
    }
    if (Y.speed.has(L, "freezehit", "Duree")) {
        s += "  if (cm == \"" + B.freezehit + "\" && time > t0) { src -= Math.min(Math.max(1, " + C(B.freezehit, "Duree") + ") * fd, time - t0); }\n";
    }
    if (Y.speed.has(L, "rewind", "Duree")) {
        s += "  if (cm == \"" + B.rewind + "\" && time > t0) {\n" +
             "    var ov = Math.min(Math.max(1, " + C(B.rewind, "Duree") + ") * fd, time - t0);\n" +
             "    src += (-" + C(B.rewind, "Vitesse") + " / 100 - 1) * ov;\n" +
             "  }\n";
    }
    if (Y.speed.has(L, "twtime", "Duree")) {
        s += "  if (cm == \"" + B.twtime + "\" && time >= t0 && time < t0 + Math.max(1, " + C(B.twtime, "Duree") + ") * fd) {\n" +
             "    seedRandom(i * 131 + Math.floor((time - t0) / fd + 0.001), true);\n" +
             "    if (random() < " + C(B.twtime, "Densite") + " / 100) { src += Math.round(random(-1, 1) * " + C(B.twtime, "Saut") + ") * fd; }\n" +
             "  }\n";
    }
    return Y.x.LIB_CURVE + "\n" +
        "var fd = thisComp.frameDuration;\n" +
        "var src = value;\n" +
        "var mm = thisLayer.marker;\n" +
        "for (var i = 1; i <= mm.numKeys; i++) {\n" +
        "  var k = mm.key(i), t0 = k.time, cm = k.comment;\n" +
        s +
        "}\n" +
        "Math.max(0, Math.min(thisLayer.source.duration - fd, src));";
};

// Active le Time Remapping (+ Pixel Motion), pose les r\u00e9glages au premier passage, le marker,
// puis r\u00e9\u00e9crit l'expression combin\u00e9e.
Y.speed.applyTo = function (L, c, type, defs, extra) {
    var base = Y.speed.BASE[type];
    if (!Y.p.findEffect(L, base + "_" + defs[0][2])) {
        Y.kit.controls(L, base, c, defs);
        if (extra) { extra(L, base); }
    }
    if (!L.timeRemapEnabled) { L.timeRemapEnabled = true; }
    try {
        L.frameBlendingType = FrameBlendingType.PIXEL_MOTION;
        c.comp.frameBlending = true;
    } catch (e) {}
    Y.m.add(L, c.time, base);
    Y.x.set(L.property("ADBE Time Remapping"), Y.speed.expr(L));
};

Y.speed.preset = function (id, type, name, f, defsFn, extra, msg) {
    Y.reg.add({
        id: id, name: name, needs: "av", f: f,
        run: function (c) {
            var Ls = Y.speed.clips(c), i;
            for (i = 0; i < Ls.length; i++) { Y.speed.applyTo(Ls[i], c, type, defsFn(c), extra); }
            return name + " \u00e0 " + Y.u.tc(c.time, c.comp) + " sur " + Ls.length + " clip(s) \u00b7 " + (msg || "Time Remapping + Pixel Motion") +
                   " \u00b7 d\u00e9place le marker pour d\u00e9placer l'effet";
        }
    });
};

Y.speed.preset("velocity", "velocity", "Velocity", 30, function (c) {
    return [["slider", "dur", "Duree", c.frames],
            ["slider", "fast", "Rapide", Math.round(100 + 120 * c.intensity)],
            ["slider", "slow", "Lent", Math.max(5, Math.round(30 - 10 * c.intensity))],
            ["curve", "curve"]];
});
Y.speed.preset("slowkill", "slowkill", "Slow Kill", 30, function (c) {
    return [["slider", "speed", "Vitesse", Math.max(5, Math.round(35 - 10 * c.intensity))]];
});
Y.speed.preset("speedup", "speedup", "Speed Up", 20, function (c) {
    return [["slider", "speed", "Vitesse", Math.round(100 + 200 * c.intensity)]];
});
Y.speed.preset("freeze", "freeze", "Freeze", 20, function (c) {
    return [["slider", "dur", "Duree", c.frames]];
});
Y.speed.preset("rewind", "rewind", "Rewind", 24, function (c) {
    return [["slider", "dur", "Duree", c.frames], ["slider", "speed", "Vitesse", Math.round(200 + 100 * c.intensity)]];
});
Y.speed.preset("tw-time", "twtime", "Twitch Time", 8, function (c) {
    return [["slider", "dur", "Duree", c.frames], ["slider", "dens", "Densite", 55], ["slider", "jump", "Saut", Math.max(1, Math.round(3 * c.intensity))]];
}, null, "sauts dans le temps (Time Remapping)");

// Freeze Hit : arr\u00eat sur image + zoom lent + d\u00e9saturation, puis flash \u00e0 la reprise.
Y.speed.preset("freezehit", "freezehit", "Freeze Hit", 18, function (c) {
    return [["slider", "dur", "Duree", c.frames], ["slider", "zoom", "Zoom", Y.u.round(7 * c.intensity, 1)], ["curve", "curve"]];
}, function (L, base) {
    var C = Y.kit.C, n = { dur: base + "_Duree", curve: { p1: base + "_CourbeP1", p2: base + "_CourbeP2" } }, env = Y.kit.envCode(n, "", base);
    var tr = Y.shake.addTransform(L, base, 0, 0), ti, ex;
    Y.x.set(Y.shake.trProp(L, tr, "scale"), env + "(tt < d) ? value + " + C("", base + "_Zoom") + " * tt / d : value;");
    ti = Y.fxe.add(L, Y.FX.tint, /^tint$/i, base + "_Tint");
    Y.fxe.expr(L, ti, Y.FX.tintAmt, env + "(tt < d) ? 100 : 0;");
    ex = Y.fxe.add(L, Y.FX.expo, /^exposure$/i, base + "_Exposure");
    Y.fxe.expr(L, ex, Y.FX.expoV, env + "var f3 = 3 * thisComp.frameDuration;\n(tt >= d && tt < d + f3) ? value + 1.2 * (1 - (tt - d) / f3) : value;");
}, "arr\u00eat sur image + zoom + flash");

// Choppy : la cadence tombe \u00e0 12 i/s (look saccad\u00e9), en continu.
Y.shake.preset("posterize", "Choppy", 0, false, function (L, c, base) {
    var n = Y.kit.controls(L, base, c, [["slider", "rate", "Cadence", 12]]);
    var pt = Y.fxe.add(L, Y.FX.post, /posterize time/i, base + "_Posterize");
    Y.fxe.expr(L, pt, Y.FX.postRate, Y.kit.C("", n.rate) + ";");
});

Y.reg.add({
    id: "marker", name: "Marker au CTI", needs: "layer",
    run: function (c) {
        for (var i = 0; i < c.layers.length; i++) {
            Y.m.add(c.layers[i], c.time, "");
        }
        return "Marker pos\u00e9 \u00e0 " + Y.u.tc(c.time, c.comp) + " sur " + c.layers.length + " calque(s).";
    }
});

// Beat sync : Convert Audio to Keyframes, d\u00e9tection des pics, un marker "beat" par pic sur le calque audio.
// Ensuite : s\u00e9lectionne ce calque audio et clique un impact / flash -> un impact par beat.
Y.reg.add({
    id: "beat", name: "Beat sync", needs: "audio", f: 8, autotest: false,
    run: function (c) {
        var L = c.layer, cmd = app.findMenuCommandId("Convert Audio to Keyframes"), before, amp, fx, both, n, i, vals = [], times = [], mx = 0, thr, gap, last = -1e9, count = 0;
        if (!cmd) { Y.fail("Commande \u00ab Convert Audio to Keyframes \u00bb introuvable dans ce AE."); }
        for (i = 1; i <= c.comp.numLayers; i++) { c.comp.layer(i).selected = false; }
        L.selected = true;
        before = c.comp.numLayers;
        app.executeCommand(cmd);
        if (c.comp.numLayers === before) { Y.fail("AE n'a pas cr\u00e9\u00e9 le calque Audio Amplitude. Clique dans la timeline de la comp puis relance."); }
        amp = c.comp.layer(1);
        fx = Y.p.parade(amp);
        both = fx.property(fx.numProperties).property(1);
        n = both.numKeys;
        for (i = 1; i <= n; i++) {
            vals.push(both.keyValue(i));
            times.push(both.keyTime(i));
            if (vals[i - 1] > mx) { mx = vals[i - 1]; }
        }
        thr = mx * Y.u.clamp(0.75 - 0.25 * c.intensity, 0.2, 0.95);
        gap = c.frames * c.fd;
        for (i = 1; i < n - 1; i++) {
            if (vals[i] >= thr && vals[i] >= vals[i - 1] && vals[i] >= vals[i + 1] && times[i] - last >= gap) {
                Y.m.add(L, times[i], "beat");
                last = times[i];
                count++;
            }
        }
        amp.remove();
        L.selected = true;
        return count + " beats pos\u00e9s en markers sur " + L.name + " \u00b7 garde-le s\u00e9lectionn\u00e9 et clique un impact ou un flash : un par beat";
    }
});

// Easing sur les keyframes s\u00e9lectionn\u00e9es (conversion b\u00e9zier -> vitesse + influence, comme Flow).
Y.k.bezier = function (P, k1, k2, b) {
    var t1 = P.keyTime(k1), t2 = P.keyTime(k2), dt = t2 - t1, v1 = P.keyValue(k1), v2 = P.keyValue(k2);
    var dims = Y.k.easeDims(P), speeds = [], i, dv, outE = [], inE = [];
    var x1 = Y.u.clamp(b[0], 0.01, 1), y1 = b[1], x2 = Y.u.clamp(b[2], 0, 0.99), y2 = b[3];
    if (dims === 1) {
        if (Y.u.isArray(v1)) {
            dv = 0;
            for (i = 0; i < v1.length; i++) { dv += (v2[i] - v1[i]) * (v2[i] - v1[i]); }
            dv = Math.sqrt(dv);
        } else {
            dv = v2 - v1;
        }
        speeds.push(dv / dt);
    } else {
        for (i = 0; i < dims; i++) { speeds.push((v2[i] - v1[i]) / dt); }
    }
    for (i = 0; i < speeds.length; i++) {
        outE.push(new KeyframeEase(speeds[i] * y1 / x1, x1 * 100));
        inE.push(new KeyframeEase(speeds[i] * (1 - y2) / (1 - x2), Y.u.clamp((1 - x2) * 100, 0.1, 100)));
    }
    P.setInterpolationTypeAtKey(k1, P.keyInInterpolationType(k1), KeyframeInterpolationType.BEZIER);
    P.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, P.keyOutInterpolationType(k2));
    P.setTemporalEaseAtKey(k1, P.keyInTemporalEase(k1), outE);
    P.setTemporalEaseAtKey(k2, inE, P.keyOutTemporalEase(k2));
};

Y.reg.add({
    id: "ease", name: "Easing keys", needs: "comp", autotest: false,
    run: function (c) {
        var props = c.comp.selectedProperties, i, j, P, keys, done = 0;
        if (c.curve.special) { Y.fail("Elastic ne s'applique pas \u00e0 des keyframes : choisis une courbe b\u00e9zier."); }
        for (i = 0; i < props.length; i++) {
            P = props[i];
            if (P.propertyType !== PropertyType.PROPERTY || !P.numKeys) { continue; }
            keys = P.selectedKeys;
            for (j = 0; j < keys.length - 1; j++) {
                if (keys[j + 1] === keys[j] + 1) {
                    Y.k.bezier(P, keys[j], keys[j + 1], c.curve.b);
                    done++;
                }
            }
        }
        if (!done) { Y.fail("S\u00e9lectionne au moins 2 keyframes qui se suivent sur une propri\u00e9t\u00e9."); }
        return "Courbe " + c.curve.name + " appliqu\u00e9e \u00e0 " + done + " intervalle(s) de keyframes.";
    }
});
// ---- src/60_audio.jsx ----
// =====================================================================
// AUDIO : import des SFX de la biblioth\u00e8que (une seule fois par projet, rang\u00e9s dans YFX_SFX)
// et placement au CTI ou sur chaque marker du calque s\u00e9lectionn\u00e9.
// =====================================================================
Y.audio = {};

// Item de projet d\u00e9j\u00e0 import\u00e9 pour ce fichier, sinon import.
Y.audio.item = function (file) {
    var i, it, path = file.fsName;
    for (i = 1; i <= app.project.numItems; i++) {
        it = app.project.item(i);
        if ((it instanceof FootageItem) && it.file && it.file.fsName === path) { return it; }
    }
    it = app.project.importFile(new ImportOptions(file));
    it.parentFolder = Y.proj.folder("YFX_SFX");
    return it;
};

// mode "cti" : un calque au CTI ; mode "markers" : un calque sur chaque marker du calque s\u00e9lectionn\u00e9.
Y.audio.place = function (path, mode) {
    var comp, file, item, times = [], i, L, sel;
    if (!app.project) { Y.fail(Y.MSG.noProject); }
    comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { Y.fail(Y.MSG.noComp); }
    file = new File(path);
    if (!file.exists) { Y.fail("Son introuvable : " + path); }
    if (mode === "markers") {
        sel = comp.selectedLayers;
        if (!sel.length) { Y.fail("S\u00e9lectionne le calque dont les markers doivent recevoir le son."); }
        times = Y.m.times(sel[0]);
        if (!times.length) { Y.fail("Le calque \"" + sel[0].name + "\" n'a aucun marker."); }
    } else {
        times = [comp.time];
    }
    app.beginUndoGroup("YexoFX : SFX " + file.displayName);
    try {
        item = Y.audio.item(file);
        for (i = 0; i < times.length; i++) {
            L = comp.layers.add(item);
            L.startTime = times[i];
            L.comment = "YexoFX";
        }
    } finally {
        app.endUndoGroup();
    }
    return times.length > 1 ? decodeURI(file.name) + " plac\u00e9 sur " + times.length + " markers"
                            : decodeURI(file.name) + " plac\u00e9 \u00e0 " + Y.u.tc(times[0], comp);
};
// ---- src/70_previews.jsx ----
// =====================================================================
// PREVIEWS : les vid\u00e9os des cartes du panel, rendues dans AE.
// Le panel appelle :
//   pvInfo   (sans rien modifier) : source qui sera utilis\u00e9e, rendus d\u00e9j\u00e0 en file d'attente
//   pvBegin  : sc\u00e8ne de d\u00e9mo (ou ton clip s\u00e9lectionn\u00e9), mod\u00e8le de sortie H.264, file d'attente mise de c\u00f4t\u00e9
//   pvRender : une comp de d\u00e9mo par preset (1080x1352 \u00b7 60 i/s \u00b7 2 s), preset appliqu\u00e9, rendu en .mp4
//   pvEnd    : m\u00e9nage (comps et solides de d\u00e9mo supprim\u00e9s, file d'attente r\u00e9tablie)
// La compression en WebM (l\u00e9ger, lisible par le panel) est faite ensuite par le panel avec ffmpeg.
// =====================================================================
Y.pv = {
    st: null,
    W: 1080, H: 1352, FPS: 60, DUR: 2,
    HIT: 0.7,       // moment du kill dans la preview (CTI des presets d'impact)
    CUT: 1.0,       // coupe des transitions
    TEXT_IN: 0.3,   // entr\u00e9e du texte
    FOLDER: "YFX_Previews",
    KILL_A: 1.2,    // kill de la sc\u00e8ne de d\u00e9mo, plan A (0-3 s)
    KILL_B: 4.2,    // plan B (3-6 s)
    SHOT_B: 3.6     // moment du plan B montr\u00e9 apr\u00e8s la coupe
};

Y.pv.rawDir = function () {
    return new Folder(Y.paths.userDir().fsName + "/previews_raw");
};

// Calque s\u00e9lectionn\u00e9 utilisable comme source (footage vid\u00e9o ou pr\u00e9comp) dans la comp active.
Y.pv.pickSource = function () {
    var comp = app.project ? app.project.activeItem : null, sel, i, L, s;
    if (!(comp instanceof CompItem)) { return null; }
    sel = comp.selectedLayers;
    for (i = 0; i < sel.length; i++) {
        L = sel[i];
        s = L.source;
        if (!(L instanceof AVLayer) || (L instanceof TextLayer) || (L instanceof ShapeLayer) || !s) { continue; }
        if (Y.u.begins(L.name, Y.PREFIX)) { continue; }
        if ((s instanceof CompItem) || ((s instanceof FootageItem) && s.hasVideo && !(s.mainSource instanceof SolidSource))) {
            return { item: s, time: Math.max(0, (comp.time - L.startTime) * 100 / (L.stretch || 100)), label: L.name + " \u00e0 " + Y.u.tc(comp.time, comp) };
        }
    }
    return null;
};

Y.pv.queued = function () {
    var rq = app.project.renderQueue, out = [], i;
    for (i = 1; i <= rq.numItems; i++) {
        if (rq.item(i).render) { out.push(rq.item(i)); }
    }
    return out;
};

// Mod\u00e8le de sortie : H.264 le plus l\u00e9ger (AE 2023+), sinon Lossless (gros fichier, compress\u00e9 ensuite).
Y.pv.pickTemplate = function (om) {
    var t = om.templates || [], i, best = null, bestMb = 1e9, mb, m;
    for (i = 0; i < t.length; i++) {
        if (/H\.?264/i.test(t[i]) && !/^_HIDDEN/i.test(t[i])) {
            m = /(\d+)\s*Mbps/i.exec(t[i]);
            mb = m ? Number(m[1]) : 500;
            if (mb < bestMb) { bestMb = mb; best = t[i]; }
        }
    }
    if (best) { return { name: best, ext: ".mp4" }; }
    for (i = 0; i < t.length; i++) {
        if (t[i] === "Lossless") { return { name: t[i], ext: ".avi" }; }
    }
    return null;
};

// ------------------------------------------------------------------ sc\u00e8ne de d\u00e9mo
Y.pv.trySet = function (prop, v) {
    try { prop.setValue(v); return true; } catch (e) { Y.log("WARN", "preview : " + Y.errText(e)); return false; }
};

Y.pv.fxSet = function (L, fxName, keys, v) {
    try { Y.fxe.set(L, fxName, keys, v); } catch (e) { Y.log("WARN", "preview : " + Y.errText(e)); }
};

// Groupe rempli (rectangle arrondi ou ellipse) dans un calque de forme. Renvoie l'index du groupe.
Y.pv.shape = function (L, kind, size, pos, rgb, round) {
    var gi = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").propertyIndex, g, sh;
    var mn = kind === "ellipse" ? "ADBE Vector Shape - Ellipse" : "ADBE Vector Shape - Rect";
    L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group").addProperty(mn);
    L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    g = L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group");
    sh = g.property(mn);
    if (kind === "ellipse") {
        sh.property("ADBE Vector Ellipse Size").setValue(size);
        sh.property("ADBE Vector Ellipse Position").setValue(pos);
    } else {
        sh.property("ADBE Vector Rect Size").setValue(size);
        sh.property("ADBE Vector Rect Position").setValue(pos);
        if (round) { sh.property("ADBE Vector Rect Roundness").setValue(round); }
    }
    g.property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(rgb);
    return gi;
};

// Un plan de la sc\u00e8ne : fond en d\u00e9grad\u00e9, grille qui d\u00e9file, cible qui traverse et \u00ab meurt \u00bb au viseur.
Y.pv.shot = function (scene, folder, t0, t1, tKill, dir, pal) {
    var W = scene.width, H = scene.height, cx = W / 2, headY = Math.round(H * 0.37), bodyY = headY + 215;
    var bg, grid, tgt, hud, v = 460 * dir, head, pos, op, i, sq;
    var layers = [];

    bg = scene.layers.addSolid([0.05, 0.05, 0.055], "Fond", W, H, 1, scene.duration);
    bg.source.parentFolder = folder;
    Y.fxe.add(bg, ["ADBE Ramp"], /^gradient ramp$/i, "Degrade");
    Y.pv.fxSet(bg, "Degrade", ["ADBE Ramp-0005", "Ramp Shape"], 2);
    Y.pv.fxSet(bg, "Degrade", ["ADBE Ramp-0001", "Start of Ramp"], [cx, headY]);
    Y.pv.fxSet(bg, "Degrade", ["ADBE Ramp-0002", "Start Color"], pal.bg);
    Y.pv.fxSet(bg, "Degrade", ["ADBE Ramp-0003", "End of Ramp"], [cx, headY + H * 0.95]);
    Y.pv.fxSet(bg, "Degrade", ["ADBE Ramp-0004", "End Color"], [0.043, 0.043, 0.047, 1]);
    layers.push(bg);

    grid = scene.layers.addSolid([0, 0, 0], "Grille", W + 520, H, 1, scene.duration);
    grid.source.parentFolder = folder;
    try {
        Y.fxe.add(grid, ["ADBE Grid"], /^grid$/i, "Grille");
        Y.pv.fxSet(grid, "Grille", ["Size From"], 2);
        Y.pv.fxSet(grid, "Grille", ["Width"], 135);
        Y.pv.fxSet(grid, "Grille", ["Border"], 2);
        Y.pv.fxSet(grid, "Grille", ["Color"], pal.line);
        grid.blendingMode = BlendingMode.SCREEN;
        grid.property("ADBE Transform Group").property("ADBE Opacity").setValue(22);
        pos = grid.property("ADBE Transform Group").property("ADBE Position");
        pos.setValueAtTime(t0, [cx + 220 * dir, H / 2]);
        pos.setValueAtTime(t1, [cx - 220 * dir, H / 2]);
        layers.push(grid);
    } catch (e) {
        Y.log("WARN", "preview : grille ignor\u00e9e (" + Y.errText(e) + ")");
        grid.remove();
    }

    // cible : corps + t\u00eate, traverse l'\u00e9cran et passe sous le viseur au moment du kill
    tgt = scene.layers.addShape();
    tgt.name = "Cible";
    Y.pv.shape(tgt, "rect", [150, 300], [0, 0], pal.body, 60);
    head = Y.pv.shape(tgt, "ellipse", [112, 112], [0, -215], pal.head);
    pos = tgt.property("ADBE Transform Group").property("ADBE Position");
    pos.setValueAtTime(t0, [cx + v * (t0 - tKill), bodyY]);
    pos.setValueAtTime(t1, [cx + v * (t1 - tKill), bodyY]);
    sq = tgt.property("ADBE Root Vectors Group").property(head).property("ADBE Vector Transform Group").property("ADBE Vector Scale");
    sq.setValueAtTime(tKill, [100, 100]);
    sq.setValueAtTime(tKill + 0.05, [165, 165]);
    sq.setValueAtTime(tKill + 0.16, [0, 0]);
    op = tgt.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(tKill + 0.08, 100);
    op.setValueAtTime(tKill + 0.4, 0);
    layers.push(tgt);

    // viseur (HUD) : 4 traits + point, \u00e0 hauteur de t\u00eate
    hud = scene.layers.addShape();
    hud.name = "Viseur";
    Y.pv.shape(hud, "rect", [6, 6], [0, 0], [1, 1, 1, 1]);
    Y.pv.shape(hud, "rect", [6, 26], [0, -30], [1, 1, 1, 1]);
    Y.pv.shape(hud, "rect", [6, 26], [0, 30], [1, 1, 1, 1]);
    Y.pv.shape(hud, "rect", [26, 6], [-30, 0], [1, 1, 1, 1]);
    Y.pv.shape(hud, "rect", [26, 6], [30, 0], [1, 1, 1, 1]);
    hud.property("ADBE Transform Group").property("ADBE Position").setValue([cx, headY + 2]);
    layers.push(hud);

    for (i = 0; i < layers.length; i++) {
        layers[i].inPoint = t0;
        layers[i].outPoint = t1;
    }
};

// Sc\u00e8ne de d\u00e9mo 6 s : plan A (lavande, cible rouge vers la droite), plan B (ambre, cible lavande vers la gauche).
Y.pv.scene = function (folder) {
    var s = app.project.items.addComp("YFX_PV_Scene", Y.pv.W, Y.pv.H, 1, 6, Y.pv.FPS);
    s.parentFolder = folder;
    s.bgColor = [0.043, 0.043, 0.047];
    Y.pv.shot(s, folder, 0, 3, Y.pv.KILL_A, 1, {
        bg: [0.2, 0.16, 0.36, 1], line: [0.78, 0.75, 1, 1], body: [1, 0.275, 0.333, 1], head: [1, 0.62, 0.64, 1]
    });
    Y.pv.shot(s, folder, 3, 6, Y.pv.KILL_B, -1, {
        bg: [0.3, 0.17, 0.07, 1], line: [0.95, 0.66, 0.23, 1], body: [0.557, 0.498, 1, 1], head: [0.78, 0.75, 1, 1]
    });
    return s;
};

// Calque source dans la comp de preview : la sc\u00e8ne de d\u00e9mo ou ton clip, cal\u00e9 pour que tSrc tombe \u00e0 tPv.
Y.pv.addSource = function (comp, st, tSrc, tPv, inP, outP) {
    var L = comp.layers.add(st.item), end;
    L.startTime = tPv - tSrc;
    end = (st.item.duration > 0) ? L.startTime + st.item.duration : outP;
    if (Math.min(outP, end) - Math.max(inP, L.startTime) < comp.frameDuration * 2) {
        Y.fail("Ton clip est trop court autour du CTI pour une preview : place le CTI au milieu du clip (au moins 1,5 s apr\u00e8s).");
    }
    L.inPoint = Math.max(inP, L.startTime);
    L.outPoint = Math.min(outP, end);
    try {
        var sc = Math.max(comp.width / st.item.width, comp.height / st.item.height) * 100;
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc, 100]);
        L.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2, 0]);
    } catch (e) {}
    return L;
};

Y.pv.textLayer = function (comp, word) {
    var T = comp.layers.addText(word || "ACE"), tp, td;
    tp = T.property("ADBE Text Properties").property("ADBE Text Document");
    td = tp.value;
    td.fontSize = 170;
    td.applyFill = true;
    td.fillColor = [1, 1, 1];
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    try { td.font = "Arial-BoldMT"; } catch (e) {}
    tp.setValue(td);
    T.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height * 0.56, 0]);
    T.inPoint = Y.pv.TEXT_IN;
    T.outPoint = comp.duration;
    return T;
};

// ------------------------------------------------------------------ API
Y.pv.info = function () {
    var src;
    if (!app.project) { Y.fail(Y.MSG.noProject); }
    src = Y.pv.pickSource();
    return { source: src ? src.label : null, queued: Y.pv.queued().length, raw: Y.pv.rawDir().fsName };
};

Y.pv.begin = function () {
    var st, src, folder, rqi, tpl, q, i;
    if (!app.project) { Y.fail(Y.MSG.noProject); }
    if (!Y.env.canWrite()) { Y.fail("Active Edit > Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network, puis relance."); }
    if (Y.pv.st) { Y.pv.end({}); }
    src = Y.pv.pickSource();
    Y.f.ensureFolder(Y.pv.rawDir());
    folder = Y.proj.folder(Y.pv.FOLDER);
    st = { folder: folder, queued: [], made: 0 };
    q = Y.pv.queued();
    for (i = 0; i < q.length; i++) {
        q[i].render = false;
        st.queued.push(q[i]);
    }
    Y.pv.st = st;
    try {
        if (src) {
            st.item = src.item;
            st.tA = src.time;
            st.tB = src.time + 1.5;
            st.label = src.label;
        } else {
            st.item = Y.pv.scene(folder);
            st.tA = Y.pv.KILL_A;
            st.tB = Y.pv.SHOT_B;
            st.label = null;
        }
        // mod\u00e8le de sortie : lu sur un \u00e9l\u00e9ment de rendu temporaire
        rqi = app.project.renderQueue.items.add(st.item);
        tpl = Y.pv.pickTemplate(rqi.outputModule(1));
        rqi.remove();
        if (!tpl) { Y.fail("Aucun mod\u00e8le de sortie H.264 ni Lossless dans ton AE : impossible de rendre les previews."); }
        st.template = tpl;
    } catch (e) {
        Y.pv.end({});
        throw e;
    }
    Y.log("INFO", "previews : d\u00e9but (" + (st.label || "sc\u00e8ne de d\u00e9mo") + ", mod\u00e8le " + st.template.name + ")");
    return { source: st.label, template: st.template.name, raw: Y.pv.rawDir().fsName, queued: st.queued.length };
};

// a = { id, kind: hit|text|cut, word, params, keep }
Y.pv.render = function (a) {
    var st = Y.pv.st, id = String(a.id || ""), p = Y.reg.byId[id], kind = String(a.kind || "hit");
    var comp, L, L2, T, sel = [], msg, rqi, om, file, out, t0 = Y.u.ms(), params = a.params || {};
    if (!st) { Y.fail("G\u00e9n\u00e9ration des previews non d\u00e9marr\u00e9e (pvBegin)."); }
    if (!p || p.hidden) { Y.fail("Preset inconnu : " + id); }
    if (p.needs === "audio") { Y.fail(p.name + " : pas de preview pour un outil audio."); }
    if (p.needs === "two") { kind = "cut"; }
    if (kind === "text" && p.needs !== "text") { kind = "hit"; }

    comp = app.project.items.addComp("YFX_PV_" + id, Y.pv.W, Y.pv.H, 1, Y.pv.DUR, Y.pv.FPS);
    comp.parentFolder = st.folder;
    comp.bgColor = [0.043, 0.043, 0.047];
    comp.motionBlur = true;
    comp.resolutionFactor = [2, 2];
    try {
        if (kind === "cut") {
            L = Y.pv.addSource(comp, st, st.tA + (Y.pv.CUT - Y.pv.HIT), Y.pv.CUT, 0, Y.pv.CUT);
            L2 = Y.pv.addSource(comp, st, st.tB, Y.pv.CUT, Y.pv.CUT, Y.pv.DUR);
            L2.moveBefore(L);
            comp.time = Y.pv.CUT;
            if (p.needs === "two") { sel = [L, L2]; }
        } else {
            L = Y.pv.addSource(comp, st, st.tA, Y.pv.HIT, 0, Y.pv.DUR);
            comp.time = Y.pv.HIT;
            if (kind === "text") {
                L.property("ADBE Transform Group").property("ADBE Opacity").setValue(45);
                T = Y.pv.textLayer(comp, a.word);
                comp.time = Y.pv.TEXT_IN;
                if (p.needs === "text") { sel = [T]; }
            } else if (p.needs === "av" || p.needs === "layer") {
                sel = [L];
            }
        }
        if (params.dir === undefined) { params.dir = "in"; }
        msg = Y.exec(id, params, comp, sel);

        out = new File(Y.pv.rawDir().fsName + "/" + id + st.template.ext);
        if (out.exists) { out.remove(); }
        rqi = app.project.renderQueue.items.add(comp);
        try { rqi.applyTemplate("Current Settings"); } catch (e1) {}
        om = rqi.outputModule(1);
        om.applyTemplate(st.template.name);
        om.file = out;
        app.project.renderQueue.render();
        file = om.file.fsName;
        rqi.remove();
        rqi = null;
        st.made++;
    } catch (e) {
        try { if (rqi) { rqi.remove(); } } catch (e2) {}
        if (!a.keep) { try { comp.remove(); } catch (e3) {} }
        throw e;
    }
    if (!a.keep) { comp.remove(); }
    if (!new File(file).exists) { Y.fail(p.name + " : le rendu n'a produit aucun fichier (" + file + ")."); }
    return { id: id, file: file, ms: Y.u.ms() - t0, msg: msg };
};

// M\u00e9nage : comps de d\u00e9mo, solides des presets cr\u00e9\u00e9s pour ces comps, file d'attente r\u00e9tablie.
Y.pv.end = function (a) {
    var st = Y.pv.st, i, it, n = 0, folder, sol, suffix = "_" + Y.pv.W + "x" + Y.pv.H;
    Y.pv.st = null;
    if (!st) { return { removed: 0 }; }
    for (i = 0; i < st.queued.length; i++) {
        try { st.queued[i].render = true; } catch (e) {}
    }
    if (a && a.keep) { return { removed: 0, made: st.made }; }
    try {
        folder = st.folder;
        for (i = folder.numItems; i >= 1; i--) { folder.item(i).remove(); n++; }
        folder.remove();
    } catch (e1) { Y.log("WARN", "previews : m\u00e9nage incomplet (" + Y.errText(e1) + ")"); }
    for (i = app.project.numItems; i >= 1; i--) {
        it = app.project.item(i);
        if ((it instanceof FootageItem) && it.mainSource instanceof SolidSource && Y.u.begins(it.name, Y.PREFIX) &&
            it.name.slice(-suffix.length) === suffix && (!it.usedIn || !it.usedIn.length)) {
            it.remove();
            n++;
        }
    }
    sol = Y.proj.folder("YFX_Solids");
    if (sol.numItems === 0) { sol.remove(); }
    Y.log("INFO", "previews : fin (" + st.made + " rendue(s), " + n + " \u00e9l\u00e9ment(s) retir\u00e9(s))");
    return { removed: n, made: st.made };
};
// ---- src/80_devtools.jsx ----
// =====================================================================
// OUTILS DE DEV : auto-test, dump, liste des effets
// (Je ne peux pas lancer AE : ces outils produisent des rapports texte \u00e0 m'envoyer.)
// Appel\u00e9s par le panel via l'API ; aucune bo\u00eete de dialogue c\u00f4t\u00e9 moteur.
// =====================================================================

Y.dev = {};
Y.tests = [];

// D\u00e9clare un test du core. o.noUndo = le test g\u00e8re lui-m\u00eame ses undo groups.
Y.test = function (name, fn, o) {
    Y.tests.push({ name: name, fn: fn, o: o || {} });
};

// Effets natifs dont les presets livr\u00e9s ont besoin (doivent TOUS exister).
Y.dev.NATIVE_CORE = [
    "ADBE Slider Control", "ADBE Checkbox Control", "ADBE Color Control", "ADBE Point Control",
    "ADBE Angle Control", "ADBE Dropdown Control",
    "ADBE Geometry2",            // Transform
    "ADBE Tile",                 // Motion Tile
    "ADBE Exposure2",            // Exposure
    "ADBE Fractal Noise",
    "ADBE Shift Channels",
    "ADBE Set Channels",
    "ADBE Gaussian Blur 2"
];

// Effets sond\u00e9s pour les livraisons suivantes (information seulement).
Y.dev.PROBE = [
    "ADBE Noise", "ADBE Motion Blur", "ADBE Radial Blur", "ADBE Fill", "ADBE Glo2", "ADBE Ramp",
    "ADBE Optics Compensation", "ADBE Lumetri", "ADBE Brightness & Contrast 2", "ADBE Tint",
    "ADBE Displacement Map", "ADBE Wave Warp", "ADBE Posterize Time", "ADBE Echo", "ADBE Box Blur2",
    "CC Light Sweep", "CC Radial Fast Blur", "CC Composite", "CC Force Motion Blur"
];

// \u00c9crit dans %APPDATA%\YexoFX\<nom>. Renvoie le File, ou null si l'\u00e9criture est d\u00e9sactiv\u00e9e.
Y.dev.saveText = function (fileName, text, open) {
    var f = new File(Y.paths.userDir().fsName + "/" + fileName);
    if (Y.f.write(f, text)) {
        if (open) { f.execute(); }
        return f;
    }
    return null;
};


// =====================================================================
// DUMP DES PROPRI\u00c9T\u00c9S
// =====================================================================
Y.dev.valueStr = function (prop) {
    var t, v, i, parts;
    try {
        t = prop.propertyValueType;
        if (t === PropertyValueType.NO_VALUE) { return ""; }
        if (t === PropertyValueType.CUSTOM_VALUE) { return "= (custom)"; }
        if (t === PropertyValueType.SHAPE) { return "= (shape)"; }
        if (t === PropertyValueType.MARKER) { return "= (" + prop.numKeys + " marker(s))"; }
        v = prop.value;
        if (t === PropertyValueType.TEXT_DOCUMENT) { return "= \"" + v.text + "\""; }
        if (Y.u.isArray(v)) {
            parts = [];
            for (i = 0; i < v.length; i++) { parts.push(Y.u.round(v[i], 3)); }
            return "= [" + parts.join(", ") + "]";
        }
        if (typeof v === "number") { return "= " + Y.u.round(v, 3); }
        return "= " + String(v);
    } catch (e) {
        return "= (?)";
    }
};

Y.dev.dumpProp = function (prop, depth, out) {
    var pad = new Array(depth + 1).join("  "), s, i, expr;
    s = pad + "[" + prop.propertyIndex + "] " + prop.name + "  <" + prop.matchName + ">";
    if (prop.propertyType === PropertyType.PROPERTY) {
        s += "  " + Y.dev.valueStr(prop);
        try { if (prop.numKeys > 0 && prop.propertyValueType !== PropertyValueType.MARKER) { s += "  (" + prop.numKeys + " keys)"; } } catch (e) {}
        try {
            if (prop.canSetExpression && prop.expressionEnabled && prop.expression !== "") {
                expr = String(prop.expression).replace(/\s+/g, " ");
                s += "  {expr: " + (expr.length > 60 ? expr.substr(0, 60) + "..." : expr) + "}";
            }
        } catch (e2) {}
        out.push(s);
        return;
    }
    if (prop.propertyType === PropertyType.INDEXED_GROUP) { s += "  (index\u00e9)"; }
    out.push(s);
    for (i = 1; i <= prop.numProperties; i++) {
        try { Y.dev.dumpProp(prop.property(i), depth + 1, out); }
        catch (e3) { out.push(pad + "  ! " + Y.errText(e3)); }
    }
};

Y.dev.dumpLayer = function (L, out) {
    var i, mk, j;
    out.push("");
    out.push("=== Calque " + L.index + " : \"" + L.name + "\" | " + Y.l.kind(L) + " ===");
    out.push("in " + Y.u.round(L.inPoint, 3) + " s | out " + Y.u.round(L.outPoint, 3) + " s | start " + Y.u.round(L.startTime, 3) +
             " s | stretch " + L.stretch + " % | parent " + (L.parent ? L.parent.name : "-"));
    if (L instanceof AVLayer) {
        out.push("3D " + L.threeDLayer + " | audio " + L.hasAudio + " | timeRemap " + L.timeRemapEnabled +
                 " | motionBlur " + L.motionBlur + " | mode " + L.blendingMode);
    }
    mk = Y.m.prop(L);
    if (mk && mk.numKeys) {
        for (j = 1; j <= mk.numKeys; j++) {
            out.push("marker " + j + " : " + Y.u.round(mk.keyTime(j), 3) + " s \"" + mk.keyValue(j).comment + "\"");
        }
    }
    for (i = 1; i <= L.numProperties; i++) {
        try { Y.dev.dumpProp(L.property(i), 1, out); }
        catch (e) { out.push("  ! " + Y.errText(e)); }
    }
};

Y.dev.dump = function () {
    var comp = app.project ? app.project.activeItem : null, sel, out = [], i, f;
    if (!(comp instanceof CompItem)) { Y.fail(Y.MSG.noComp); }
    sel = comp.selectedLayers;
    if (!sel.length) { Y.fail("S\u00e9lectionne le ou les calques \u00e0 analyser."); }
    out.push("YexoFX " + Y.VERSION + " | dump du " + Y.u.stamp() + " | AE " + app.version + " | langue " + app.isoLanguage);
    out.push("Comp \"" + comp.name + "\" " + comp.width + "x" + comp.height + " @ " + comp.frameRate + " fps, " +
             Y.u.round(comp.duration, 3) + " s | moteur d'expressions : " + Y.env.engine());
    for (i = 0; i < sel.length; i++) { Y.dev.dumpLayer(sel[i], out); }
    f = Y.dev.saveText("dump_" + Y.u.stamp(true) + ".txt", out.join("\n"), true);
    return { path: f ? f.fsName : null, text: f ? null : out.join("\n") };
};

Y.dev.effectsList = function () {
    var l = Y.fx.all().slice(0), out = [], i, f;
    l.sort(function (a, b) {
        var x = (a.cat + "|" + a.name).toLowerCase(), y = (b.cat + "|" + b.name).toLowerCase();
        return x < y ? -1 : (x > y ? 1 : 0);
    });
    out.push("Effets install\u00e9s : " + l.length + " | AE " + app.version + " | " + Y.u.stamp());
    out.push("cat\u00e9gorie | nom affich\u00e9 | matchName");
    for (i = 0; i < l.length; i++) { out.push(l[i].cat + " | " + l[i].name + " | " + l[i].match); }
    f = Y.dev.saveText("effets_" + Y.u.stamp(true) + ".txt", out.join("\n"), true);
    return { path: f ? f.fsName : null, count: l.length };
};

Y.dev.openLog = function () {
    var f = Y.paths.logFile();
    if (f.exists) { f.execute(); return { path: f.fsName }; }
    return { path: null };
};


// =====================================================================
// AUTO-TEST
// =====================================================================
Y.dev.setup = function () {
    var i, it, comp, txt, tp, td, bg;
    for (i = app.project.numItems; i >= 1; i--) {
        it = app.project.item(i);
        if ((it instanceof CompItem) && it.name === "YFX_TEST") { it.remove(); }
    }
    comp = app.project.items.addComp("YFX_TEST", 1080, 1920, 1, 5, 60);
    comp.parentFolder = Y.proj.folder("YFX_Tests");
    bg = Y.l.addSolid(comp, "YFX_TEST_FOND", [0.08, 0.08, 0.1], "test_fond");
    txt = comp.layers.addText("HEADSHOT");
    txt.name = "YFX_TEST_TEXTE";
    tp = txt.property("ADBE Text Properties").property("ADBE Text Document");
    td = tp.value;
    td.fontSize = 180;
    td.applyFill = true;
    td.fillColor = [1, 1, 1];
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    tp.setValue(td);
    txt.property("ADBE Transform Group").property("ADBE Position").setValue([540, 1000]);
    comp.time = 1;
    comp.openInViewer();
    return {
        comp: comp, text: txt, solid: bg, lines: [], skipped: null, seen: {},
        info: function (s) { this.lines.push(s); },
        skip: function (why) { this.skipped = why; },
        assert: function (cond, msg) { if (!cond) { throw new Error(msg); } },
        near: function (a, b, tol) { return Y.u.near(a, b, tol); }
    };
};

// Lance un test : renvoie 1 (OK), 0 (\u00e9chec) ou -1 (ignor\u00e9).
Y.dev.runOne = function (test, T, line) {
    var t0 = Y.u.ms(), res, i;
    T.lines = [];
    T.skipped = null;
    if (!test.o.noUndo) { app.beginUndoGroup("YexoFX : test " + test.name); }
    try {
        test.fn(T);
        if (T.skipped) {
            line("[IGNOR\u00c9] " + test.name + " : " + T.skipped);
            res = -1;
        } else {
            line("[OK] " + test.name + " (" + (Y.u.ms() - t0) + " ms)");
            res = 1;
        }
    } catch (e) {
        line("[\u00c9CHEC] " + test.name + " : " + Y.errText(e));
        res = 0;
    } finally {
        if (!test.o.noUndo) { app.endUndoGroup(); }
    }
    for (i = 0; i < T.lines.length; i++) { line("      " + T.lines[i]); }
    return res;
};

// Erreurs d'expression sur toutes les propri\u00e9t\u00e9s d'un calque (r\u00e9cursif).
Y.dev.scanExpr = function (L, group, times, out, seen, path) {
    var i, sub, err, key;
    for (i = 1; i <= group.numProperties; i++) {
        try { sub = group.property(i); } catch (e) { sub = null; }
        if (!sub) { continue; }
        if (sub.propertyType === PropertyType.PROPERTY) {
            if (sub.canSetExpression && sub.expressionEnabled && sub.expression !== "") {
                err = Y.x.check(sub, times);
                if (err) {
                    key = L.name + " > " + path + sub.name;
                    if (!seen[key]) {
                        seen[key] = true;
                        out.push(key + " : " + err);
                    }
                }
            }
        } else {
            Y.dev.scanExpr(L, sub, times, out, seen, path + sub.name + " > ");
        }
    }
};

Y.dev.exprErrors = function (comp, seen) {
    var out = [], i, times = [0, 0.25, 0.5, 1, 1.05, 1.1, 2, 4];
    for (i = 1; i <= comp.numLayers; i++) {
        Y.dev.scanExpr(comp.layer(i), comp.layer(i), times, out, seen, "");
    }
    return out;
};

// Applique un preset du registre sur une copie du calque de test adapt\u00e9 (ou sans s\u00e9lection
// pour les presets "comp" / "any"), puis v\u00e9rifie qu'aucune expression de la comp n'est en erreur.
Y.dev.testPreset = function (p, T, line) {
    var title = Y.reg.title(p) + " [" + p.id + "]", base, dup = null, sel, msg, errs, t0 = Y.u.ms(), res, i;
    if (p.hidden) { return -2; }
    if (p.autotest === false || p.needs === "none" || p.needs === "audio" || p.needs === "two") {
        line("[IGNOR\u00c9] " + title + " : \u00e0 tester \u00e0 la main");
        return -1;
    }
    app.beginUndoGroup("YexoFX : test " + p.id);
    try {
        if (p.needs === "comp" || p.needs === "any") {
            sel = [];
        } else {
            base = (p.needs === "text") ? T.text : T.solid;
            dup = base.duplicate();
            dup.name = "T_" + p.id;
            sel = [dup];
        }
        msg = p.run(Y.ctx(p, {}, T.comp, sel));
        errs = Y.dev.exprErrors(T.comp, T.seen);
        if (errs.length) {
            line("[\u00c9CHEC] " + title + " : " + errs.length + " erreur(s) d'expression");
            for (i = 0; i < errs.length; i++) { line("      " + errs[i]); }
            res = 0;
        } else {
            line("[OK] " + title + " (" + (Y.u.ms() - t0) + " ms)" + (msg ? " : " + msg : ""));
            res = 1;
        }
    } catch (e) {
        line("[\u00c9CHEC] " + title + " : " + Y.errText(e));
        res = 0;
    } finally {
        try { if (dup) { dup.enabled = false; } } catch (e2) {}
        app.endUndoGroup();
    }
    return res;
};

// Lance tout : renvoie { path, ok, ko, skip, text }. Le panel demande confirmation avant.
Y.dev.autotest = function () {
    var R = [], nOk = 0, nKo = 0, nSkip = 0, t0 = Y.u.ms(), T = null, i, f;
    function line(s) { R.push(s); }
    function count(v) {
        if (v === 1) { nOk++; } else if (v === 0) { nKo++; } else if (v === -1) { nSkip++; }
    }
    if (!app.project) { Y.fail("Ouvre un projet (id\u00e9alement un projet vide) avant l'auto-test."); }

    line("YexoFX " + Y.VERSION + " | build " + Y.BUILD + " | auto-test du " + Y.u.stamp());
    line("AE " + app.version + " | langue " + app.isoLanguage + " | " + $.os);
    line("Moteur d'expressions du projet : " + Y.env.engine());
    line("Moteur YexoFX : " + (Y.bootPath || "?"));
    line("");

    app.beginUndoGroup("YexoFX : auto-test (pr\u00e9paration)");
    try {
        T = Y.dev.setup();
    } catch (e) {
        line("[\u00c9CHEC] Pr\u00e9paration de la comp de test : " + Y.errText(e));
        nKo++;
    } finally {
        app.endUndoGroup();
    }

    if (T) {
        line("--- Moteur ---");
        for (i = 0; i < Y.tests.length; i++) { count(Y.dev.runOne(Y.tests[i], T, line)); }
        line("");
        line("--- Presets ---");
        for (i = 0; i < Y.reg.list.length; i++) { count(Y.dev.testPreset(Y.reg.list[i], T, line)); }
        line("");
        line("Les calques T_* de la comp YFX_TEST sont d\u00e9sactiv\u00e9s (oeil) : active-les pour voir le rendu.");
    }

    line("");
    line("BILAN : " + nOk + " OK, " + nKo + " \u00e9chec(s), " + nSkip + " ignor\u00e9(s) | " + (Y.u.ms() - t0) + " ms");
    f = Y.dev.saveText("autotest_" + Y.u.stamp(true) + ".txt", R.join("\n"), true);
    Y.log("INFO", "auto-test : " + nOk + " OK, " + nKo + " \u00e9chec(s), " + nSkip + " ignor\u00e9(s)");
    return { path: f ? f.fsName : null, ok: nOk, ko: nKo, skip: nSkip, text: f ? null : R.join("\n") };
};


// =====================================================================
// PRESETS CACH\u00c9S (servent uniquement aux tests de Y.exec)
// =====================================================================
Y.reg.add({ id: "dev_need_text", name: "test", needs: "text", hidden: true,
    run: function () { return "ne devrait pas s'ex\u00e9cuter sur un solide"; } });
Y.reg.add({ id: "dev_throw", name: "test", needs: "layer", hidden: true,
    run: function () { throw new Error("erreur volontaire (test)"); } });
Y.reg.add({ id: "dev_ok", name: "test", needs: "layer", hidden: true,
    run: function () { return "ok"; } });


// =====================================================================
// TESTS DU MOTEUR
// =====================================================================
Y.test("Environnement", function (T) {
    var a = Y.paths.assets(), sf = Y.paths.scriptFile();
    T.info("AE " + app.version + " (" + Y.env.ae() + ")");
    T.info("\u00c9criture de fichiers autoris\u00e9e : " + (Y.env.canWrite() ? "oui" : "NON"));
    T.info("Moteur : " + (sf ? sf.fsName + (sf.exists ? "" : " (INTROUVABLE)") : "?"));
    T.info("Dossier config : " + Y.paths.userDir().fsName);
    T.info("Dossier assets : " + (a ? a.fsName : "introuvable"));
    T.assert(Y.env.ae() >= 22, "AE trop ancien (" + app.version + ") : YexoFX vise AE 2025.");
});

Y.test("JSON (json2)", function (T) {
    var o = { a: 1, b: -2.5, s: "\u00c9t\u00e9 \"guillemets\" \\ fin\nligne", t: true, n: null, arr: [1, "x", { k: [] }], vide: {} };
    var r = Y.json.parse(Y.json.stringify(o, "  ")), bad = false;
    T.assert(r.a === 1 && r.b === -2.5 && r.s === o.s && r.t === true && r.n === null, "aller-retour JSON incorrect");
    T.assert(r.arr.length === 3 && r.arr[2].k.length === 0, "tableaux JSON incorrects");
    try { Y.json.parse("{a:1}"); } catch (e) { bad = true; }
    T.assert(bad, "un JSON invalide aurait d\u00fb \u00eatre refus\u00e9");
});

Y.test("Fichiers (config, log)", function (T) {
    var f;
    if (!Y.env.canWrite()) {
        T.skip("\u00e9criture d\u00e9sactiv\u00e9e : Edit > Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network");
        return;
    }
    f = new File(Y.paths.userDir().fsName + "/_test_ecriture.txt");
    T.assert(Y.f.write(f, "YexoFX \u00e9"), "\u00e9criture impossible dans " + f.fsName);
    T.assert(Y.f.read(f) === "YexoFX \u00e9", "relecture diff\u00e9rente");
    f.remove();
    T.assert(Y.cfg.save(), "config.json non sauv\u00e9");
});

Y.test("Catalogue d'effets", function (T) {
    var miss = [], i, third;
    Y.fx.scan();
    T.info(Y.fx.all().length + " effets install\u00e9s");
    for (i = 0; i < Y.dev.NATIVE_CORE.length; i++) {
        if (!Y.fx.has(Y.dev.NATIVE_CORE[i])) { miss.push(Y.dev.NATIVE_CORE[i]); }
    }
    third = Y.fx.thirdParty();
    T.info("Effets tiers d\u00e9tect\u00e9s : " + (third.length ? third.join(", ") : "aucun"));
    if (miss.length) { T.info("Introuvables : " + miss.join(", ")); }
    T.assert(miss.length === 0, miss.length + " effet(s) natif(s) requis introuvable(s)");
});

Y.test("Contr\u00f4les d'expression", function (T) {
    var L = T.solid, e, v, n;
    e = Y.ctl.add(L, "slider", "YFX_T_Slider", 42);
    T.assert(T.near(e.property(1).value, 42), "slider : valeur lue " + e.property(1).value);
    e = Y.ctl.add(L, "checkbox", "YFX_T_Case", true);
    T.assert(Number(e.property(1).value) === 1, "checkbox : valeur lue " + e.property(1).value);
    e = Y.ctl.add(L, "color", "YFX_T_Couleur", [1, 0.2745, 0.3333]);
    v = e.property(1).value;
    T.assert(T.near(v[0], 1, 0.01) && T.near(v[1], 0.2745, 0.01) && T.near(v[2], 0.3333, 0.01), "couleur : valeur lue " + v);
    e = Y.ctl.add(L, "point", "YFX_T_Point", [0.34, 1.56]);
    v = e.property(1).value;
    T.assert(T.near(v[0], 0.34) && T.near(v[1], 1.56), "point : valeur lue " + v);
    e = Y.ctl.add(L, "angle", "YFX_T_Angle", 45);
    T.assert(T.near(e.property(1).value, 45), "angle : valeur lue " + e.property(1).value);
    e = Y.ctl.add(L, "dropdown", "YFX_T_Menu", 2, ["Entr\u00e9e", "Sortie", "Les deux"]);
    T.assert(e.name === "YFX_T_Menu", "menu d\u00e9roulant : nom \"" + e.name + "\" au lieu de \"YFX_T_Menu\"");
    T.assert(Number(e.property(1).value) === 2, "menu d\u00e9roulant : valeur lue " + e.property(1).value);
    n = Y.ctl.add(L, "slider", "YFX_T_Slider", 0).name;
    T.assert(n === "YFX_T_Slider 2", "nom unique : \"" + n + "\" au lieu de \"YFX_T_Slider 2\"");
});

Y.test("Expressions : courbe b\u00e9zier + markers", function (T) {
    var L = T.solid, fd = T.comp.frameDuration, prop, err, idx, v, mx, k, cv, expr;
    var curves = [
        { name: "Expo", b: [0.16, 1, 0.3, 1] },
        { name: "Back", b: [0.34, 1.56, 0.64, 1], over: true },
        { name: "Elastic", b: [0, 0, 1, 1], special: true, over: true },
        { name: "Smooth", b: [0.65, 0, 0.35, 1] }
    ];
    for (k = 0; k < curves.length; k++) {
        cv = Y.ctl.addCurve(L, "YFX_T" + k, curves[k]);
        idx = Y.ctl.add(L, "slider", "YFX_T" + k + "_Sortie", 0).propertyIndex;
        expr = Y.x.LIB_CURVE + "\n" + Y.x.LIB_MARKER + "\n" +
            "var m = yfxPrevMarker(thisLayer, time);\n" +
            "var p = m ? (time - m.time) / (12 * thisComp.frameDuration) : 1;\n" +
            "100 * yfxCurve(p, " + Y.x.ctl(cv.p1) + ", " + Y.x.ctl(cv.p2) + ");";
        Y.x.set(Y.p.parade(L).property(idx).property(1), expr);
        if (k === 0) { Y.m.add(L, 1, "test"); }
        prop = Y.p.parade(L).property(idx).property(1);
        err = Y.x.check(prop, [0.5, 1, 1 + 6 * fd]);
        T.assert(!err, curves[k].name + " : " + err);
        v = [prop.valueAtTime(0.5, false), prop.valueAtTime(1, false), prop.valueAtTime(1 + 12 * fd, false)];
        T.assert(T.near(v[0], 100, 0.5) && T.near(v[1], 0, 0.5) && T.near(v[2], 100, 0.5),
                 curves[k].name + " : bornes " + v.join(" / ") + " au lieu de 100 / 0 / 100");
        mx = 0;
        for (var j = 0; j <= 12; j++) { mx = Math.max(mx, prop.valueAtTime(1 + j * fd, false)); }
        if (curves[k].over) { T.assert(mx > 100.5, curves[k].name + " : pas d'overshoot (max " + mx + ")"); }
        T.info(curves[k].name + " : mi-course " + Y.u.round(prop.valueAtTime(1 + 6 * fd, false), 1) + ", max " + Y.u.round(mx, 1));
    }
});

Y.test("Expressions : l'autre moteur", function (T) {
    var cur, other, eff, err = "";
    if (app.project.numItems > 25) {
        T.skip("projet charg\u00e9 : lance l'auto-test dans un projet vide pour tester les 2 moteurs");
        return;
    }
    eff = Y.p.findEffect(T.solid, "YFX_T1_Sortie");
    if (!eff) { T.skip("le test pr\u00e9c\u00e9dent n'a pas cr\u00e9\u00e9 YFX_T1_Sortie"); return; }
    cur = app.project.expressionEngine;
    other = (cur === "extendscript") ? "javascript-1.0" : "extendscript";
    try {
        app.project.expressionEngine = other;
        err = Y.x.check(Y.p.findEffect(T.solid, "YFX_T1_Sortie").property(1), [0.5, 1.1]);
    } finally {
        app.project.expressionEngine = cur;
    }
    T.info("test\u00e9 avec le moteur : " + other + " (remis sur " + cur + ")");
    T.assert(!err, "erreur avec le moteur " + other + " : " + err);
});

Y.test("Markers", function (T) {
    var L = T.text, t;
    Y.m.add(L, 1, "A");
    Y.m.add(L, 2.5, "B");
    t = Y.m.times(L);
    T.assert(t.length === 2 && T.near(t[0], 1) && T.near(t[1], 2.5), "markers lus : " + t.join(", "));
    T.assert(Y.m.prop(L).keyValue(2).comment === "B", "commentaire du marker");
    Y.m.prop(L).removeKey(2);
    Y.m.prop(L).removeKey(1);
});

Y.test("Keyframes + easing", function (T) {
    var tr = T.solid.property("ADBE Transform Group"), sc = tr.property("ADBE Scale"), pos = tr.property("ADBE Position"), e;
    sc.setValueAtTime(0, [100, 100, 100]);
    sc.setValueAtTime(1, [120, 120, 100]);
    Y.k.ease(sc, 1, 33, 85);
    Y.k.ease(sc, 2, 85, 33);
    e = sc.keyOutTemporalEase(1);
    T.assert(e.length === 3, "scale : " + e.length + " ease(s) au lieu de 3");
    T.assert(T.near(e[0].influence, 85, 0.5), "influence lue : " + e[0].influence);
    pos.setValueAtTime(0, [540, 960]);
    pos.setValueAtTime(1, [540, 900]);
    Y.k.ease(pos, 1, 33, 85);
    T.assert(pos.keyOutTemporalEase(1).length === 1, "position : 1 ease attendu");
    while (sc.numKeys) { sc.removeKey(1); }
    while (pos.numKeys) { pos.removeKey(1); }
    sc.setValue([100, 100, 100]);
    pos.setValue([540, 960]);
});

Y.test("Calques YFX (solide r\u00e9utilis\u00e9)", function (T) {
    var a = Y.l.addSolid(T.comp, "YFX_T_AdjA", [1, 1, 1], "adj", { adjustment: true });
    var b = Y.l.addSolid(T.comp, "YFX_T_AdjB", [1, 1, 1], "adj", { adjustment: true, above: T.text });
    T.assert(a.source.id === b.source.id, "le solide source devrait \u00eatre partag\u00e9");
    T.assert(a.adjustmentLayer && b.adjustmentLayer, "adjustment non activ\u00e9");
    T.assert(T.near(a.inPoint, 0) && T.near(a.outPoint, T.comp.duration), "dur\u00e9e du calque : " + a.inPoint + " > " + a.outPoint);
    T.assert(b.index === T.text.index - 1, "placement au-dessus du calque de r\u00e9f\u00e9rence");
    a.remove();
    b.remove();
});

Y.test("Y.exec : validation et erreurs", function (T) {
    var thrown;
    function tryExec(id, sel) {
        try { Y.exec(id, {}, T.comp, sel); return null; } catch (e) { return e; }
    }
    thrown = tryExec("dev_need_text", [T.solid]);
    T.assert(thrown && thrown.yfx, "un preset texte n'aurait pas d\u00fb passer sur un solide");
    thrown = tryExec("dev_throw", [T.solid]);
    T.assert(thrown && !thrown.yfx, "l'erreur volontaire aurait d\u00fb remonter comme bug");
    thrown = tryExec("dev_ok", [T.solid]);
    T.assert(thrown === null, "un preset valide aurait d\u00fb r\u00e9ussir : " + Y.errText(thrown));
}, { noUndo: true });

// --- Sondes : pr\u00e9parent les prochaines livraisons (informations)
Y.test("Sonde : animators texte", function (T) {
    var L = T.text.duplicate(), an, ai, grp, cands, i, ok = [], ko = [], out = [];
    L.name = "YFX_T_Sonde";
    L.enabled = false;
    try { L.threeDPerChar = true; T.info("threeDPerChar : OK"); } catch (e0) { T.info("threeDPerChar : " + Y.errText(e0)); }
    an = Y.text.animators(L).addProperty("ADBE Text Animator");
    ai = an.propertyIndex;
    Y.text.animators(L).property(ai).name = "YFX_Sonde";
    Y.text.animators(L).property(ai).property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
    Y.text.animators(L).property(ai).property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    cands = ["ADBE Text Position 3D", "ADBE Text Anchor Point 3D", "ADBE Text Scale 3D", "ADBE Text Skew",
             "ADBE Text Rotation", "ADBE Text Rotation X", "ADBE Text Rotation Y", "ADBE Text Opacity",
             "ADBE Text Fill Color", "ADBE Text Stroke Color", "ADBE Text Tracking Amount", "ADBE Text Blur",
             "ADBE Text Character Offset", "ADBE Text Line Spacing"];
    for (i = 0; i < cands.length; i++) {
        grp = Y.text.animators(L).property(ai).property("ADBE Text Animator Properties");
        if (grp.canAddProperty(cands[i])) {
            try { grp.addProperty(cands[i]); ok.push(cands[i]); } catch (e1) { ko.push(cands[i] + " (" + e1.message + ")"); }
        } else {
            ko.push(cands[i]);
        }
    }
    T.info("ajout\u00e9s : " + ok.join(", "));
    if (ko.length) { T.info("refus\u00e9s : " + ko.join(", ")); }
    Y.dev.dumpProp(Y.text.animators(L).property(ai), 0, out);
    for (i = 0; i < out.length; i++) { T.info(out[i]); }
});

Y.test("Sonde : effets", function (T) {
    var i, j, r, q = [/chromatic/i, /pixel motion/i, /add grain/i, /lumetri/i, /^glow$/i, /deep glow/i, /channels/i, /exposure/i];
    for (i = 0; i < Y.dev.PROBE.length; i++) {
        T.info((Y.fx.has(Y.dev.PROBE[i]) ? "ok      " : "ABSENT  ") + Y.dev.PROBE[i] + " (" + Y.fx.label(Y.dev.PROBE[i]) + ")");
    }
    for (i = 0; i < q.length; i++) {
        r = Y.fx.search(q[i]);
        for (j = 0; j < r.length && j < 6; j++) { T.info("recherche " + q[i] + " : " + r[j].name + " <" + r[j].match + "> [" + r[j].cat + "]"); }
        if (!r.length) { T.info("recherche " + q[i] + " : rien"); }
    }
});

Y.test("Sonde : param\u00e8tres Transform, Motion Tile, Exposure", function (T) {
    var L = T.solid.duplicate(), mns = ["ADBE Geometry2", "ADBE Tile", "ADBE Exposure2"], i, out = [];
    L.name = "YFX_T_SondeFx";
    L.enabled = false;
    for (i = 0; i < mns.length; i++) {
        Y.p.addEffect(L, mns[i], "YFX_Sonde" + i);
        Y.dev.dumpProp(Y.p.findEffect(L, "YFX_Sonde" + i), 0, out);
    }
    for (i = 0; i < out.length; i++) { T.info(out[i]); }
});

Y.test("Sonde : commandes de menu", function (T) {
    var names = ["Convert Audio to Keyframes", "Pre-compose...", "Sequence Layers...", "Stroke", "Drop Shadow", "Add Marker"], i, id;
    for (i = 0; i < names.length; i++) {
        try { id = app.findMenuCommandId(names[i]); } catch (e) { id = "erreur : " + e.message; }
        T.info(names[i] + " -> " + id);
    }
});

Y.test("Sonde : polices (styles)", function (T) {
    var all, fam = {}, i, j, want, found = [], missing = [];
    if (!app.fonts) { T.info("API app.fonts absente"); return; }
    all = app.fonts.allFonts;
    for (i = 0; i < all.length; i++) {
        for (j = 0; j < all[i].length; j++) { fam[String(all[i][j].familyName).toLowerCase()] = true; }
    }
    T.info(Y.u.objKeys(fam).length + " familles de polices");
    want = ["Tungsten", "Bebas Neue", "Anton", "Oswald", "Impact", "Montserrat", "Rajdhani", "Teko", "Stratum2", "Barlow Condensed"];
    for (i = 0; i < want.length; i++) {
        if (fam[want[i].toLowerCase()]) { found.push(want[i]); } else { missing.push(want[i]); }
    }
    T.info("install\u00e9es : " + (found.length ? found.join(", ") : "aucune"));
    T.info("absentes : " + (missing.length ? missing.join(", ") : "aucune"));
});
// ---- src/85_api.jsx ----
// =====================================================================
// API appel\u00e9e par le panel CEP : YFX.api.call("<json>") -> "<json>"
// Requ\u00eate  : { cmd: "apply", args: { id: "pop", params: { frames, intensity, curve, dir, by } } }
// R\u00e9ponse  : { ok: true, data: ... } ou { ok: false, error: "message", user: true si erreur utilisateur }
// Aucune bo\u00eete de dialogue c\u00f4t\u00e9 moteur : le panel affiche tout.
// =====================================================================
Y.api = {};

Y.api.context = function () {
    var comp, sel, out = [], i, L;
    if (!app.project) { return { project: false, comp: null, sel: [] }; }
    comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { return { project: true, comp: null, sel: [] }; }
    sel = comp.selectedLayers;
    for (i = 0; i < sel.length; i++) {
        L = sel[i];
        out.push({ name: L.name, kind: Y.l.kind(L), locked: !!L.locked, index: L.index });
    }
    return {
        project: true,
        comp: {
            name: comp.name, fps: Y.u.round(comp.frameRate, 3), w: comp.width, h: comp.height,
            time: comp.time, tc: Y.u.tc(comp.time, comp), dur: Y.u.tc(comp.duration, comp),
            layers: comp.numLayers, items: app.project.numItems
        },
        sel: out
    };
};

Y.api.cmd = {
    ping: function () {
        return { version: Y.VERSION, build: Y.BUILD, ae: app.version, engine: Y.env.engine(), lang: app.isoLanguage, path: Y.bootPath };
    },
    presets: function () {
        return Y.reg.ids();
    },
    context: function () {
        return Y.api.context();
    },
    env: function () {
        var a = Y.paths.assets();
        return {
            canWrite: Y.env.canWrite(), assets: a ? a.fsName : null, userDir: Y.paths.userDir().fsName,
            thirdParty: Y.fx.thirdParty()
        };
    },
    setAssets: function (a) {
        Y.cfg.data.assetsPath = String(a.path || "");
        Y.cfg.save();
        var f = Y.paths.assets();
        return { assets: f ? f.fsName : null };
    },
    apply: function (a) {
        return { msg: Y.exec(String(a.id), a.params || {}) };
    },
    sfx: function (a) {
        return { msg: Y.audio.place(String(a.path), a.mode === "markers" ? "markers" : "cti") };
    },
    autotest: function () {
        return Y.dev.autotest();
    },
    dump: function () {
        return Y.dev.dump();
    },
    effects: function () {
        return Y.dev.effectsList();
    },
    openLog: function () {
        return Y.dev.openLog();
    },
    pvInfo: function () {
        return Y.pv.info();
    },
    pvBegin: function () {
        return Y.pv.begin();
    },
    pvRender: function (a) {
        return Y.pv.render(a);
    },
    pvEnd: function (a) {
        return Y.pv.end(a);
    }
};

Y.api.call = function (reqText) {
    var req, fn, data;
    try {
        req = Y.json.parse(reqText);
    } catch (e) {
        return Y.json.stringify({ ok: false, error: "Requ\u00eate du panel illisible." });
    }
    fn = Y.api.cmd[req && req.cmd];
    if (!fn) { return Y.json.stringify({ ok: false, error: "Commande inconnue : " + (req ? req.cmd : "?") }); }
    try {
        data = fn(req.args || {});
        return Y.json.stringify({ ok: true, data: data === undefined ? null : data });
    } catch (e2) {
        if (!(e2 && e2.yfx)) { Y.log("ERROR", "api " + req.cmd + " : " + Y.errText(e2)); }
        return Y.json.stringify({ ok: false, error: Y.errText(e2), user: !!(e2 && e2.yfx) });
    }
};
// ---- src/99_footer.jsx ----
// =====================================================================
// D\u00c9MARRAGE DU MOTEUR : expos\u00e9 au panel sous $.global.YFX
// =====================================================================
try { Y.cfg.load(); } catch (eCfg) {}
$.global.YFX = Y;
Y.log("INFO", "moteur charg\u00e9 v" + Y.VERSION + " (build " + Y.BUILD + ") | AE " + app.version + " | " + (Y.bootPath || "?"));

})(this);
