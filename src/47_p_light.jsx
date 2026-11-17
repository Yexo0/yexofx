// =====================================================================
// PRIMITIVES : lumière et couleur.
// Paramètres d'effets visés par matchName (indépendant de la langue d'AE), repli sur le nom anglais.
// Les matchNames de paramètres marqués (?) sont à confirmer par la sonde (Réglages > Diagnostic > Sonde des effets).
// =====================================================================
Y.pl = {};

// Valeur « neutre + écart x intensité x enveloppe » : un réglage revient au neutre quand l'enveloppe retombe.
Y.pl.dev = function (I, s, name, neutral) {
    var v = Y.rx.val(I, s, name);
    if (v && typeof v === "object" && !Y.u.isArray(v)) { return Y.rx.num(I, s, name); }
    return Y.rx.f(neutral) + " + (" + Y.rx.f(v) + " - " + Y.rx.f(neutral) + ") * K * " + (I.drive === "loop" || I.drive === "static" ? "1" : "E");
};

Y.prim.def("exposure", {
    label: "Flash", fx: ["ADBE Exposure2"], cost: 1, hosts: "any adj layer cut clip new", main: "stops",
    params: { stops: ["n", 1.5, -8, 8, "k"] },
    install: function (I, s) {
        var ex = Y.rx.add(I, Y.FX.expo, /^exposure$/i, "Exposure");
        Y.rx.setx(I, ex, ["ADBE Exposure2-0003", "Exposure"], Y.rx.expr(I, s, "value + " + Y.rx.amt(I, s, "stops") + ";"));
    }
});

Y.pl.BLEND = { normal: "NORMAL", add: "ADD", screen: "SCREEN", multiply: "MULTIPLY", difference: "DIFFERENCE", overlay: "OVERLAY",
               color: "COLOR", softlight: "SOFT_LIGHT", hardlight: "HARD_LIGHT", dodge: "COLOR_DODGE" };

// Aplat de couleur : solide frère avec mode de fusion, opacité pilotée par l'enveloppe.
Y.prim.def("flash", {
    label: "Opacite", fx: [], cost: 1, hosts: "any adj layer cut clip new", main: "opacity",
    params: {
        color: ["c", "#ffffff"], blend: ["e", "normal", ["normal", "add", "screen", "multiply", "difference", "overlay", "color", "softlight", "hardlight", "dodge"]],
        opacity: ["n", 85, 0, 100, "k"]
    },
    install: function (I, s) {
        var J = Y.rx.sibling(I, "Flash", "solid", Y.rx.val(I, s, "color"), Y.pl.BLEND[Y.rx.val(I, s, "blend")]);
        Y.x.set(J.L.property("ADBE Transform Group").property("ADBE Opacity"),
            Y.rx.expr(J, s, "Math.max(0, Math.min(100, " + Y.rx.amt(J, s, "opacity", true) + "));"));
    }
});

Y.prim.def("invert", {
    label: "Inversion", fx: ["ADBE Invert"], cost: 1, hosts: "any adj layer cut clip", main: null,
    params: { channel: ["e", "rgb", ["rgb", "lightness", "hue", "luma"]] },
    install: function (I, s) {
        var J = Y.rx.gate(I, s, "Invert"), iv = Y.rx.add(J, ["ADBE Invert"], /^invert$/i, "Invert"), ch = Y.rx.val(I, s, "channel");
        Y.rx.set(J, iv, ["ADBE Invert-0001", "Channel"], { rgb: 1, hue: 6, lightness: 7, luma: 10 }[ch] || 1);
    }
});

