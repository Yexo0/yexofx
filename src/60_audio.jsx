// =====================================================================
// AUDIO : import des SFX de la bibliothèque (une seule fois par projet, rangés dans YFX_SFX)
// et placement au CTI ou sur chaque marker du calque sélectionné.
// =====================================================================
Y.audio = {};

// Item de projet déjà importé pour ce fichier, sinon import.
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

// mode "cti" : un calque au CTI ; mode "markers" : un calque sur chaque marker du calque sélectionné.
Y.audio.place = function (path, mode) {
    var comp, file, item, times = [], i, L, sel;
    if (!app.project) { Y.fail(Y.MSG.noProject); }
    comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { Y.fail(Y.MSG.noComp); }
    file = new File(path);
    if (!file.exists) { Y.fail("Son introuvable : " + path); }
    if (mode === "markers") {
        sel = comp.selectedLayers;
        if (!sel.length) { Y.fail("Sélectionne le calque dont les markers doivent recevoir le son."); }
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
    return times.length > 1 ? decodeURI(file.name) + " placé sur " + times.length + " markers"
                            : decodeURI(file.name) + " placé à " + Y.u.tc(times[0], comp);
};
