// =====================================================================
// PREVIEWS : les vidéos des cartes du panel, rendues dans AE.
// Le panel appelle :
//   pvInfo   (sans rien modifier) : source qui sera utilisée, rendus déjà en file d'attente
//   pvBegin  : scène de démo (ou ton clip sélectionné), modèle de sortie H.264, file d'attente mise de côté
//   pvRender : une comp de démo par preset (1080x1352 · 60 i/s · 2 s), preset appliqué, rendu en .mp4
//   pvEnd    : ménage (comps et solides de démo supprimés, file d'attente rétablie)
// La compression en WebM (léger, lisible par le panel) est faite ensuite par le panel avec ffmpeg.
// =====================================================================
Y.pv = {
    st: null,
    W: 1080, H: 1352, FPS: 60, DUR: 2,
    HIT: 0.7,       // moment du kill dans la preview (CTI des presets d'impact)
    CUT: 1.0,       // coupe des transitions
    TEXT_IN: 0.3,   // entrée du texte
    FOLDER: "YFX_Previews",
    KILL_A: 1.2,    // kill de la scène de démo, plan A (0-3 s)
    KILL_B: 4.2,    // plan B (3-6 s)
    SHOT_B: 3.6     // moment du plan B montré après la coupe
};

Y.pv.rawDir = function () {
    return new Folder(Y.paths.userDir().fsName + "/previews_raw");
};

// Calque sélectionné utilisable comme source (footage vidéo ou précomp) dans la comp active.
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
            return { item: s, time: Math.max(0, (comp.time - L.startTime) * 100 / (L.stretch || 100)), label: L.name + " à " + Y.u.tc(comp.time, comp) };
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

// Modèle de sortie : H.264 le plus léger (AE 2023+), sinon Lossless (gros fichier, compressé ensuite).
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

// ------------------------------------------------------------------ scène de démo
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

// Un plan de la scène : fond en dégradé, grille qui défile, cible qui traverse et « meurt » au viseur.
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
        Y.log("WARN", "preview : grille ignorée (" + Y.errText(e) + ")");
        grid.remove();
    }

    // cible : corps + tête, traverse l'écran et passe sous le viseur au moment du kill
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

    // viseur (HUD) : 4 traits + point, à hauteur de tête
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

// Scène de démo 6 s : plan A (lavande, cible rouge vers la droite), plan B (ambre, cible lavande vers la gauche).
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

// Calque source dans la comp de preview : la scène de démo ou ton clip, calé pour que tSrc tombe à tPv.
Y.pv.addSource = function (comp, st, tSrc, tPv, inP, outP) {
    var L = comp.layers.add(st.item), end;
    L.startTime = tPv - tSrc;
    end = (st.item.duration > 0) ? L.startTime + st.item.duration : outP;
    if (Math.min(outP, end) - Math.max(inP, L.startTime) < comp.frameDuration * 2) {
        Y.fail("Ton clip est trop court autour du CTI pour une preview : place le CTI au milieu du clip (au moins 1,5 s après).");
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
        // modèle de sortie : lu sur un élément de rendu temporaire
        rqi = app.project.renderQueue.items.add(st.item);
        tpl = Y.pv.pickTemplate(rqi.outputModule(1));
        rqi.remove();
        if (!tpl) { Y.fail("Aucun modèle de sortie H.264 ni Lossless dans ton AE : impossible de rendre les previews."); }
        st.template = tpl;
    } catch (e) {
        Y.pv.end({});
        throw e;
    }
    Y.log("INFO", "previews : début (" + (st.label || "scène de démo") + ", modèle " + st.template.name + ")");
    return { source: st.label, template: st.template.name, raw: Y.pv.rawDir().fsName, queued: st.queued.length };
};

// a = { id, kind: hit|text|cut, word, params, keep }
Y.pv.render = function (a) {
    var st = Y.pv.st, id = String(a.id || ""), p = Y.reg.byId[id], kind = String(a.kind || "hit");
    var comp, L, L2, T, sel = [], msg, rqi, om, file, out, t0 = Y.u.ms(), params = a.params || {};
    if (!st) { Y.fail("Génération des previews non démarrée (pvBegin)."); }
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

// Ménage : comps de démo, solides des presets créés pour ces comps, file d'attente rétablie.
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
    } catch (e1) { Y.log("WARN", "previews : ménage incomplet (" + Y.errText(e1) + ")"); }
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
    Y.log("INFO", "previews : fin (" + st.made + " rendue(s), " + n + " élément(s) retiré(s))");
    return { removed: n, made: st.made };
};
