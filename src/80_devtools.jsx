// =====================================================================
// OUTILS DE DEV : auto-test, dump, liste des effets
// (Je ne peux pas lancer AE : ces outils produisent des rapports texte à m'envoyer.)
// Appelés par le panel via l'API ; aucune boîte de dialogue côté moteur.
// =====================================================================

Y.dev = {};
Y.tests = [];

// Déclare un test du core. o.noUndo = le test gère lui-même ses undo groups.
Y.test = function (name, fn, o) {
    Y.tests.push({ name: name, fn: fn, o: o || {} });
};

// Effets natifs dont les presets livrés ont besoin (doivent TOUS exister).
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

// Effets sondés pour les livraisons suivantes (information seulement).
Y.dev.PROBE = [
    "ADBE Noise", "ADBE Motion Blur", "ADBE Radial Blur", "ADBE Fill", "ADBE Glo2", "ADBE Ramp",
    "ADBE Optics Compensation", "ADBE Lumetri", "ADBE Brightness & Contrast 2", "ADBE Tint",
    "ADBE Displacement Map", "ADBE Wave Warp", "ADBE Posterize Time", "ADBE Echo", "ADBE Box Blur2",
    "CC Light Sweep", "CC Radial Fast Blur", "CC Composite", "CC Force Motion Blur"
];

// Écrit dans %APPDATA%\YexoFX\<nom>. Renvoie le File, ou null si l'écriture est désactivée.
Y.dev.saveText = function (fileName, text, open) {
    var f = new File(Y.paths.userDir().fsName + "/" + fileName);
    if (Y.f.write(f, text)) {
        if (open) { f.execute(); }
        return f;
    }
    return null;
};


// =====================================================================
// DUMP DES PROPRIÉTÉS
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
    if (prop.propertyType === PropertyType.INDEXED_GROUP) { s += "  (indexé)"; }
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
    if (!sel.length) { Y.fail("Sélectionne le ou les calques à analyser."); }
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
    out.push("Effets installés : " + l.length + " | AE " + app.version + " | " + Y.u.stamp());
    out.push("catégorie | nom affiché | matchName");
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

// Lance un test : renvoie 1 (OK), 0 (échec) ou -1 (ignoré).
Y.dev.runOne = function (test, T, line) {
    var t0 = Y.u.ms(), res, i;
    T.lines = [];
    T.skipped = null;
    if (!test.o.noUndo) { app.beginUndoGroup("YexoFX : test " + test.name); }
    try {
        test.fn(T);
        if (T.skipped) {
            line("[IGNORÉ] " + test.name + " : " + T.skipped);
            res = -1;
        } else {
            line("[OK] " + test.name + " (" + (Y.u.ms() - t0) + " ms)");
            res = 1;
        }
    } catch (e) {
        line("[ÉCHEC] " + test.name + " : " + Y.errText(e));
        res = 0;
    } finally {
        if (!test.o.noUndo) { app.endUndoGroup(); }
    }
    for (i = 0; i < T.lines.length; i++) { line("      " + T.lines[i]); }
    return res;
};

// Erreurs d'expression sur toutes les propriétés d'un calque (récursif).
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

