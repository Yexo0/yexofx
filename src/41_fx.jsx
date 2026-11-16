// =====================================================================
// FX / LOOK
// Effets continus posés sur un calque d'ajustement YFX_<Nom> (ou sur les calques sélectionnés),
// ou sur un calque dédié (grain, vignette, letterbox, light leak, flash).
// =====================================================================
Y.look = {};

// Flash blanc : un solide YFX_Flash dont l'opacité suit les markers. Recliquer ajoute un flash au CTI.
Y.reg.add({
    id: "flash", name: "Flash", needs: "comp", f: 4,
    run: function (c) {
        var name = Y.PREFIX + "Flash", L = Y.l.findByName(c.comp, name), X = Y.x.ctl, n = {};
        if (L) {
            if (L.locked) { Y.fail(Y.MSG.locked(L)); }
            Y.m.add(L, c.time, "flash");
            return "Flash ajouté à " + Y.u.tc(c.time, c.comp) + " sur " + name + " (" + Y.m.prop(L).numKeys + " au total)";
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
        return "Calque " + name + " créé · flash à " + Y.u.tc(c.time, c.comp) + " · recliquer ajoute un flash au CTI";
    }
});

// Calque dédié (solide) : réutilisé s'il existe déjà (sélectionné), sinon créé par make(L).
Y.look.solid = function (id, name, color, tag, make) {
    Y.reg.add({
        id: id, name: name, needs: "comp", f: 0,
        run: function (c) {
            var lname = Y.PREFIX + name.replace(/[^A-Za-z0-9]/g, ""), L = Y.l.findByName(c.comp, lname);
            if (L) {
                L.selected = true;
                return lname + " existe déjà dans la comp : il est sélectionné, règle-le dans Effect Controls.";
            }
            L = Y.l.addSolid(c.comp, lname, color, tag, {});
            make(L, c, lname);
            return "Calque " + lname + " créé sur toute la comp · réglages dans Effect Controls";
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

// Letterbox : bandes noires qui entrent au début du calque et sortent à la fin (calque de 3 s au CTI).
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
        return "Letterbox posé à " + Y.u.tc(c.time, c.comp) + " pour 3 s · rallonge le calque " + lname + " dans la timeline";
    }
});

// Effets d'ajustement continus (calque YFX_<Nom> ou calques sélectionnés).
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

// Étalonnages rapides (Lumetri Color, réglages de base).
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
