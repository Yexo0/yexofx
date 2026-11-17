// =====================================================================
// PRIMITIVES : distorsion et numérique.
// =====================================================================
Y.pp = {};

// Écart RGB natif (comme v0.6) : 2 calques d'ajustement rouge seul / bleu seul (Channel Mixer) en mode Éclaircir,
// décalés selon l'axe. offCode définit la variable "off" (pixels), en lisant les réglages du maître (J.src).
Y.pp.ghosts = function (J, s, axis, offCode) {
    var M = J.M, defs = [["R", 1, [["ADBE CHANNEL MIXER-0006", "Green-Green"], ["ADBE CHANNEL MIXER-0011", "Blue-Blue"]]],
                        ["B", -1, [["ADBE CHANNEL MIXER-0001", "Red-Red"], ["ADBE CHANNEL MIXER-0006", "Green-Green"]]]];
    var i, j, L, cm, tn, K, d, move;
    for (i = 0; i < defs.length; i++) {
        L = Y.l.addSolid(J.comp, Y.kit.freeName(J.comp, J.base + "_RGB_" + defs[i][0]), [1, 1, 1], "adj", { adjustment: true, inPoint: M.inPoint, outPoint: M.outPoint });
        if (M.adjustmentLayer) { L.moveAfter(M); } else { L.moveBefore(M); }
        L.blendingMode = BlendingMode.LIGHTEN;
        K = Y.rx.child(J, L);
        K.src = J.src || Y.kit.layerRef(M.name);
        cm = Y.rx.add(K, ["ADBE CHANNEL MIXER", "ADBE Channel Mixer"], /channel mixer/i, "Canaux");
        for (j = 0; j < defs[i][2].length; j++) { Y.rx.set(K, cm, defs[i][2][j], 0); }
        tn = Y.rx.add(K, ["ADBE Geometry2"], /^transform$/i, "Decalage");
        d = defs[i][1];
        move = axis === "v" ? "[value[0], value[1] + " + d + " * off]" : axis === "diag" ? "[value[0] + " + d + " * off, value[1] + " + d + " * off * 0.6]" : "[value[0] + " + d + " * off, value[1]]";
        Y.rx.setx(K, tn, Y.shake.TR.pos, offCode + "\n" + move + ";");
        J.made.push(L.name);
    }
};

Y.prim.def("rgbSplit", {
    label: "RGB", fx: ["ADBE CHANNEL MIXER", "ADBE Geometry2"], cost: 2, hosts: "any adj layer cut clip", main: "px",
    params: { px: ["n", 8, 0, 300, "k"], axis: ["e", "h", ["h", "v", "diag"]], breath: ["n", 0, 0, 1] },
    install: function (I, s) {
        var J = Y.rx.child(I, I.L);
        Y.pp.ghosts(J, s, Y.rx.val(I, s, "axis"), Y.rx.expr(J, s, "var off = " + Y.rx.amt(J, s, "px", true) +
            " * (1 + " + Y.rx.f(Y.rx.val(I, s, "breath")) + " * Math.sin(time * 2.4));"));
    }
});

Y.pp.WAVES = ["sine", "square", "triangle", "sawtooth", "circle", "semicircle", "uncircle", "noise", "smoothnoise"];
Y.prim.def("waveWarp", {
    label: "Onde", fx: ["ADBE Wave Warp"], cost: 2, hosts: "any adj layer cut clip text", main: "height",
    params: {
        type: ["e", "sine", Y.pp.WAVES], height: ["n", 10, 0, 600, "k"], width: ["n", 80, 1, 3000], dir: ["n", 90, 0, 360],
        speed: ["n", 1, 0, 30], jitter: ["b", false]
    },
    install: function (I, s) {
        var ww = Y.rx.add(I, Y.FX.wave, /wave warp/i, "Wave"), V = function (k) { return Y.rx.val(I, s, k); };
        Y.rx.set(I, ww, Y.FX.waveType, Y.u.idx(Y.pp.WAVES, V("type")) + 1);
        Y.rx.set(I, ww, Y.FX.waveDir, V("dir"));
        Y.rx.set(I, ww, Y.FX.waveSpeed, V("speed"));
        Y.rx.setx(I, ww, Y.FX.waveH, Y.rx.expr(I, s, "Math.max(0, " + Y.rx.amt(I, s, "height", true) + ");"));
        if (V("jitter")) {
            Y.rx.setx(I, ww, Y.FX.waveW, "seedRandom(Math.floor(time / thisComp.frameDuration), true);\nrandom(" + Y.rx.f(V("width") * 0.4) + ", " + Y.rx.f(V("width") * 2) + ");");
            Y.rx.setx(I, ww, Y.FX.wavePhase, "seedRandom(Math.floor(time / thisComp.frameDuration) + 9, true);\nrandom(0, 360);");
        } else {
            Y.rx.set(I, ww, Y.FX.waveW, V("width"));
        }
    }
});