// Lumetri : réglages de base. Neutres : 0 sauf Saturation (100).
Y.pl.LUM = [
    ["temp", "Temperature", 0], ["tint", "Tint", 0], ["exposure", "Exposure", 0], ["contrast", "Contrast", 0],
    ["highlights", "Highlights", 0], ["shadows", "Shadows", 0], ["whites", "Whites", 0], ["blacks", "Blacks", 0],
    ["sat", "Saturation", 100], ["vibrance", "Vibrance", 0], ["faded", "Faded Film", 0], ["sharpen", "Sharpen", 0]
];
Y.prim.def("grade", {
    label: "Etalonnage", fx: ["ADBE Lumetri"], cost: 2, hosts: "any adj layer cut clip", main: null,
    params: {
        temp: ["n", 0, -100, 100], tint: ["n", 0, -100, 100], exposure: ["n", 0, -5, 5], contrast: ["n", 0, -100, 100],
        highlights: ["n", 0, -100, 100], shadows: ["n", 0, -100, 100], whites: ["n", 0, -100, 100], blacks: ["n", 0, -100, 100],
        sat: ["n", 100, 0, 200], vibrance: ["n", 0, -100, 100], faded: ["n", 0, 0, 100], sharpen: ["n", 0, -100, 100]
    },
    install: function (I, s) {
        var lu = Y.rx.add(I, ["ADBE Lumetri"], /lumetri color/i, "Lumetri"), i, d, head = Y.rx.expr(I, s, "");
        for (i = 0; i < Y.pl.LUM.length; i++) {
            d = Y.pl.LUM[i];
            if (s[d[0]] === undefined || s[d[0]] === d[2]) { continue; }
            Y.rx.setx(I, lu, [d[1]], head + Y.pl.dev(I, s, d[0], d[2]) + ";");
        }
    }
});

// Levels : valeurs en 0..1 dans la recette ; l'échelle d'AE (0..1 ou 0..255) est lue sur l'effet.
Y.prim.def("levels", {
    label: "Niveaux", fx: ["ADBE Easy Levels2"], cost: 1, hosts: "any adj layer cut clip", main: null,
    params: { inBlack: ["n", 0, 0, 1], inWhite: ["n", 1, 0, 1], gamma: ["n", 1, 0.1, 5], outBlack: ["n", 0, 0, 1], outWhite: ["n", 1, 0, 1] },
    install: function (I, s) {
        var lv = Y.rx.add(I, ["ADBE Easy Levels2"], /^levels$/i, "Levels"), head = Y.rx.expr(I, s, ""), sc, keys, i, k, nt;
        keys = [["inBlack", "ADBE Easy Levels2-0003", "Input Black", 0], ["inWhite", "ADBE Easy Levels2-0004", "Input White", 1],
                ["gamma", "ADBE Easy Levels2-0005", "Gamma", 1], ["outBlack", "ADBE Easy Levels2-0006", "Output Black", 0],
                ["outWhite", "ADBE Easy Levels2-0007", "Output White", 1]];
        sc = Number(Y.rx.p(I, lv, ["ADBE Easy Levels2-0004", "Input White"]).value) > 1.5 ? 255 : 1;
        for (i = 0; i < keys.length; i++) {
            k = keys[i];
            if (s[k[0]] === undefined || s[k[0]] === k[3]) { continue; }
            nt = k[0] === "gamma" ? 1 : sc;
            Y.rx.setx(I, lv, [k[1], k[2]], head + "(" + Y.pl.dev(I, s, k[0], k[3]) + ") * " + nt + ";");
        }
    }
});

Y.prim.def("hueSat", {
    label: "Teinte", fx: ["ADBE HUE SATURATION"], cost: 1, hosts: "any adj layer cut clip", main: null,
    params: {
        hue: ["n", 0, -180, 180], sat: ["n", 0, -100, 100], light: ["n", 0, -100, 100],
        colorize: ["b", false], chue: ["n", 0, 0, 360], csat: ["n", 25, 0, 100], clight: ["n", 0, -100, 100]
    },
    install: function (I, s) {
        var J = Y.rx.val(I, s, "colorize") ? Y.rx.gate(I, s, "Colorize") : I, hs = Y.rx.add(J, ["ADBE HUE SATURATION"], /hue\/saturation/i, "HueSat");
        var head = Y.rx.expr(J, s, "");
        if (Y.rx.val(I, s, "colorize")) {
            Y.rx.set(J, hs, ["ADBE HUE SATURATION-0006", "Colorize"], 1);
            Y.rx.set(J, hs, ["ADBE HUE SATURATION-0007", "Colorize Hue"], Y.rx.val(I, s, "chue"));
            Y.rx.set(J, hs, ["ADBE HUE SATURATION-0008", "Colorize Saturation"], Y.rx.val(I, s, "csat"));
            Y.rx.set(J, hs, ["ADBE HUE SATURATION-0009", "Colorize Lightness"], Y.rx.val(I, s, "clight"));
            return;
        }
        if (s.hue) { Y.rx.setx(J, hs, ["ADBE HUE SATURATION-0003", "Master Hue"], head + Y.pl.dev(J, s, "hue", 0) + ";"); }
        if (s.sat) { Y.rx.setx(J, hs, ["ADBE HUE SATURATION-0004", "Master Saturation"], head + Y.pl.dev(J, s, "sat", 0) + ";"); }
        if (s.light) { Y.rx.setx(J, hs, ["ADBE HUE SATURATION-0005", "Master Lightness"], head + Y.pl.dev(J, s, "light", 0) + ";"); }
    }
});

