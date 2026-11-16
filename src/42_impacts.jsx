// =====================================================================
// IMPACTS : combos posés au CTI (ou sur chaque beat d'un calque audio sélectionné).
// Même mécanique que les shakes : calque d'ajustement YFX_<Nom> piloté par ses markers.
// =====================================================================
Y.imp = {};

// Flash d'exposition (IL) qui retombe en "frames" images après chaque marker.
Y.imp.exposureFlash = function (L, base, c, stops, frames, tag) {
    var C = Y.kit.C, nf = Y.kit.controls(L, base, c, [
        ["slider", "flash", "Flash", Y.u.round(stops * c.intensity, 2)],
        ["slider", "fdur", "FlashDuree", frames]
    ]);
    var ex = Y.fxe.add(L, Y.FX.expo, /^exposure$/i, base + "_Exposure");
    Y.fxe.expr(L, ex, Y.FX.expoV,
        Y.x.LIB_MARKER + "\n" + Y.x.LIB_TAG + "\n" +
        "var r = value;\n" +
        "var mk = " + (tag ? "yfxPrevTag(thisLayer, time, \"" + Y.x.esc(tag) + "\")" : "yfxPrevMarker(thisLayer, time)") + ";\n" +
        "if (mk) {\n" +
        "  var fd2 = Math.max(1, " + C("", nf.fdur) + ") * thisComp.frameDuration, t2 = time - mk.time;\n" +
        "  if (t2 < fd2) { r = value + " + C("", nf.flash) + " * (1 - t2 / fd2); }\n" +
        "}\n" +
        "r;");
    return ex;
};

// Écart RGB qui suit l'enveloppe du calque maître L (2 calques d'ajustement sous / au-dessus de L).
Y.imp.rgb = function (c, L, base, n, px, tag) {
    var nr = Y.ctl.add(L, "slider", base + "_RGB", Y.u.round(px * c.intensity, 1)).name;
    var src = Y.kit.layerRef(L.name);
    var place = L.adjustmentLayer ? { after: L } : { before: L };
    Y.rgb.ghosts(c.comp, base, L.inPoint, L.outPoint, place, Y.kit.envCode(n, src, tag) + "var off = " + Y.kit.C(src, nr) + " * ep;");
};

// Zoom punch : scale 100 + Zoom × enveloppe (la courbe Back donne un rebond).
Y.imp.punch = function (L, c, n, zoom, tag) {
    var nz = Y.ctl.add(L, "slider", n.base + "_Zoom", Y.u.round(zoom * c.intensity, 1)).name;
    Y.x.set(Y.shake.trProp(L, n.tr, "scale"), Y.kit.envCode(n, "", tag) + "value + " + Y.kit.C("", nz) + " * e;");
};

// Contrôles Durée + Courbe et Transform, sans secousse.
Y.imp.base = function (L, base, c) {
    var n = Y.kit.controls(L, base, c, [["slider", "dur", "Duree", c.frames], ["curve", "curve"]]);
    n.base = base;
    n.tr = Y.shake.addTransform(L, base, 140);
    return n;
};

Y.shake.preset("killhit", "Kill Hit", 8, true, function (L, c, base, tag) {
    var n = Y.shake.installImpact(L, base, c, { amp: 24, rot: 1.5, freq: 12, axis: 1 }, tag);
    Y.imp.exposureFlash(L, base, c, 1.5, 3, tag);
    Y.imp.rgb(c, L, base, n, 12, tag);
});

Y.shake.preset("shaketwitch", "Shake Twitch", 10, true, function (L, c, base, tag) {
    var C = Y.kit.C, n = Y.shake.installImpact(L, base, c, { amp: 22, rot: 1.2, freq: 12, axis: 1 }, tag);
    var nt = Y.ctl.add(L, "slider", base + "_Twitch", Y.u.round(14 * c.intensity, 1)).name;
    Y.x.set(Y.shake.trProp(L, n.tr, "scale"),
        Y.kit.envCode(n, "", tag) +
        "var r = value;\n" +
        "if (tt < d) {\n" +
        "  seedRandom(mk.index * 31 + fr, true);\n" +
        "  if (random() < 0.5) { r = value + random(-1, 1) * " + C("", nt) + " * ep; }\n" +
        "}\n" +
        "r;");
});