Y.prim.def("lens", {
    label: "Lentille", fx: ["ADBE Optics Compensation", "ADBE Bulge", "ADBE Spherize"], cost: 2, hosts: "any adj layer cut clip", main: "amount",
    params: { kind: ["e", "fisheye", ["fisheye", "bulge", "sphere"]], amount: ["n", 30, -200, 200, "k"] },
    install: function (I, s) {
        var k = Y.rx.val(I, s, "kind"), w = I.L.width || I.comp.width, h = I.L.height || I.comp.height, op, a = Y.rx.amt(I, s, "amount");
        if (k === "bulge") {
            op = Y.rx.add(I, ["ADBE Bulge"], /^bulge$/i, "Bulge");
            Y.rx.set(I, op, ["ADBE Bulge-0001", "Horizontal Radius"], w * 0.45);
            Y.rx.set(I, op, ["ADBE Bulge-0002", "Vertical Radius"], h * 0.3);
            Y.rx.setx(I, op, ["ADBE Bulge-0004", "Bulge Height"], Y.rx.expr(I, s, "Math.max(-4, Math.min(4, " + a + " * 0.02));"));
        } else if (k === "sphere") {
            op = Y.rx.add(I, ["ADBE Spherize"], /^spherize$/i, "Sphere");
            Y.rx.setx(I, op, ["ADBE Spherize-0001", "Radius"], Y.rx.expr(I, s, "Math.max(0, " + a + " * " + Y.rx.f(Math.min(w, h) / 200) + ");"));
        } else {
            op = Y.rx.add(I, Y.FX.optics, /optics compensation/i, "Lens");
            Y.rx.set(I, op, ["ADBE Optics Compensation-0002", "Reverse Lens Distortion"], 1);
            Y.rx.setx(I, op, ["ADBE Optics Compensation-0001", "Field Of View (FOV)"], Y.rx.expr(I, s, "Math.max(0, Math.min(180, " + a + "));"));
        }
    }
});

Y.prim.def("warp", {
    label: "Distorsion", fx: ["ADBE Turbulent Displace", "ADBE Twirl", "ADBE Ripple"], cost: 2, hosts: "any adj layer cut clip text", main: "amount",
    params: { kind: ["e", "turbulent", ["turbulent", "twirl", "ripple"]], amount: ["n", 30, -720, 720, "k"], size: ["n", 60, 1, 1000], speed: ["n", 1, 0, 30] },
    install: function (I, s) {
        var k = Y.rx.val(I, s, "kind"), fx, V = function (x) { return Y.rx.val(I, s, x); };
        if (k === "twirl") {
            fx = Y.rx.add(I, ["ADBE Twirl"], /^twirl$/i, "Twirl");
            Y.rx.set(I, fx, ["ADBE Twirl-0002", "Twirl Radius"], Math.min(100, V("size")));
            Y.rx.setx(I, fx, ["ADBE Twirl-0001", "Angle"], Y.rx.expr(I, s, Y.rx.amt(I, s, "amount") + ";"));
        } else if (k === "ripple") {
            fx = Y.rx.add(I, ["ADBE Ripple"], /^ripple$/i, "Ripple");
            Y.rx.set(I, fx, ["ADBE Ripple-0001", "Radius"], Math.min(100, V("size")));
            Y.rx.set(I, fx, ["ADBE Ripple-0004", "Wave Speed"], V("speed"));
            Y.rx.setx(I, fx, ["ADBE Ripple-0006", "Wave Height"], Y.rx.expr(I, s, "Math.max(0, " + Y.rx.amt(I, s, "amount", true) + ");"));
        } else {
            fx = Y.rx.add(I, ["ADBE Turbulent Displace"], /turbulent displace/i, "Turbulent");
            Y.rx.set(I, fx, ["ADBE Turbulent Displace-0003", "Size"], V("size"));
            Y.rx.setx(I, fx, ["ADBE Turbulent Displace-0006", "Evolution"], "time * " + Y.rx.f(V("speed") * 360) + ";");
            Y.rx.setx(I, fx, ["ADBE Turbulent Displace-0002", "Amount"], Y.rx.expr(I, s, "Math.max(0, " + Y.rx.amt(I, s, "amount", true) + ");"));
        }
    }
});

