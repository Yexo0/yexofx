// =====================================================================
// OUTILS DE DEV v1.0 : sonde des effets, auto-test des recettes (piloté par le panel, preset par preset).
// =====================================================================

// Effets à sonder en plus de ceux des primitives (presets v0.6).
Y.dev.PROBE_EXTRA = ["ADBE Lumetri", "ADBE Drop Shadow", "ADBE Ramp", "ADBE Glo2", "ADBE Noise", "ADBE Grid", "ADBE Fill",
                     "ADBE Shift Channels", "ADBE Tint", "ADBE Exposure2", "ADBE CHANNEL MIXER", "ADBE Fractal Noise"];

// Liste plate des paramètres d'un effet : [{ name, mn, depth }].
Y.dev.paramList = function (g, depth, out) {
    var i, p;
    out = out || [];
    for (i = 1; i <= g.numProperties; i++) {
        p = g.property(i);
        out.push({ name: p.name, mn: p.matchName, depth: depth || 0, group: p.propertyType !== PropertyType.PROPERTY });
        if (p.propertyType !== PropertyType.PROPERTY && p.numProperties) { Y.dev.paramList(p, (depth || 0) + 1, out); }
    }
    return out;
};

// Sonde : ajoute chaque effet utilisé par les primitives sur un solide temporaire et note ses paramètres
// (nom affiché + matchName). Écrit probe_<date>.txt (lisible) et probe_<date>.json (pour moi).
Y.dev.probe = function () {
    var mns = [], seen = {}, i, j, d, comp, L, src, eff, out = [], data = {}, miss = [], f, fj, n = 0;
    if (!app.project) { Y.fail(Y.MSG.noProject); }
    for (i = 0; i < Y.prim.list.length; i++) {
        d = Y.prim.list[i].fx || [];
        for (j = 0; j < d.length; j++) { if (!seen[d[j]]) { seen[d[j]] = true; mns.push(d[j]); } }
    }
    for (j = 0; j < Y.dev.PROBE_EXTRA.length; j++) { if (!seen[Y.dev.PROBE_EXTRA[j]]) { seen[Y.dev.PROBE_EXTRA[j]] = true; mns.push(Y.dev.PROBE_EXTRA[j]); } }
    out.push("YexoFX " + Y.VERSION + " | sonde des effets | " + Y.u.stamp() + " | AE " + app.version + " | langue " + app.isoLanguage);
    Y.fx.scan();
    app.beginUndoGroup("YexoFX : sonde des effets");
    try {
        comp = app.project.items.addComp("YFX_PROBE", 1080, 1920, 1, 2, 60);
        L = comp.layers.addSolid([0.5, 0.5, 0.5], "YFX_PROBE_SOLIDE", 1080, 1920, 1, 2);
        src = L.source;
        for (i = 0; i < mns.length; i++) {
            if (!Y.fx.has(mns[i])) { miss.push(mns[i]); out.push(""); out.push("=== ABSENT : " + mns[i]); continue; }
            try {
                eff = Y.p.addEffect(L, mns[i], "P" + i);
                out.push("");
                out.push("=== " + mns[i] + " (" + Y.fx.label(mns[i]) + ")");
                Y.dev.dumpProp(eff, 1, out);
                data[mns[i]] = { label: Y.fx.label(mns[i]), params: Y.dev.paramList(Y.p.findEffect(L, "P" + i), 0) };
                n++;
            } catch (e) {
                out.push("! " + mns[i] + " : " + Y.errText(e));
            }
        }
    } finally {
        try { comp.remove(); } catch (e2) {}
        try { if (src) { src.remove(); } } catch (e3) {}
        app.endUndoGroup();
    }
    out.push("");
    out.push("Absents : " + (miss.length ? miss.join(", ") : "aucun"));
    out.push("Effets tiers : " + Y.fx.thirdParty().join(", "));
    f = Y.dev.saveText("probe_" + Y.u.stamp(true) + ".txt", out.join("\n"), true);
    fj = Y.dev.saveText("probe_" + Y.u.stamp(true) + ".json", Y.json.stringify({ ae: app.version, lang: app.isoLanguage, effects: data, missing: miss, third: Y.fx.thirdParty() }, " "), false);
    Y.log("INFO", "sonde : " + n + " effets, " + miss.length + " absent(s)");
    return { path: f ? f.fsName : null, json: fj ? fj.fsName : null, count: n, missing: miss, text: f ? null : out.join("\n") };
};


// ---------------------------------------------------------------- auto-test des recettes
// rxBegin : comp de test (solide, texte, 2 clips en précomp avec des images avant / après la coupe).
// rxTest {def} : applique une recette (ou un preset natif) sur des copies, vérifie les expressions des calques touchés.
// rxEnd : écrit le rapport autotest_recettes_<date>.txt.
Y.dev.rx = null;