// Color Balance : split toning. Chaque bande = [rouge, vert, bleu] en -100..100.
Y.prim.def("colorBalance", {
    label: "Balance", fx: ["ADBE Color Balance 2"], cost: 1, hosts: "any adj layer cut clip", main: null,
    params: { shadows: ["a", [0, 0, 0]], mids: ["a", [0, 0, 0]], highs: ["a", [0, 0, 0]], preserve: ["b", true] },
    install: function (I, s) {
        var cb = Y.rx.add(I, ["ADBE Color Balance 2"], /color balance$/i, "Balance"), head = Y.rx.expr(I, s, ""), bands, b, j, v, nm, ch = ["Red", "Green", "Blue"], idx;
        bands = [["shadows", "Shadow", 1], ["mids", "Midtone", 4], ["highs", "Hilight", 7]];
        for (b = 0; b < bands.length; b++) {
            v = Y.rx.val(I, s, bands[b][0]);
            for (j = 0; j < 3; j++) {
                if (!v[j]) { continue; }
                idx = bands[b][2] + j;
                nm = bands[b][1] + " " + ch[j] + " Balance";
                Y.rx.setx(I, cb, ["ADBE Color Balance 2-" + Y.u.pad(idx, 4), nm, nm.replace("Hilight", "Highlight")],
                    head + Y.rx.f(v[j]) + " * K * " + (I.drive === "loop" || I.drive === "static" ? "1" : "E") + ";");
            }
        }
        try { Y.rx.set(I, cb, ["ADBE Color Balance 2-0010", "Preserve Luminosity"], Y.rx.val(I, s, "preserve") ? 1 : 0); } catch (e) {}
    }
});

Y.prim.def("duotone", {
    label: "Bichromie", fx: ["ADBE Tritone"], cost: 1, hosts: "any adj layer cut clip", main: null,
    params: { shadows: ["c", "#000000"], mids: ["c", "#7f7f7f"], highs: ["c", "#ffffff"], blend: ["n", 0, 0, 100] },
    install: function (I, s) {
        var tt = Y.rx.add(I, ["ADBE Tritone"], /tritone/i, "Tritone");
        Y.rx.set(I, tt, ["ADBE Tritone-0001", "Highlights"], Y.rx.rgba(Y.rx.val(I, s, "highs")));
        Y.rx.set(I, tt, ["ADBE Tritone-0002", "Midtones"], Y.rx.rgba(Y.rx.val(I, s, "mids")));
        Y.rx.set(I, tt, ["ADBE Tritone-0003", "Shadows"], Y.rx.rgba(Y.rx.val(I, s, "shadows")));
        Y.rx.setx(I, tt, ["ADBE Tritone-0004", "Blend With Original"],
            Y.rx.expr(I, s, "100 - (100 - " + Y.rx.f(Y.rx.val(I, s, "blend")) + ") * Math.min(1, K) * EP;"));
    }
});