// Glitch de blocs (approximations natives) : shift = tranches décalées, mosh = traînée datamosh, sort = coulures verticales.
// Seules certaines images s'allument (densité), comme un vrai glitch.
Y.prim.def("blocks", {
    label: "Glitch", fx: ["ADBE Wave Warp", "ADBE Echo", "ADBE Turbulent Displace", "ADBE Motion Blur"], cost: 2, hosts: "any adj layer cut clip", main: "amount",
    params: { kind: ["e", "shift", ["shift", "mosh", "sort"]], amount: ["n", 60, 0, 600, "k"], size: ["n", 60, 4, 600], density: ["n", 50, 0, 100] },
    install: function (I, s) {
        var k = Y.rx.val(I, s, "kind"), V = function (x) { return Y.rx.val(I, s, x); }, gate, ww, ec, td, db;
        gate = "seedRandom(sd * 53 + fr * 3, true);\nvar on = (EP > 0.001 && random() < " + Y.rx.f(V("density")) + " / 100) ? 1 : 0;\n";
        if (k === "mosh") {
            ec = Y.rx.add(I, ["ADBE Echo"], /^echo$/i, "Mosh");
            Y.rx.set(I, ec, ["ADBE Echo-0001", "Echo Time (seconds)"], -1 / I.c.fps);
            Y.rx.set(I, ec, ["ADBE Echo-0004", "Decay"], 0.85);
            Y.rx.set(I, ec, ["ADBE Echo-0005", "Echo Operator"], 5);
            Y.rx.setx(I, ec, ["ADBE Echo-0002", "Number Of Echoes"], Y.rx.expr(I, s, gate + "on * Math.round(2 + 6 * EP);"));
            td = Y.rx.add(I, ["ADBE Turbulent Displace"], /turbulent displace/i, "MoshWarp");
            Y.rx.set(I, td, ["ADBE Turbulent Displace-0003", "Size"], V("size"));
            Y.rx.setx(I, td, ["ADBE Turbulent Displace-0006", "Evolution"], "time * 900;");
            Y.rx.setx(I, td, ["ADBE Turbulent Displace-0002", "Amount"], Y.rx.expr(I, s, gate + "on * " + Y.rx.amt(I, s, "amount", true) + ";"));
            return;
        }
        if (k === "sort") {
            db = Y.rx.add(I, Y.FX.dirBlur, /directional blur/i, "Sort");
            Y.rx.set(I, db, Y.FX.dirAngle, 0);
            Y.rx.setx(I, db, Y.FX.dirLen, Y.rx.expr(I, s, gate + "on * 3 * " + Y.rx.amt(I, s, "amount", true) + ";"));
        }
        ww = Y.rx.add(I, Y.FX.wave, /wave warp/i, "Blocks");
        Y.rx.set(I, ww, Y.FX.waveType, k === "sort" ? 4 : 2);
        Y.rx.set(I, ww, Y.FX.waveDir, k === "sort" ? 90 : 0);
        Y.rx.set(I, ww, Y.FX.waveSpeed, 0);
        Y.rx.setx(I, ww, Y.FX.waveH, Y.rx.expr(I, s, gate + "on * " + Y.rx.amt(I, s, "amount", true) + ";"));
        Y.rx.setx(I, ww, Y.FX.waveW, "seedRandom(Math.floor(time / thisComp.frameDuration), true);\nrandom(" + Y.rx.f(V("size") * 0.5) + ", " + Y.rx.f(V("size") * 3) + ");");
        Y.rx.setx(I, ww, Y.FX.wavePhase, "seedRandom(Math.floor(time / thisComp.frameDuration) + 9, true);\nrandom(0, 360);");
    }
});

