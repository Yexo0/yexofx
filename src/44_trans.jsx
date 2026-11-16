// =====================================================================
// TRANSITIONS : un calque d'ajustement court, centré sur la coupe (2 calques sélectionnés :
// début du plan entrant ; sinon : CTI). Sa longueur = la durée de la transition : raccourcis-le
// ou rallonge-le dans la timeline. Courbe : accélère vers la coupe, freine après.
// =====================================================================
Y.trans = {};

// Crée le calque de transition et ses contrôles communs. Renvoie { L, n, w }.
Y.trans.layer = function (c, name, defs) {
    var w = Y.kit.transWindow(c), lname = Y.kit.freeName(c.comp, Y.PREFIX + name), L, n;
    L = Y.l.addSolid(c.comp, lname, [1, 1, 1], "adj", { adjustment: true, inPoint: w.inT, outPoint: w.outT });
    n = Y.kit.controls(L, lname, c, [["curve", "curve"]].concat(defs || []));
    return { L: L, n: n, w: w, base: lname };
};

Y.trans.preset = function (id, name, f, build) {
    Y.reg.add({
        id: id, name: name, needs: "comp", f: f,
        run: function (c) {
            var t = Y.trans.layer(c, name.replace(/[^A-Za-z0-9]/g, ""), build.defs ? build.defs(c) : []);
            build.run(t, c);
            return name + " posée sur la coupe (" + Y.u.tc(t.w.t, c.comp) + ") · " + c.frames + " f · calque " + t.L.name;
        }
    });
};

var TB = Y.kit.bellCode, TC = Y.kit.C;