// Noir et blanc (Tint) : de la désaturation partielle au N&B teinté.
Y.prim.def("bw", {
    label: "NoirBlanc", fx: ["ADBE Tint"], cost: 1, hosts: "any adj layer cut clip", main: "amount",
    params: { amount: ["n", 100, 0, 100, "k"], tint: ["c", "#ffffff"], dark: ["c", "#000000"] },
    install: function (I, s) {
        var ti = Y.rx.add(I, Y.FX.tint, /^tint$/i, "Tint");
        Y.rx.set(I, ti, ["ADBE Tint-0001", "Map Black To"], Y.rx.rgba(Y.rx.val(I, s, "dark")));
        Y.rx.set(I, ti, ["ADBE Tint-0002", "Map White To"], Y.rx.rgba(Y.rx.val(I, s, "tint")));
        Y.rx.setx(I, ti, Y.FX.tintAmt, Y.rx.expr(I, s, "Math.max(0, Math.min(100, " + Y.rx.amt(I, s, "amount", true) + "));"));
    }
});

Y.prim.def("leaveColor", {
    label: "Decolore", fx: ["ADBE Leave Color"], cost: 1, hosts: "any adj layer cut clip", main: "amount",
    params: { color: ["c", "#d00000"], tolerance: ["n", 25, 0, 100], softness: ["n", 15, 0, 100], amount: ["n", 100, 0, 100, "k"] },
    install: function (I, s) {
        var lc = Y.rx.add(I, ["ADBE Leave Color"], /leave color/i, "LeaveColor");
        Y.rx.set(I, lc, ["ADBE Leave Color-0002", "Color To Leave"], Y.rx.rgba(Y.rx.val(I, s, "color")));
        Y.rx.set(I, lc, ["ADBE Leave Color-0003", "Tolerance"], Y.rx.val(I, s, "tolerance"));
        Y.rx.set(I, lc, ["ADBE Leave Color-0004", "Edge Softness"], Y.rx.val(I, s, "softness"));
        try { Y.rx.set(I, lc, ["ADBE Leave Color-0005", "Match Colors"], 2); } catch (e) {}
        Y.rx.setx(I, lc, ["ADBE Leave Color-0001", "Amount to Decolor"], Y.rx.expr(I, s, "Math.max(0, Math.min(100, " + Y.rx.amt(I, s, "amount", true) + "));"));
    }
});

// Glow : 1 à 3 passes (rayons x1, x3, x8 : imitation d'un deep glow), couleurs A / B optionnelles ; Deep Glow si demandé et installé.
Y.prim.def("glow", {
    label: "Glow", fx: ["ADBE Glo2"], cost: 2, hosts: "any adj layer cut clip new text", main: "intensity",
    params: {
        threshold: ["n", 60, 0, 100], radius: ["n", 40, 0, 1500, "k"], intensity: ["n", 1, 0, 10, "k"], passes: ["n", 1, 1, 3],
        colorA: ["c", "#ffffff"], colorB: ["c", "#ffffff"], tinted: ["b", false], deep: ["b", false]
    },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, deep = V("deep") ? Y.fx.search(/deep\s*glow/i) : [], n, i, gl, mult = [1, 3, 8], imul = [1, 0.6, 0.35];
        if (deep.length) {
            I.lastFx = deep[0].match;
            Y.p.addEffect(I.L, deep[0].match, I.base + "_DeepGlow");
            return;
        }
        n = Math.max(1, Math.min(3, Math.round(V("passes"))));
        for (i = 0; i < n; i++) {
            gl = Y.rx.add(I, Y.FX.glow, /^glow$/i, "Glow");
            Y.rx.set(I, gl, Y.FX.glowThr, V("threshold"));
            Y.rx.setx(I, gl, Y.FX.glowRad, Y.rx.expr(I, s, Y.rx.num(I, s, "radius") + " * " + mult[i] + ";"));
            Y.rx.setx(I, gl, Y.FX.glowInt, Y.rx.expr(I, s, "Math.max(0, " + Y.rx.amt(I, s, "intensity", true) + " * " + imul[i] + ");"));
            if (V("tinted")) {
                Y.rx.set(I, gl, ["ADBE Glo2-0007", "Glow Colors"], 2);
                Y.rx.set(I, gl, ["ADBE Glo2-0012", "Color A"], Y.rx.rgba(V("colorA")));
                Y.rx.set(I, gl, ["ADBE Glo2-0013", "Color B"], Y.rx.rgba(V("colorB")));
            }
        }
    }
});