Y.prim.def("pixelate", {
    label: "Blocs", fx: ["ADBE Mosaic"], cost: 1, hosts: "any adj layer cut clip", main: "blocks",
    params: { blocks: ["n", 24, 2, 400] },
    install: function (I, s) {
        var mo = Y.rx.add(I, ["ADBE Mosaic"], /^mosaic$/i, "Mosaic"), B = Y.rx.num(I, s, "blocks"), W = I.comp.width, H = I.comp.height;
        try { Y.rx.set(I, mo, ["ADBE Mosaic-0003", "Sharp Colors"], 1); } catch (e) {}
        Y.rx.setx(I, mo, ["ADBE Mosaic-0001", "Horizontal Blocks"], Y.rx.expr(I, s, "var b = " + B + ";\n(EP > 0.001) ? Math.max(2, Math.round(b + (" + W + " - b) * (1 - EP))) : " + W + ";"));
        Y.rx.setx(I, mo, ["ADBE Mosaic-0002", "Vertical Blocks"], Y.rx.expr(I, s, "var b = " + B + " * " + Y.rx.f(H / W) + ";\n(EP > 0.001) ? Math.max(2, Math.round(b + (" + H + " - b) * (1 - EP))) : " + H + ";"));
    }
});

Y.prim.def("posterize", {
    label: "Aplats", fx: ["ADBE Posterize"], cost: 1, hosts: "any adj layer cut clip", main: null,
    params: { levels: ["n", 5, 2, 64] },
    install: function (I, s) {
        var J = Y.rx.gate(I, s, "Posterize"), po = Y.rx.add(J, ["ADBE Posterize"], /^posterize$/i, "Posterize");
        Y.rx.set(J, po, ["ADBE Posterize-0001", "Level"], Y.rx.val(I, s, "levels"));
    }
});

// Encre : seuil noir et blanc (impact frame) ou contours (BD, en Produit sur l'image).
Y.prim.def("ink", {
    label: "Encre", fx: ["ADBE Threshold2", "ADBE Find Edges"], cost: 1, hosts: "any adj layer cut clip", main: null,
    params: { kind: ["e", "threshold", ["threshold", "edges"]], level: ["n", 128, 0, 255], blend: ["n", 0, 0, 100] },
    install: function (I, s) {
        var J, fx, loop = I.drive === "loop" || I.drive === "static";
        if (Y.rx.val(I, s, "kind") === "edges") {
            J = Y.rx.sibling(I, "Edges", "adj", null, "MULTIPLY");
            if (!loop) { Y.x.set(J.L.property("ADBE Transform Group").property("ADBE Opacity"), Y.rx.expr(J, s, "100 * EP;")); }
            fx = Y.rx.add(J, ["ADBE Find Edges"], /find edges/i, "Edges");
            Y.rx.set(J, fx, ["ADBE Find Edges-0002", "Blend With Original"], Y.rx.val(I, s, "blend"));
            return;
        }
        J = Y.rx.gate(I, s, "Ink");
        fx = Y.rx.add(J, ["ADBE Threshold2"], /^threshold$/i, "Threshold");
        Y.rx.set(J, fx, ["ADBE Threshold2-0001", "Level"], Y.rx.val(I, s, "level"));
    }
});

// Trame de points : approximation avec CC Ball Action (pas de halftone natif dans AE).
Y.prim.def("halftone", {
    label: "Trame", fx: ["CC Ball Action"], cost: 2, hosts: "any adj layer cut clip", main: null,
    params: { size: ["n", 14, 3, 120] },
    install: function (I, s) {
        var J = (I.drive === "loop" || I.drive === "static") ? Y.rx.sibling(I, "Trame", "adj", null, "MULTIPLY") : Y.rx.gate(I, s, "Trame", "MULTIPLY");
        var b = Y.rx.add(J, ["CC Ball Action"], /ball action/i, "Halftone");
        Y.rx.set(J, b, ["CC Ball Action-0005", "Grid Spacing"], Y.rx.val(I, s, "size"));
        try { Y.rx.set(J, b, ["CC Ball Action-0001", "Scatter"], 0); } catch (e) {}
    }
});

