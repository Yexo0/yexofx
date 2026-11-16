// =====================================================================
// CORE : messages, prérequis de sélection, config, registre, exécution
// Le panel CEP envoie : id du preset + paramètres (durée, intensité, courbe...).
// =====================================================================

Y.cleanHooks = [];   // function (layer) -> nombre d'éléments YFX retirés par "Nettoyer"

Y.MSG = {
    noProject: "Aucun projet ouvert.",
    noComp: "Aucune composition active. Ouvre ta comp et clique dans sa timeline, puis relance.",
    layer: "Sélectionne au moins un calque dans la timeline.",
    av: "Sélectionne au moins un calque visuel : footage, précomp, solide, texte ou forme.",
    text: "Sélectionne au moins un calque texte (T) dans la timeline.",
    audio: "Sélectionne un calque qui contient de l'audio.",
    two: "Sélectionne exactement 2 calques : le plan sortant puis le plan entrant.",
    locked: function (L) {
        return "Le calque \"" + L.name + "\" est verrouillé (cadenas). Déverrouille-le puis relance.";
    }
};

// needs d'un preset -> règles de validation.
// min/max = nombre de calques valides requis ; write:false = calques verrouillés tolérés.
// "any" = calques visuels sélectionnés si présents, sinon le preset crée son propre calque.
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
// CONFIG : %APPDATA%\YexoFX\config.json (côté moteur : dossier assets)
// Les préférences d'interface (favoris, durées, courbes) sont gérées par le panel.
// =====================================================================
Y.cfg = { data: null };

Y.cfg.defaults = function () {
    return { version: 2, assetsPath: "" };
};

Y.cfg.load = function () {
    var d = Y.cfg.defaults(), txt = null, o = null;
    try { txt = Y.f.read(Y.paths.configFile()); } catch (e) {}
    if (txt) {
        try { o = Y.json.parse(txt); } catch (e2) { Y.log("WARN", "config.json illisible : valeurs par défaut."); }
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
        Y.log("WARN", "config non sauvée : " + Y.errText(e));
        return false;
    }
};


// =====================================================================
// REGISTRE DES PRESETS (côté moteur)
// L'id doit correspondre à celui du catalogue du panel (cep/js/catalog.js) :
// le panel n'active que les presets que ce registre connaît.
//   id, name, needs (none|comp|any|layer|av|text|audio|two), run(ctx) -> message
//   f      durée par défaut en images (si le panel n'en envoie pas)
//   noUndo true = pas d'undo group ; hidden true = jamais proposé au panel
//   autotest false = ignoré par l'auto-test
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
// PARAMÈTRES ENVOYÉS PAR LE PANEL (normalisés)
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
// CONTEXTE D'EXÉCUTION
// Valide comp / sélection selon p.needs. Lance Y.fail() avec un message clair sinon.
// comp et sel sont optionnels (auto-test) : par défaut, comp active + calques sélectionnés.
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
// Y.exec : point d'entrée UNIQUE de tous les presets.
// Validation -> undo group -> exécution. L'undo group est toujours refermé (finally) :
// un Ctrl+Z annule exactement une action. Renvoie le message de statut ;
// lève Y.UserError (message clair) ou Error (bug, avec ligne) en cas d'échec.
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
    if (c.skipped) { msg += " (" + c.skipped + " calque(s) ignoré(s))"; }
    Y.log("INFO", p.id + " : " + msg);
    return msg;
};


// =====================================================================
// PRESETS UTILITAIRES
// =====================================================================
Y.reg.add({
    id: "tools_select_yfx", name: "Sélectionner les calques YFX", needs: "comp",
    run: function (c) {
        var n = 0, i, L, on;
        for (i = 1; i <= c.comp.numLayers; i++) {
            L = c.comp.layer(i);
            on = Y.u.begins(L.name, Y.PREFIX);
            L.selected = on;
            if (on) { n++; }
        }
        return n + " calque(s) YFX sélectionné(s).";
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
        return n ? n + " élément(s) YFX retiré(s) de " + c.layers.length + " calque(s)."
                 : "Rien à nettoyer : aucun élément YFX sur la sélection.";
    }
});