Y.prim.def("rays", {
    label: "Rayons", fx: ["CC Light Rays"], cost: 2, hosts: "any adj layer cut clip", main: "intensity",
    params: { intensity: ["n", 60, 0, 600, "k"], radius: ["n", 40, 0, 400], center: ["e", "center", ["center", "top", "bottom"]] },
    install: function (I, s) {
        var r = Y.rx.add(I, ["CC Light Rays"], /light rays/i, "Rays"), w = I.L.width || I.comp.width, h = I.L.height || I.comp.height, c = Y.rx.val(I, s, "center");
        Y.rx.set(I, r, ["CC Light Rays-0002", "Center"], [w / 2, c === "top" ? h * 0.15 : c === "bottom" ? h * 0.85 : h / 2]);
        Y.rx.set(I, r, ["CC Light Rays-0003", "Radius"], Y.rx.val(I, s, "radius"));
        Y.rx.setx(I, r, ["CC Light Rays-0001", "Intensity"], Y.rx.expr(I, s, "Math.max(0, " + Y.rx.amt(I, s, "intensity", true) + ");"));
    }
});

Y.prim.def("flare", {
    label: "Flare", fx: ["ADBE Lens Flare"], cost: 2, hosts: "any adj layer cut clip", main: "brightness",
    params: { lens: ["e", "zoom", ["zoom", "35", "105"]], brightness: ["n", 100, 0, 300, "k"], path: ["e", "sweep", ["sweep", "static", "burst"]] },
    install: function (I, s) {
        var fl = Y.rx.add(I, ["ADBE Lens Flare"], /lens flare/i, "Flare"), path = Y.rx.val(I, s, "path"), loop = I.drive === "loop" || I.drive === "static";
        var w = I.L.width || I.comp.width, h = I.L.height || I.comp.height, g;
        Y.rx.set(I, fl, ["ADBE Lens Flare-0003", "Lens Type"], { zoom: 1, "35": 2, "105": 3 }[Y.rx.val(I, s, "lens")] || 1);
        if (path === "static") { Y.rx.set(I, fl, ["ADBE Lens Flare-0001", "Flare Center"], [w * 0.75, h * 0.2]); }
        else {
            g = loop ? "Math.max(0, Math.min(1, (time - LAY.inPoint) / D))" : (path === "burst" ? "0.5" : "Math.max(0, Math.min(1, u))");
            Y.rx.setx(I, fl, ["ADBE Lens Flare-0001", "Flare Center"], Y.rx.expr(I, s, "var g = " + g + ";\n[" + Y.rx.f(w * 0.08) + " + " + Y.rx.f(w * 0.84) + " * g, " + Y.rx.f(h * 0.3) + " - " + Y.rx.f(h * 0.12) + " * g];"));
        }
        Y.rx.setx(I, fl, ["ADBE Lens Flare-0002", "Flare Brightness"], Y.rx.expr(I, s, "Math.max(0, " + Y.rx.amt(I, s, "brightness", true) + ");"));
    }
});