Y.prim.def("scanlines", {
    label: "Lignes", fx: ["ADBE Venetian Blinds"], cost: 1, hosts: "any adj layer cut clip new", main: "opacity",
    params: { spacing: ["n", 4, 2, 80], thickness: ["n", 50, 5, 95], roll: ["n", 0, 0, 600], opacity: ["n", 25, 0, 100, "k"], color: ["c", "#000000"] },
    install: function (I, s) {
        var J = Y.rx.sibling(I, "Scan", "solid", Y.rx.val(I, s, "color")), vb, sp = Y.rx.val(I, s, "spacing");
        vb = Y.rx.add(J, ["ADBE Venetian Blinds"], /venetian blinds/i, "Lignes");
        Y.rx.set(J, vb, ["ADBE Venetian Blinds-0001", "Transition Completion"], Y.rx.val(I, s, "thickness"));
        Y.rx.set(J, vb, ["ADBE Venetian Blinds-0003", "Width"], sp);
        if (Y.rx.val(I, s, "roll") > 0) {
            Y.x.set(J.L.property("ADBE Transform Group").property("ADBE Position"), "[value[0], value[1] + (time * " + Y.rx.f(Y.rx.val(I, s, "roll")) + ") % " + Y.rx.f(sp * 2) + "];");
        }
        Y.x.set(J.L.property("ADBE Transform Group").property("ADBE Opacity"), Y.rx.expr(J, s, "Math.max(0, Math.min(100, " + Y.rx.amt(J, s, "opacity", true) + "));"));
    }
});

// Grain : solide frère (Fractal Noise) en Incrustation, ou poussière blanche en Écran.
Y.prim.def("grain", {
    label: "Grain", fx: ["ADBE Fractal Noise"], cost: 2, hosts: "any adj layer cut clip new", main: "amount",
    params: { kind: ["e", "fine", ["fine", "film", "digital", "dust"]], size: ["n", 22, 1, 400], amount: ["n", 35, 0, 100, "k"] },
    install: function (I, s) {
        var k = Y.rx.val(I, s, "kind"), dust = k === "dust", J, fn, sz = Y.rx.val(I, s, "size");
        J = Y.rx.sibling(I, dust ? "Dust" : "Grain", "solid", dust ? "#000000" : "#808080", dust ? "SCREEN" : "OVERLAY");
        fn = Y.rx.add(J, ["ADBE Fractal Noise"], /fractal noise/i, "Noise");
        Y.rx.set(J, fn, Y.pl.FN.contrast, { fine: 160, film: 120, digital: 200, dust: 450 }[k]);
        if (dust) { Y.rx.set(J, fn, Y.pl.FN.brightness, -105); }
        if (k === "digital") { Y.rx.set(J, fn, Y.pl.FN.noiseType, 1); }
        Y.rx.set(J, fn, Y.pl.FN.complexity, { fine: 3, film: 6, digital: 1, dust: 2 }[k]);
        Y.rx.set(J, fn, Y.pl.FN.scale, k === "film" ? sz * 1.8 : k === "digital" ? sz * 0.6 : sz);
        Y.rx.setx(J, fn, Y.pl.FN.evolution, "time * 2400;");
        Y.x.set(J.L.property("ADBE Transform Group").property("ADBE Opacity"), Y.rx.expr(J, s, "Math.max(0, Math.min(100, " + Y.rx.amt(J, s, "amount", true) + "));"));
    }
});

Y.prim.def("mirror", {
    label: "Miroir", fx: ["ADBE Mirror", "CC Kaleida", "ADBE Polar Coordinates"], cost: 2, hosts: "any adj layer cut clip", main: null,
    params: { kind: ["e", "mirror", ["mirror", "kaleida", "polar"]], angle: ["n", 90, 0, 360], size: ["n", 30, 1, 400], spin: ["n", 0, -360, 360] },
    install: function (I, s) {
        var k = Y.rx.val(I, s, "kind"), J, fx, w = I.L.width || I.comp.width, h = I.L.height || I.comp.height;
        if (k === "polar") {
            fx = Y.rx.add(I, ["ADBE Polar Coordinates"], /polar coordinates/i, "Polar");
            Y.rx.set(I, fx, ["ADBE Polar Coordinates-0002", "Type of Conversion"], 1);
            Y.rx.setx(I, fx, ["ADBE Polar Coordinates-0001", "Interpolation"], Y.rx.expr(I, s, "100 * EP;"));
            return;
        }
        J = Y.rx.gate(I, s, k === "kaleida" ? "Kaleida" : "Mirror");
        if (k === "kaleida") {
            fx = Y.rx.add(J, ["CC Kaleida"], /kaleida/i, "Kaleida");
            Y.rx.set(J, fx, ["CC Kaleida-0002", "Size"], Y.rx.val(I, s, "size"));
            if (Y.rx.val(I, s, "spin")) { Y.rx.setx(J, fx, ["CC Kaleida-0004", "Rotation"], "time * " + Y.rx.f(Y.rx.val(I, s, "spin")) + ";"); }
            return;
        }
        fx = Y.rx.add(J, ["ADBE Mirror"], /^mirror$/i, "Mirror");
        Y.rx.set(J, fx, ["ADBE Mirror-0001", "Reflection Center"], [w / 2, h / 2]);
        Y.rx.set(J, fx, ["ADBE Mirror-0002", "Reflection Angle"], Y.rx.val(I, s, "angle"));
    }
});