Y.shake.preset("rgbpunch", "RGB Punch", 8, true, function (L, c, base, tag) {
    var n = Y.imp.base(L, base, c);
    Y.imp.punch(L, c, n, 22, tag);
    Y.imp.rgb(c, L, base, n, 18, tag);
});

Y.shake.preset("hspop", "Headshot Pop", 10, true, function (L, c, base, tag) {
    var n = Y.imp.base(L, base, c), rb;
    Y.imp.punch(L, c, n, 40, tag);
    rb = Y.fxe.add(L, Y.FX.radial, /radial (fast )?blur/i, base + "_Blur");
    Y.fxe.expr(L, rb, Y.FX.radAmt, Y.kit.envCode(n, "", tag) + Math.round(60 * c.intensity) + " * ep;");
    Y.imp.exposureFlash(L, base, c, 1.2, 2, tag);
});

Y.shake.preset("bassdrop", "Bass Drop", 14, true, function (L, c, base, tag) {
    var n = Y.shake.installImpact(L, base, c, { amp: 42, rot: 0.8, freq: 9, axis: 3 }, tag);
    Y.imp.exposureFlash(L, base, c, 1.2, 4, tag);
    Y.imp.rgb(c, L, base, n, 10, tag);
});

// Flicker : trois flashs d'exposition très courts (une image sur deux).
Y.shake.preset("flicker", "Flicker", 6, true, function (L, c, base, tag) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "peak", "Flash", Y.u.round(1.6 * c.intensity, 2)],
        ["curve", "curve"]
    ]), ex = Y.fxe.add(L, Y.FX.expo, /^exposure$/i, base + "_Exposure");
    Y.fxe.expr(L, ex, Y.FX.expoV, Y.kit.envCode(n, "", tag) + "(tt < d && fr % 2 == 0) ? value + " + C("", n.peak) + " : value;");
});

// Choppy Hit : cadence 12 i/s pendant l'impact + secousse.
Y.shake.preset("choppy", "Choppy Hit", 12, true, function (L, c, base, tag) {
    var n = Y.shake.installImpact(L, base, c, { amp: 16, rot: 1, freq: 10, axis: 1 }, tag);
    var nr = Y.ctl.add(L, "slider", base + "_Cadence", 12).name;
    var pt = Y.fxe.add(L, Y.FX.post, /posterize time/i, base + "_Posterize");
    Y.fxe.expr(L, pt, Y.FX.postRate, Y.kit.envCode(n, "", tag) + "(tt < d) ? " + Y.kit.C("", nr) + " : 1 / thisComp.frameDuration;");
});

// Glow Hit : les hautes lumières s'embrasent puis retombent.
Y.shake.preset("glowhit", "Glow Hit", 12, true, function (L, c, base, tag) {
    var n = Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "glow", "Glow", Y.u.round(2.2 * c.intensity, 2)],
        ["curve", "curve"]
    ]), gl = Y.fxe.add(L, Y.FX.glow, /^glow$/i, base + "_Glow");
    Y.fxe.set(L, gl, Y.FX.glowThr, 55);
    Y.fxe.set(L, gl, Y.FX.glowRad, 60);
    Y.fxe.expr(L, gl, Y.FX.glowInt, Y.kit.envCode(n, "", tag) + Y.kit.C("", n.glow) + " * ep;");
    Y.imp.exposureFlash(L, base, c, 0.6, 6, tag);
});

// Lens Punch : bombé façon fisheye + zoom.
Y.shake.preset("lenspunch", "Lens Punch", 10, true, function (L, c, base, tag) {
    var n = Y.imp.base(L, base, c), op;
    Y.imp.punch(L, c, n, 16, tag);
    op = Y.fxe.add(L, Y.FX.optics, /optics compensation/i, base + "_Lens");
    Y.fxe.set(L, op, Y.FX.fovRev, 1);
    Y.fxe.expr(L, op, Y.FX.fov, Y.kit.envCode(n, "", tag) + Math.round(45 * c.intensity) + " * ep;");
});