// Fuite de lumière générée : solide noir en Screen (Fractal Noise + Tritone), sans fichier externe.
Y.pl.FN = {
    noiseType: ["ADBE Fractal Noise-0002", "Noise Type"], contrast: ["ADBE Fractal Noise-0004", "Contrast"], brightness: ["ADBE Fractal Noise-0005", "Brightness"],
    rotation: ["ADBE Fractal Noise-0008", "Rotation"], uniform: ["ADBE Fractal Noise-0009", "Uniform Scaling"], scale: ["ADBE Fractal Noise-0010", "Scale"],
    scaleW: ["ADBE Fractal Noise-0011", "Scale Width"], scaleH: ["ADBE Fractal Noise-0012", "Scale Height"], complexity: ["ADBE Fractal Noise-0015", "Complexity"],
    evolution: ["ADBE Fractal Noise-0023", "Evolution"]
};
Y.prim.def("lightLeak", {
    label: "Fuite", fx: ["ADBE Fractal Noise", "ADBE Tritone"], cost: 2, hosts: "any adj layer cut clip new", main: "amount",
    params: { colorHi: ["c", "#fff0d1"], colorMid: ["c", "#ff7329"], speed: ["n", 40, 0, 600], scale: ["n", 900, 100, 4000], amount: ["n", 70, 0, 100, "k"] },
    install: function (I, s) {
        var J = Y.rx.sibling(I, "Leak", "solid", "#000000", "SCREEN"), fn, tt, V = function (k) { return Y.rx.val(I, s, k); };
        fn = Y.rx.add(J, ["ADBE Fractal Noise"], /fractal noise/i, "Noise");
        Y.rx.set(J, fn, Y.pl.FN.contrast, 120);
        Y.rx.set(J, fn, Y.pl.FN.brightness, -25);
        Y.rx.set(J, fn, Y.pl.FN.complexity, 2);
        Y.rx.set(J, fn, Y.pl.FN.scale, V("scale"));
        Y.rx.setx(J, fn, Y.pl.FN.evolution, "time * " + Y.rx.f(V("speed")) + ";");
        tt = Y.rx.add(J, ["ADBE Tritone"], /tritone/i, "Couleurs");
        Y.rx.set(J, tt, ["ADBE Tritone-0001", "Highlights"], Y.rx.rgba(V("colorHi")));
        Y.rx.set(J, tt, ["ADBE Tritone-0002", "Midtones"], Y.rx.rgba(V("colorMid")));
        Y.rx.set(J, tt, ["ADBE Tritone-0003", "Shadows"], [0, 0, 0, 1]);
        Y.x.set(J.L.property("ADBE Transform Group").property("ADBE Opacity"), Y.rx.expr(J, s, "Math.max(0, Math.min(100, " + Y.rx.amt(J, s, "amount", true) + "));"));
    }
});

// Vignette : solide frère avec un masque ovale soustrait et adouci.
Y.prim.def("vignette", {
    label: "Vignette", fx: [], cost: 1, hosts: "any adj layer cut clip new", main: "amount",
    params: { amount: ["n", 65, 0, 100, "k"], softness: ["n", 45, 0, 100], size: ["n", 56, 20, 120], color: ["c", "#000000"], wide: ["b", false] },
    install: function (I, s) {
        var J = Y.rx.sibling(I, "Vignette", "solid", Y.rx.val(I, s, "color")), L = J.L, w = I.comp.width, h = I.comp.height, sz = Y.rx.val(I, s, "size") / 100;
        var rx = w * sz * (Y.rx.val(I, s, "wide") ? 1.25 : 1), ry = h * sz, cx = w / 2, cy = h / 2, k = 0.5523, sh = new Shape(), mi;
        sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
        sh.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
        sh.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
        sh.closed = true;
        mi = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom").propertyIndex;
        L.property("ADBE Mask Parade").property(mi).property("ADBE Mask Shape").setValue(sh);
        L.property("ADBE Mask Parade").property(mi).maskMode = MaskMode.SUBTRACT;
        L.property("ADBE Mask Parade").property(mi).property("ADBE Mask Feather").setValue([w * Y.rx.val(I, s, "softness") / 100, w * Y.rx.val(I, s, "softness") / 100]);
        Y.x.set(L.property("ADBE Transform Group").property("ADBE Opacity"), Y.rx.expr(J, s, "Math.max(0, Math.min(100, " + Y.rx.amt(J, s, "amount", true) + "));"));
    }
});

Y.prim.def("sharpen", {
    label: "Nettete", fx: ["ADBE Unsharp Mask2"], cost: 1, hosts: "any adj layer clip", main: "amount",
    params: { amount: ["n", 60, 0, 500, "k"], radius: ["n", 1.2, 0.1, 20] },
    install: function (I, s) {
        var um = Y.rx.add(I, ["ADBE Unsharp Mask2"], /unsharp mask/i, "Sharpen");
        Y.rx.set(I, um, ["ADBE Unsharp Mask2-0002", "Radius"], Y.rx.val(I, s, "radius"));
        Y.rx.setx(I, um, ["ADBE Unsharp Mask2-0001", "Amount"], Y.rx.expr(I, s, "Math.max(0, " + Y.rx.amt(I, s, "amount", true) + ");"));
    }
});