// Lignes de vitesse : bruit étiré (Fractal Noise), passé en coordonnées polaires pour la version radiale,
// luminance -> alpha (Shift Channels) puis couleur (Fill). Trou central adouci (masque).
Y.prim.def("speedLines", {
    label: "Lignes", fx: ["ADBE Fractal Noise", "ADBE Polar Coordinates", "ADBE Shift Channels", "ADBE Fill"], cost: 2, hosts: "any adj layer cut clip new", main: "amount",
    params: {
        kind: ["e", "radial", ["radial", "horizontal"]], density: ["n", 50, 0, 100], color: ["c", "#ffffff"],
        amount: ["n", 80, 0, 100, "k"], hole: ["n", 35, 0, 90]
    },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, J = Y.rx.sibling(I, "SpeedLines", "solid", "#000000"), L = J.L, fn, pc, sc, fl, w = I.comp.width, h = I.comp.height, r, k = 0.5523, sh, mi, cx = w / 2, cy = h / 2;
        fn = Y.rx.add(J, ["ADBE Fractal Noise"], /fractal noise/i, "Noise");
        Y.rx.set(J, fn, Y.pl.FN.contrast, 420);
        Y.rx.set(J, fn, Y.pl.FN.brightness, -150 + V("density") * 1.4);
        Y.rx.set(J, fn, Y.pl.FN.complexity, 1);
        Y.rx.set(J, fn, Y.pl.FN.uniform, 0);
        Y.rx.set(J, fn, Y.pl.FN.scaleW, 4);
        Y.rx.set(J, fn, Y.pl.FN.scaleH, 4000);
        if (V("kind") === "horizontal") { Y.rx.set(J, fn, Y.pl.FN.rotation, 90); }
        Y.rx.setx(J, fn, Y.pl.FN.evolution, "time * 1800;");
        if (V("kind") === "radial") {
            pc = Y.rx.add(J, ["ADBE Polar Coordinates"], /polar coordinates/i, "Polar");
            Y.rx.set(J, pc, ["ADBE Polar Coordinates-0001", "Interpolation"], 100);
            Y.rx.set(J, pc, ["ADBE Polar Coordinates-0002", "Type of Conversion"], 1);
            r = Math.min(w, h) * V("hole") / 200;
            if (r > 1) {
                sh = new Shape();
                sh.vertices = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
                sh.inTangents = [[-r * k, 0], [0, -r * k], [r * k, 0], [0, r * k]];
                sh.outTangents = [[r * k, 0], [0, r * k], [-r * k, 0], [0, -r * k]];
                sh.closed = true;
                mi = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom").propertyIndex;
                L.property("ADBE Mask Parade").property(mi).property("ADBE Mask Shape").setValue(sh);
                L.property("ADBE Mask Parade").property(mi).maskMode = MaskMode.SUBTRACT;
                L.property("ADBE Mask Parade").property(mi).property("ADBE Mask Feather").setValue([r * 0.8, r * 0.8]);
            }
        }
        sc = Y.rx.add(J, ["ADBE Shift Channels"], /shift channels/i, "Alpha");
        Y.rx.set(J, sc, ["ADBE Shift Channels-0001", "Take Alpha From"], 5);
        fl = Y.rx.add(J, ["ADBE Fill"], /^fill$/i, "Couleur");
        Y.rx.set(J, fl, ["ADBE Fill-0003", "Color"], Y.rx.rgba(V("color")));
        Y.x.set(L.property("ADBE Transform Group").property("ADBE Opacity"), Y.rx.expr(J, s, "Math.max(0, Math.min(100, " + Y.rx.amt(J, s, "amount", true) + "));"));
    }
});