Y.trans.preset("zoom", "Zoom in", 12, {
    defs: function (c) { return [["slider", "amt", "Zoom", Math.round(80 * c.intensity)], ["slider", "blur", "Flou", Math.round(70 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 200, 270), rb;
        Y.x.set(Y.shake.trProp(t.L, tr, "scale"), TB(t.n) + "var z = " + TC("", t.n.amt) + ";\nhalf ? 100 - z * 0.5 * (1 - inE) : 100 + z * outE;");
        rb = Y.fxe.add(t.L, Y.FX.radial, /radial (fast )?blur/i, t.base + "_Blur");
        Y.fxe.expr(t.L, rb, Y.FX.radAmt, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("zoomout", "Zoom out", 12, {
    defs: function (c) { return [["slider", "amt", "Zoom", Math.round(45 * c.intensity)], ["slider", "blur", "Flou", Math.round(60 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 300, 270), rb;
        Y.x.set(Y.shake.trProp(t.L, tr, "scale"), TB(t.n) + "var z = " + TC("", t.n.amt) + ";\nhalf ? 100 + z * 1.5 * (1 - inE) : 100 - z * outE;");
        rb = Y.fxe.add(t.L, Y.FX.radial, /radial (fast )?blur/i, t.base + "_Blur");
        Y.fxe.expr(t.L, rb, Y.FX.radAmt, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("whip", "Whip pan", 10, {
    defs: function (c) { return [["slider", "dist", "Distance", Math.round(110 * c.intensity)], ["slider", "blur", "Flou", Math.round(160 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 300, 360), db;
        Y.x.set(Y.shake.trProp(t.L, tr, "pos"), TB(t.n) + "var w = thisComp.width * " + TC("", t.n.dist) + " / 100;\n[value[0] + (half ? w * (1 - inE) : -w * outE), value[1]];");
        db = Y.fxe.add(t.L, Y.FX.dirBlur, /directional blur/i, t.base + "_Blur");
        Y.fxe.set(t.L, db, Y.FX.dirAngle, 90);
        Y.fxe.expr(t.L, db, Y.FX.dirLen, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("spin", "Spin", 12, {
    defs: function (c) { return [["slider", "rot", "Rotation", 150], ["slider", "zoom", "Zoom", Math.round(40 * c.intensity)], ["slider", "blur", "Flou", Math.round(30 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 300, 360), sb;
        Y.x.set(Y.shake.trProp(t.L, tr, "rot"), TB(t.n) + "var a = " + TC("", t.n.rot) + ";\nhalf ? -a * (1 - inE) : a * outE;");
        Y.x.set(Y.shake.trProp(t.L, tr, "scale"), TB(t.n) + "100 + " + TC("", t.n.zoom) + " * bell;");
        sb = Y.fxe.add(t.L, Y.FX.spin, /^radial blur$/i, t.base + "_Blur");
        Y.fxe.set(t.L, sb, Y.FX.spinType, 1);
        Y.fxe.expr(t.L, sb, Y.FX.spinAmt, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("rgbshake", "RGB Shake", 12, {
    defs: function (c) { return [["slider", "amp", "Amplitude", Math.round(90 * c.intensity)], ["slider", "rgb", "RGB", Math.round(16 * c.intensity)]]; },
    run: function (t, c) {
        var tr = Y.shake.addTransform(t.L, t.base, 160, 180), src = Y.kit.layerRef(t.L.name);
        Y.x.set(Y.shake.trProp(t.L, tr, "pos"), TB(t.n) + "[value[0], value[1] + " + TC("", t.n.amp) + " * bell * Math.sin(p * 6 * Math.PI)];");
        Y.rgb.ghosts(c.comp, t.base, t.w.inT, t.w.outT, { after: t.L },
            Y.x.LIB_CURVE + "\nvar M = " + src.substr(0, src.length - 1) + ";\n" +
            "var span = Math.max(thisComp.frameDuration, M.outPoint - M.inPoint);\n" +
            "var p = Math.max(0, Math.min(1, (time - M.inPoint) / span));\n" +
            "var bell = yfxCurve(1 - Math.abs(2 * p - 1), " + TC(src, t.n.curve.p1) + ", " + TC(src, t.n.curve.p2) + ");\n" +
            "var off = " + TC(src, t.n.rgb) + " * bell;");
    }
});
Y.trans.preset("whiteglitch", "White Glitch", 8, {
    defs: function (c) { return [["slider", "amp", "Glitch", Math.round(70 * c.intensity)], ["slider", "flash", "Flash", Y.u.round(2.5 * c.intensity, 2)]]; },
    run: function (t) {
        var ww = Y.fxe.add(t.L, Y.FX.wave, /wave warp/i, t.base + "_Tranches"), ex;
        Y.fxe.set(t.L, ww, Y.FX.waveType, 8);
        Y.fxe.set(t.L, ww, Y.FX.waveDir, 0);
        Y.fxe.set(t.L, ww, Y.FX.waveSpeed, 0);
        Y.fxe.expr(t.L, ww, Y.FX.waveH, TB(t.n) + TC("", t.n.amp) + " * bell;");
        Y.fxe.expr(t.L, ww, Y.FX.waveW, "seedRandom(Math.floor(time / thisComp.frameDuration), true);\nrandom(30, 160);");
        Y.fxe.expr(t.L, ww, Y.FX.wavePhase, "seedRandom(Math.floor(time / thisComp.frameDuration) + 9, true);\nrandom(0, 360);");
        ex = Y.fxe.add(t.L, Y.FX.expo, /^exposure$/i, t.base + "_Exposure");
        Y.fxe.expr(t.L, ex, Y.FX.expoV, TB(t.n) + "value + " + TC("", t.n.flash) + " * Math.pow(bell, 3);");
    }
});
Y.trans.preset("stretch", "Stretch", 10, {
    defs: function (c) { return [["slider", "amt", "Etirement", Math.round(200 * c.intensity)], ["slider", "blur", "Flou", Math.round(120 * c.intensity)]]; },
    run: function (t) {
        var tr = Y.shake.addTransform(t.L, t.base, 200, 270), db;
        Y.fxe.set(t.L, tr, Y.shake.TR.uniform, 0);
        Y.x.set(Y.shake.trProp(t.L, tr, "scaleW"), TB(t.n) + "100 + " + TC("", t.n.amt) + " * bell;");
        db = Y.fxe.add(t.L, Y.FX.dirBlur, /directional blur/i, t.base + "_Blur");
        Y.fxe.set(t.L, db, Y.FX.dirAngle, 90);
        Y.fxe.expr(t.L, db, Y.FX.dirLen, TB(t.n) + TC("", t.n.blur) + " * bell;");
    }
});
Y.trans.preset("tflash", "Flash", 6, {
    defs: function (c) { return [["slider", "flash", "Flash", Y.u.round(3 * c.intensity, 2)]]; },
    run: function (t) {
        var ex = Y.fxe.add(t.L, Y.FX.expo, /^exposure$/i, t.base + "_Exposure");
        Y.fxe.expr(t.L, ex, Y.FX.expoV, TB(t.n) + "value + " + TC("", t.n.flash) + " * bell;");
    }
});

// Pop-in : le plan entrant surgit depuis le centre (effet Transform posé sur le plan entrant).
Y.reg.add({
    id: "popin", name: "Pop-in", needs: "two", f: 10,
    run: function (c) {
        var a = c.layers[0], b = c.layers[1], B, base = Y.PREFIX + "PopIn", n, tr;
        B = (b.inPoint >= a.inPoint) ? b : a;
        n = Y.kit.controls(B, base, c, [["slider", "dur", "Duree", c.frames], ["slider", "from", "Depart", 20], ["curve", "curve"]]);
        tr = Y.shake.addTransform(B, base, 0, 180);
        Y.x.set(Y.shake.trProp(B, tr, "scale"),
            Y.x.LIB_CURVE + "\n" +
            "var d = Math.max(1, " + TC("", n.dur) + ") * thisComp.frameDuration;\n" +
            "var t = (time - thisLayer.inPoint) / d, s0 = " + TC("", n.from) + ";\n" +
            "(t < 1) ? s0 + (100 - s0) * yfxCurve(t, " + TC("", n.curve.p1) + ", " + TC("", n.curve.p2) + ") : 100;");
        return "Pop-in sur " + B.name + " · " + c.frames + " f · réglages " + base + "_*";
    }
});