// Applique un preset du registre sur une copie du calque de test adapté (ou sans sélection
// pour les presets "comp" / "any"), puis vérifie qu'aucune expression de la comp n'est en erreur.
Y.dev.testPreset = function (p, T, line) {
    var title = Y.reg.title(p) + " [" + p.id + "]", base, dup = null, sel, msg, errs, t0 = Y.u.ms(), res, i;
    if (p.hidden) { return -2; }
    if (p.autotest === false || p.needs === "none" || p.needs === "audio" || p.needs === "two") {
        line("[IGNORÉ] " + title + " : à tester à la main");
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
            line("[ÉCHEC] " + title + " : " + errs.length + " erreur(s) d'expression");
            for (i = 0; i < errs.length; i++) { line("      " + errs[i]); }
            res = 0;
        } else {
            line("[OK] " + title + " (" + (Y.u.ms() - t0) + " ms)" + (msg ? " : " + msg : ""));
            res = 1;
        }
    } catch (e) {
        line("[ÉCHEC] " + title + " : " + Y.errText(e));
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
    if (!app.project) { Y.fail("Ouvre un projet (idéalement un projet vide) avant l'auto-test."); }

    line("YexoFX " + Y.VERSION + " | build " + Y.BUILD + " | auto-test du " + Y.u.stamp());
    line("AE " + app.version + " | langue " + app.isoLanguage + " | " + $.os);
    line("Moteur d'expressions du projet : " + Y.env.engine());
    line("Moteur YexoFX : " + (Y.bootPath || "?"));
    line("");

    app.beginUndoGroup("YexoFX : auto-test (préparation)");
    try {
        T = Y.dev.setup();
    } catch (e) {
        line("[ÉCHEC] Préparation de la comp de test : " + Y.errText(e));
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
        line("Les calques T_* de la comp YFX_TEST sont désactivés (oeil) : active-les pour voir le rendu.");
    }

    line("");
    line("BILAN : " + nOk + " OK, " + nKo + " échec(s), " + nSkip + " ignoré(s) | " + (Y.u.ms() - t0) + " ms");
    f = Y.dev.saveText("autotest_" + Y.u.stamp(true) + ".txt", R.join("\n"), true);
    Y.log("INFO", "auto-test : " + nOk + " OK, " + nKo + " échec(s), " + nSkip + " ignoré(s)");
    return { path: f ? f.fsName : null, ok: nOk, ko: nKo, skip: nSkip, text: f ? null : R.join("\n") };
};


// =====================================================================
// PRESETS CACHÉS (servent uniquement aux tests de Y.exec)
// =====================================================================
Y.reg.add({ id: "dev_need_text", name: "test", needs: "text", hidden: true,
    run: function () { return "ne devrait pas s'exécuter sur un solide"; } });
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
    T.info("Écriture de fichiers autorisée : " + (Y.env.canWrite() ? "oui" : "NON"));
    T.info("Moteur : " + (sf ? sf.fsName + (sf.exists ? "" : " (INTROUVABLE)") : "?"));
    T.info("Dossier config : " + Y.paths.userDir().fsName);
    T.info("Dossier assets : " + (a ? a.fsName : "introuvable"));
    T.assert(Y.env.ae() >= 22, "AE trop ancien (" + app.version + ") : YexoFX vise AE 2025.");
});

Y.test("JSON (json2)", function (T) {
    var o = { a: 1, b: -2.5, s: "Été \"guillemets\" \\ fin\nligne", t: true, n: null, arr: [1, "x", { k: [] }], vide: {} };
    var r = Y.json.parse(Y.json.stringify(o, "  ")), bad = false;
    T.assert(r.a === 1 && r.b === -2.5 && r.s === o.s && r.t === true && r.n === null, "aller-retour JSON incorrect");
    T.assert(r.arr.length === 3 && r.arr[2].k.length === 0, "tableaux JSON incorrects");
    try { Y.json.parse("{a:1}"); } catch (e) { bad = true; }
    T.assert(bad, "un JSON invalide aurait dû être refusé");
});

Y.test("Fichiers (config, log)", function (T) {
    var f;
    if (!Y.env.canWrite()) {
        T.skip("écriture désactivée : Edit > Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network");
        return;
    }
    f = new File(Y.paths.userDir().fsName + "/_test_ecriture.txt");
    T.assert(Y.f.write(f, "YexoFX é"), "écriture impossible dans " + f.fsName);
    T.assert(Y.f.read(f) === "YexoFX é", "relecture différente");
    f.remove();
    T.assert(Y.cfg.save(), "config.json non sauvé");
});