Y.dev.rxBegin = function () {
    var T, pc, bg, A, B;
    if (!app.project) { Y.fail("Ouvre un projet (idéalement un projet vide) avant l'auto-test."); }
    app.beginUndoGroup("YexoFX : auto-test (préparation)");
    try {
        T = Y.dev.setup();
        pc = app.project.items.addComp("YFX_TEST_CLIP", 1080, 1920, 1, 12, 60);
        pc.parentFolder = Y.proj.folder("YFX_Tests");
        bg = pc.layers.addSolid([0.2, 0.25, 0.3], "Fond", 1080, 1920, 1, 12);
        try { Y.p.addEffect(bg, "ADBE Ramp", "Degrade"); } catch (e) {}
        A = T.comp.layers.add(pc);
        A.name = "YFX_TEST_CLIP_A";
        A.startTime = -2;
        A.inPoint = 0;
        A.outPoint = 2.5;
        B = T.comp.layers.add(pc);
        B.name = "YFX_TEST_CLIP_B";
        B.startTime = 0.5;
        B.inPoint = 2.5;
        B.outPoint = 5;
        T.clipA = A;
        T.clipB = B;
    } finally {
        app.endUndoGroup();
    }
    Y.dev.rx = { T: T, lines: [], ok: 0, ko: 0, skip: 0, t0: Y.u.ms() };
    Y.dev.rx.lines.push("YexoFX " + Y.VERSION + " | build " + Y.BUILD + " | auto-test des recettes du " + Y.u.stamp());
    Y.dev.rx.lines.push("AE " + app.version + " | langue " + app.isoLanguage + " | moteur d'expressions " + Y.env.engine());
    Y.dev.rx.lines.push("");
    return { ok: true };
};

Y.dev.rxTest = function (a) {
    var R = Y.dev.rx, T, def = a.def, p, sel = [], dup = [], before, comp, i, errs = [], msg, t0 = Y.u.ms(), host, needs, title, added, seen = {}, out;
    if (!R) { Y.fail("Auto-test non démarré (rxTestBegin)."); }
    T = R.T;
    comp = T.comp;
    title = (def.name || def.id) + " [" + def.id + "]";
    host = def.host || "any";
    needs = def.needs && def.needs.sel ? def.needs.sel : "comp";
    if (needs === "audio" || def.tool) { R.skip++; R.lines.push("[IGNORÉ] " + title + " : à tester à la main"); return { id: def.id, skip: true }; }
    before = comp.numLayers;
    app.beginUndoGroup("YexoFX : test " + def.id);
    try {
        if (needs === "text" || host === "text") { dup.push(T.text.duplicate()); }
        else if (needs === "two" || host === "two") { dup.push(T.clipA.duplicate()); dup.push(T.clipB.duplicate()); }
        else if (needs === "av" || host === "clip") { dup.push(T.clipA.duplicate()); }
        else if (needs === "layer" || host === "layer") { dup.push(T.solid.duplicate()); }
        else if (def.needs && def.needs.layers3d) { dup.push(T.solid.duplicate()); dup.push(T.text.duplicate()); }
        for (i = 0; i < dup.length; i++) { dup[i].name = "T_" + def.id + (i ? "_" + (i + 1) : ""); dup[i].enabled = true; sel.push(dup[i]); }
        comp.time = (needs === "two" || host === "two") ? 2.5 : 1;
    } finally {
        app.endUndoGroup();
    }
    try {
        if (def.impl === "native") {
            p = Y.reg.byId[def.id];
            if (!p) { throw new Error("preset natif absent du moteur"); }
            msg = Y.execP(p, a.params || {}, comp, sel);
        } else {
            msg = Y.rx.exec(def, a.params || {}, comp, sel);
        }
        added = comp.numLayers - before;
        for (i = 1; i <= Math.min(comp.numLayers, added + dup.length + 2); i++) {
            Y.dev.scanExpr(comp.layer(i), comp.layer(i), [0, 0.5, 1, 1.05, 1.1, 1.3, 2, 2.4, 2.5, 2.6, 3, 4], errs, seen, "");
        }
    } catch (e) {
        errs.push(Y.errText(e));
    }
    for (i = 1; i <= Math.min(comp.numLayers, comp.numLayers - before + 2); i++) {
        try { if (Y.u.begins(comp.layer(i).name, "YFX_") || Y.u.begins(comp.layer(i).name, "T_")) { comp.layer(i).enabled = false; } } catch (e2) {}
    }
    if (errs.length) {
        R.ko++;
        R.lines.push("[ÉCHEC] " + title + " : " + errs.length + " erreur(s)");
        for (i = 0; i < errs.length && i < 8; i++) { R.lines.push("      " + errs[i]); }
        out = { id: def.id, ok: false, errs: errs, ms: Y.u.ms() - t0 };
    } else {
        R.ok++;
        R.lines.push("[OK] " + title + " (" + (Y.u.ms() - t0) + " ms)");
        out = { id: def.id, ok: true, ms: Y.u.ms() - t0, msg: msg };
    }
    return out;
};

Y.dev.rxEnd = function () {
    var R = Y.dev.rx, f, text;
    if (!R) { return { path: null }; }
    R.lines.push("");
    R.lines.push("BILAN : " + R.ok + " OK, " + R.ko + " échec(s), " + R.skip + " ignoré(s) | " + Math.round((Y.u.ms() - R.t0) / 1000) + " s");
    R.lines.push("Les calques de test de la comp YFX_TEST sont désactivés (oeil) : active-les pour voir le rendu.");
    text = R.lines.join("\n");
    f = Y.dev.saveText("autotest_recettes_" + Y.u.stamp(true) + ".txt", text, true);
    Y.dev.rx = null;
    Y.log("INFO", "auto-test des recettes : " + R.ok + " OK, " + R.ko + " échec(s)");
    return { path: f ? f.fsName : null, ok: R.ok, ko: R.ko, skip: R.skip, text: f ? null : text };
};
