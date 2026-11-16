// =====================================================================
// TEXTE : animators + sélecteur d'expression (easing par lettre / mot / ligne)
// Chaque anim pose ses réglages sur le calque texte : Durée, Délai, Mode, Courbe P1/P2.
// Entrée calée sur le In du calque, sortie sur le Out : trimme le calque, l'anim suit.
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

// "Based On" du sélecteur : 2 = caractères (sans espaces), 3 = mots, 4 = lignes.
Y.text.BASED_ON = { car: 2, mot: 3, ligne: 4 };

// Crée un animator nommé avec ses propriétés (props = [{ mn, value, expr }]) et un sélecteur d'expression.
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

// Contrôles communs aux anims de texte. Renvoie les noms réels.
Y.text.controls = function (L, base, c, delayFrames, more) {
    var mode = { "in": 1, out: 2, both: 3 }[c.dir] || 1;
    return Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "delay", "Delai", delayFrames],
        ["dropdown", "mode", "Mode", mode, ["Entrée", "Sortie", "Entrée + sortie"]],
        ["curve", "curve"]
    ].concat(more || []));
};

// Sélecteur "révélation" : 100 = état caché, 0 = état final ; la courbe peut dépasser (overshoot).
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

// Anim "révélation" : props(c, L, n) = propriétés de l'animator ; extra(L, c, base, n) = effets en plus.
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
            return name + " sur " + c.layers.length + " calque(s) texte · " + c.frames + " f · " + c.curve.name + " · réglages " + base + "_*";
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

// Stomp : les lettres tombent d'en haut et secouent le calque à l'atterrissage.
Y.text.reveal("stomp", "Stomp", 10, function (c) {
    return [{ mn: "ADBE Text Position 3D", value: [0, -Math.round(170 * c.intensity), 0] }, { mn: "ADBE Text Scale 3D", value: [140, 140, 100] }, { mn: "ADBE Text Opacity", value: 0 }];
}, function (L, c, base, n) {
    var C = Y.kit.C, tr = Y.shake.addTransform(L, base, 0, 180);
    Y.x.set(Y.shake.trProp(L, tr, "pos"),
        "var land = thisLayer.inPoint + Math.max(1, " + C("", n.dur) + ") * thisComp.frameDuration;\n" +
        "var t = time - land, k = Math.max(0, 1 - t / (8 * thisComp.frameDuration));\n" +
        "(t >= 0 && k > 0) ? [value[0], value[1] + " + Math.round(9 * c.intensity) + " * k * Math.sin(t * 2 * Math.PI * 12)] : value;");
});

// Glitch : décalages aléatoires par lettre + lettres qui flashent en rouge, à l'entrée et / ou à la sortie.
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
        return "Glitch sur " + c.layers.length + " calque(s) texte · " + c.frames + " f";
    }
});

// Scramble : caractères aléatoires qui se résolvent un à un.
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
        return "Scramble sur " + c.layers.length + " calque(s) texte · " + c.frames + " f";
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

// Kinetic : chaque mot arrive sur un marker du calque texte (sinon tous les « Durée » images).
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
        return "Kinetic : un mot par marker du calque texte (pose-les avec Marker au CTI) · " + c.frames + " f";
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
                ["dropdown", "mode", "Mode", { "in": 1, out: 2, both: 3 }[c.dir] || 1, ["Entrée", "Sortie", "Entrée + sortie"]]
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
        return "Typewriter sur " + c.layers.length + " calque(s) texte · curseur réglable (" + base + "_Curseur)";
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
        return "Kill Feed posé à " + Y.u.tc(c.time, comp) + " · double-clique le texte " + base + " pour l'éditer";
    }
});
