// =====================================================================
// TWITCH : sauts aléatoires image par image pendant l'impact (scale, glissé + RGB, lumière, flou),
// dans l'esprit du plugin Twitch, en natif. Tous les opérateurs d'un même preset partagent la
// même graine (mk.index + n° d'image) : les sauts sont synchronisés.
// =====================================================================
Y.tw = {};

// Code qui définit v (-1..1 sur les images "allumées", 0 sinon) pour l'opérateur sel (sel = sel de graine).
Y.tw.pick = function (n, salt) {
    return "var v = 0;\n" +
        "if (tt < d) {\n" +
        "  seedRandom(mk.index * 131 + fr * 7 + " + salt + ", true);\n" +
        "  if (random() < " + Y.kit.C("", n.dens) + " / 100) { v = random(-1, 1); }\n" +
        "}\n";
};

Y.tw.controls = function (L, base, c, extra) {
    return Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "dens", "Densite", 55],
        ["curve", "curve"]
    ].concat(extra));
};

Y.tw.scale = function (L, n, tag) {
    Y.x.set(Y.shake.trProp(L, n.tr, "scale"), Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 1) + "value + " + Y.kit.C("", n.sc) + " * v * ep;");
    Y.x.set(Y.shake.trProp(L, n.tr, "anchor"), Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 1) +
        "seedRandom(mk ? mk.index * 17 + fr : 0, true);\n" +
        "(v != 0) ? [value[0] + random(-0.2, 0.2) * thisComp.width, value[1] + random(-0.2, 0.2) * thisComp.height] : value;");
};
Y.tw.slide = function (L, n, tag) {
    Y.x.set(Y.shake.trProp(L, n.tr, "pos"), Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 2) + "[value[0] + " + Y.kit.C("", n.sl) + " * v * ep, value[1]];");
};
Y.tw.light = function (L, base, n, tag) {
    var ex = Y.fxe.add(L, Y.FX.expo, /^exposure$/i, base + "_Exposure");
    Y.fxe.expr(L, ex, Y.FX.expoV, Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 3) + "value + " + Y.kit.C("", n.lt) + " * v * ep;");
};
Y.tw.blur = function (L, base, n, tag) {
    var bb = Y.fxe.add(L, Y.FX.boxBlur, /fast box blur/i, base + "_Blur");
    Y.fxe.expr(L, bb, Y.FX.boxR, Y.kit.envCode(n, "", tag) + Y.tw.pick(n, 4) + Y.kit.C("", n.bl) + " * Math.abs(v) * ep;");
};
// RGB qui ne s'allume que sur les sauts du glissé (même graine que Y.tw.slide).
Y.tw.slideRgb = function (c, L, base, n, tag) {
    var src = Y.kit.layerRef(L.name);
    var nr = Y.ctl.add(L, "slider", base + "_RGB", Y.u.round(10 * c.intensity, 1)).name;
    var place = L.adjustmentLayer ? { after: L } : { before: L };
    Y.rgb.ghosts(c.comp, base, L.inPoint, L.outPoint, place,
        Y.kit.envCode(n, src, tag) +
        "var v = 0;\n" +
        "if (tt < d) { seedRandom(mk.index * 131 + fr * 7 + 2, true); if (random() < " + Y.kit.C(src, n.dens) + " / 100) { v = random(-1, 1); } }\n" +
        "var off = " + Y.kit.C(src, nr) + " * Math.abs(v) * ep;");
};

Y.shake.preset("tw-scale", "Twitch Scale", 8, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [["slider", "sc", "Scale", Y.u.round(14 * c.intensity, 1)]]);
    n.tr = Y.shake.addTransform(L, base, 150);
    Y.tw.scale(L, n, tag);
});
Y.shake.preset("tw-slide", "Twitch Slide", 8, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [["slider", "sl", "Glisse", Y.u.round(40 * c.intensity, 1)]]);
    n.tr = Y.shake.addTransform(L, base, 150);
    Y.tw.slide(L, n, tag);
    Y.tw.slideRgb(c, L, base, n, tag);
});
Y.shake.preset("tw-light", "Twitch Light", 8, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [["slider", "lt", "Lumiere", Y.u.round(1.4 * c.intensity, 2)]]);
    Y.tw.light(L, base, n, tag);
});
Y.shake.preset("tw-blur", "Twitch Blur", 8, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [["slider", "bl", "Flou", Y.u.round(14 * c.intensity, 1)]]);
    Y.tw.blur(L, base, n, tag);
});
Y.shake.preset("tw-full", "Twitch Full", 10, true, function (L, c, base, tag) {
    var n = Y.tw.controls(L, base, c, [
        ["slider", "sc", "Scale", Y.u.round(12 * c.intensity, 1)],
        ["slider", "sl", "Glisse", Y.u.round(30 * c.intensity, 1)],
        ["slider", "lt", "Lumiere", Y.u.round(1.1 * c.intensity, 2)]
    ]);
    n.tr = Y.shake.addTransform(L, base, 150);
    Y.tw.scale(L, n, tag);
    Y.tw.slide(L, n, tag);
    Y.tw.light(L, base, n, tag);
    Y.tw.slideRgb(c, L, base, n, tag);
});
