/*
 * YexoFX : moteur ExtendScript de l'extension CEP (panel After Effects 2025, edits FPS)
 * ------------------------------------------------------------------
 * Ce fichier est GÉNÉRÉ par build.mjs à partir de src/*.jsx.
 * Ne pas l'éditer à la main : modifier src/ puis relancer le build.
 * Le panel (cep/index.html) l'appelle via YFX.api.call("<json>").
 *
 * ExtendScript = ES3 : pas de let/const, arrow functions, template strings,
 * Array.forEach/map/indexOf, ni JSON natif (json2 embarqué plus bas).
 * Les accents sont encodés en \uXXXX au build : le fichier final est 100 % ASCII.
 */
(function YexoFX(thisObj) {

var Y = {};
Y.VERSION = "0.6.0";
Y.BUILD = "__YFX_BUILD__";
Y.PREFIX = "YFX_";

// Chemin de ce script : fourni par le loader de dev / le bouton Recharger,
// sinon $.fileName. Lu une seule fois, au chargement.
Y.bootPath = null;
try {
    Y.bootPath = $.global.__YFX_PATH__ || $.fileName || null;
    $.global.__YFX_PATH__ = null;
} catch (eBoot) {}


// =====================================================================
// JSON : json2 (Douglas Crockford, domaine public), adapté ES3.
// Sortie 100 % ASCII : tout caractère non ASCII est écrit en \uXXXX.
// =====================================================================
Y.json = (function () {
    var ESC = /[\\\"\u0000-\u001f\u007f-￿]/g;
    var META = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", "\"": "\\\"", "\\": "\\\\" };
    var CX = /[\u0000­؀-؄܏឴឵‌-‏ - ⁠-⁯﻿￰-￿]/g;

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
        text = String(text).replace(/^﻿/, "");
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