Y.test("Catalogue d'effets", function (T) {
    var miss = [], i, third;
    Y.fx.scan();
    T.info(Y.fx.all().length + " effets installés");
    for (i = 0; i < Y.dev.NATIVE_CORE.length; i++) {
        if (!Y.fx.has(Y.dev.NATIVE_CORE[i])) { miss.push(Y.dev.NATIVE_CORE[i]); }
    }
    third = Y.fx.thirdParty();
    T.info("Effets tiers détectés : " + (third.length ? third.join(", ") : "aucun"));
    if (miss.length) { T.info("Introuvables : " + miss.join(", ")); }
    T.assert(miss.length === 0, miss.length + " effet(s) natif(s) requis introuvable(s)");
});

Y.test("Contrôles d'expression", function (T) {
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
    e = Y.ctl.add(L, "dropdown", "YFX_T_Menu", 2, ["Entrée", "Sortie", "Les deux"]);
    T.assert(e.name === "YFX_T_Menu", "menu déroulant : nom \"" + e.name + "\" au lieu de \"YFX_T_Menu\"");
    T.assert(Number(e.property(1).value) === 2, "menu déroulant : valeur lue " + e.property(1).value);
    n = Y.ctl.add(L, "slider", "YFX_T_Slider", 0).name;
    T.assert(n === "YFX_T_Slider 2", "nom unique : \"" + n + "\" au lieu de \"YFX_T_Slider 2\"");
});

Y.test("Expressions : courbe bézier + markers", function (T) {
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
        T.skip("projet chargé : lance l'auto-test dans un projet vide pour tester les 2 moteurs");
        return;
    }
    eff = Y.p.findEffect(T.solid, "YFX_T1_Sortie");
    if (!eff) { T.skip("le test précédent n'a pas créé YFX_T1_Sortie"); return; }
    cur = app.project.expressionEngine;
    other = (cur === "extendscript") ? "javascript-1.0" : "extendscript";
    try {
        app.project.expressionEngine = other;
        err = Y.x.check(Y.p.findEffect(T.solid, "YFX_T1_Sortie").property(1), [0.5, 1.1]);
    } finally {
        app.project.expressionEngine = cur;
    }
    T.info("testé avec le moteur : " + other + " (remis sur " + cur + ")");
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

Y.test("Calques YFX (solide réutilisé)", function (T) {
    var a = Y.l.addSolid(T.comp, "YFX_T_AdjA", [1, 1, 1], "adj", { adjustment: true });
    var b = Y.l.addSolid(T.comp, "YFX_T_AdjB", [1, 1, 1], "adj", { adjustment: true, above: T.text });
    T.assert(a.source.id === b.source.id, "le solide source devrait être partagé");
    T.assert(a.adjustmentLayer && b.adjustmentLayer, "adjustment non activé");
    T.assert(T.near(a.inPoint, 0) && T.near(a.outPoint, T.comp.duration), "durée du calque : " + a.inPoint + " > " + a.outPoint);
    T.assert(b.index === T.text.index - 1, "placement au-dessus du calque de référence");
    a.remove();
    b.remove();
});

Y.test("Y.exec : validation et erreurs", function (T) {
    var thrown;
    function tryExec(id, sel) {
        try { Y.exec(id, {}, T.comp, sel); return null; } catch (e) { return e; }
    }
    thrown = tryExec("dev_need_text", [T.solid]);
    T.assert(thrown && thrown.yfx, "un preset texte n'aurait pas dû passer sur un solide");
    thrown = tryExec("dev_throw", [T.solid]);
    T.assert(thrown && !thrown.yfx, "l'erreur volontaire aurait dû remonter comme bug");
    thrown = tryExec("dev_ok", [T.solid]);
    T.assert(thrown === null, "un preset valide aurait dû réussir : " + Y.errText(thrown));
}, { noUndo: true });

// --- Sondes : préparent les prochaines livraisons (informations)
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
    T.info("ajoutés : " + ok.join(", "));
    if (ko.length) { T.info("refusés : " + ko.join(", ")); }
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

Y.test("Sonde : paramètres Transform, Motion Tile, Exposure", function (T) {
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
    T.info("installées : " + (found.length ? found.join(", ") : "aucune"));
    T.info("absentes : " + (missing.length ? missing.join(", ") : "aucune"));
});
