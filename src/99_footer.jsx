// =====================================================================
// DÉMARRAGE DU MOTEUR : exposé au panel sous $.global.YFX
// =====================================================================
try { Y.cfg.load(); } catch (eCfg) {}
$.global.YFX = Y;
Y.log("INFO", "moteur chargé v" + Y.VERSION + " (build " + Y.BUILD + ") | AE " + app.version + " | " + (Y.bootPath || "?"));

})(this);
