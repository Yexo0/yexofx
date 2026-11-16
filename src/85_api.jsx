// =====================================================================
// API appelée par le panel CEP : YFX.api.call("<json>") -> "<json>"
// Requête  : { cmd: "apply", args: { id: "pop", params: { frames, intensity, curve, dir, by } } }
// Réponse  : { ok: true, data: ... } ou { ok: false, error: "message", user: true si erreur utilisateur }
// Aucune boîte de dialogue côté moteur : le panel affiche tout.
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
        return Y.json.stringify({ ok: false, error: "Requête du panel illisible." });
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
