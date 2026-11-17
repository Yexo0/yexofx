// =====================================================================
// PRIMITIVES : texte (animators + sélecteur d'expression, Source Text, styles).
// Réglages communs des animations de texte (une fois par instance) : Durée, Délai, Mode (entrée / sortie / les deux), Courbe.
// =====================================================================
Y.pt = {};

Y.pt.needText = function (I) {
    if (!(I.L instanceof TextLayer)) { Y.fail("Ce preset s'applique à un calque texte (T). Sélectionne-le, ou crée un texte d'abord."); }
};

Y.pt.ctl = function (I) {
    if (!I.tc) { I.tc = Y.text.controls(I.L, I.base, I.c, Y.text.DELAY[I.c.by] || 2); }
    return I.tc;
};

// Index de la lettre / du mot selon l'ordre de révélation.
Y.pt.order = function (order) {
    if (order === "reverse") { return "var i = nb - textIndex;\n"; }
    if (order === "center") { return "var i = Math.abs(textIndex - 1 - (nb - 1) / 2);\n"; }
    if (order === "edges") { return "var i = (nb - 1) / 2 - Math.abs(textIndex - 1 - (nb - 1) / 2);\n"; }
    if (order === "random") { return "seedRandom(textIndex * 7 + 3, true);\nvar i = Math.floor(random(0, nb));\n"; }
    return "var i = textIndex - 1;\n";
};

// Sélecteur « révélation » (100 = caché, 0 = posé ; dépassement possible avec une courbe à rebond).
Y.pt.selector = function (n, order) {
    var X = Y.x.ctl;
    return Y.x.LIB_CURVE + "\n" +
        "var fd = thisComp.frameDuration, nb = textTotal;\n" +
        "var d = Math.max(1, " + X(n.dur) + ") * fd, dl = Math.max(0, " + X(n.delay) + ") * fd;\n" +
        "var mode = Math.round(" + X(n.mode) + "), p1 = " + X(n.curve.p1) + ", p2 = " + X(n.curve.p2) + ";\n" +
        Y.pt.order(order) +
        "var tin = (time - (thisLayer.inPoint + i * dl)) / d;\n" +
        "var tout = (time - (thisLayer.outPoint - d - (nb - 1 - i) * dl)) / d;\n" +
        "var v = 0;\n" +
        "if (mode == 1 || mode == 3) { v = 100 * (1 - yfxCurve(tin, p1, p2)); }\n" +
        "if (mode == 2 || mode == 3) { if (tout > 0) { v = 100 * (1 - yfxCurve(1 - tout, p1, p2)); } else if (mode == 2) { v = 0; } }\n" +
        "[v, v, v];";
};

Y.prim.def("textReveal", {
    label: "Revelation", fx: [], cost: 1, hosts: "text new", main: null,
    params: {
        scale: ["n", 100, -400, 600], posx: ["n", 0, -3000, 3000, "k"], posy: ["n", 0, -3000, 3000, "k"], rotx: ["n", 0, -720, 720],
        roty: ["n", 0, -720, 720], rotz: ["n", 0, -720, 720], opacity: ["n", 0, 0, 100], blur: ["n", 0, 0, 300, "k"],
        tracking: ["n", 0, -300, 600, "k"], skew: ["n", 0, -85, 85], fill: ["c", "#ffffff"],
        order: ["e", "forward", ["forward", "reverse", "center", "edges", "random"]]
    },
    install: function (I, s) {
        var props = [], k = I.c.intensity, n, has = function (x) { return s[x] !== undefined; }, v;
        Y.pt.needText(I);
        n = Y.pt.ctl(I);
        if (has("scale")) { v = Number(s.scale); props.push({ mn: "ADBE Text Scale 3D", value: [v, v, 100] }); }
        if (has("posx") || has("posy")) { props.push({ mn: "ADBE Text Position 3D", value: [Number(s.posx || 0) * k, Number(s.posy || 0) * k, 0] }); }
        if (has("rotx")) { props.push({ mn: "ADBE Text Rotation X", value: Number(s.rotx) }); }
        if (has("roty")) { props.push({ mn: "ADBE Text Rotation Y", value: Number(s.roty) }); }
        if (has("rotz")) { props.push({ mn: "ADBE Text Rotation", value: Number(s.rotz) }); }
        if (has("blur")) { v = Number(s.blur) * k; props.push({ mn: "ADBE Text Blur", value: [v, v] }); }
        if (has("tracking")) { props.push({ mn: "ADBE Text Tracking Amount", value: Math.round(Number(s.tracking) * k) }); }
        if (has("skew")) { props.push({ mn: "ADBE Text Skew", value: Number(s.skew) }); }
        if (has("fill")) { props.push({ mn: "ADBE Text Fill Color", value: Y.rx.rgba(s["fill"]) }); }
        props.push({ mn: "ADBE Text Opacity", value: Number(Y.rx.val(I, s, "opacity")) });
        if (has("rotx") || has("roty")) { try { I.L.threeDPerChar = true; } catch (e) {} }
        Y.text.addAnimator(I.L, I.base, props, Y.pt.selector(n, Y.rx.val(I, s, "order")), I.c.by);
    }
});

// Glitch, scramble, flicker : actif pendant l'entrée et / ou la sortie (Mode).
Y.prim.def("textRandom", {
    label: "Glitch", fx: [], cost: 1, hosts: "text new", main: null,
    params: { kind: ["e", "glitch", ["glitch", "scramble", "flicker"]], amount: ["n", 16, 0, 300, "k"], color: ["c", "#ff4655"] },
    install: function (I, s) {
        var n, C = Y.x.ctl, act, k = Y.rx.val(I, s, "kind");
        Y.pt.needText(I);
        n = Y.pt.ctl(I);
        act = "var fd = thisComp.frameDuration, d = Math.max(1, " + C(n.dur) + ") * fd, mode = Math.round(" + C(n.mode) + ");\n" +
              "var act = (mode != 2 && time - thisLayer.inPoint < d * 1.5) || (mode != 1 && thisLayer.outPoint - time < d * 1.5);\n" +
              "var v = 0;\n";
        if (k === "scramble") {
            Y.text.addAnimator(I.L, I.base + "_Scramble", [{ mn: "ADBE Text Character Offset", value: 40 }],
                act + "if (act) { seedRandom(textIndex * 13 + Math.floor(time / fd / 2), true); v = (random() < 0.6) ? random(10, 100) : 0; }\n[v, v, v];", "car");
        } else if (k === "flicker") {
            Y.text.addAnimator(I.L, I.base + "_Flicker", [{ mn: "ADBE Text Opacity", value: 0 }],
                act + "if (act) { seedRandom(textIndex * 19 + Math.floor(time / fd), true); v = (random() < 0.4) ? 100 : 0; }\n[v, v, v];", "car");
        } else {
            Y.text.addAnimator(I.L, I.base + "_Glitch", [{ mn: "ADBE Text Position 3D", value: [Y.rx.val(I, s, "amount") * I.c.intensity, 0, 0] }],
                act + "if (act) { seedRandom(textIndex * 17 + Math.floor(time / fd / 2), true); v = (random() < 0.45) ? random(-100, 100) : 0; }\n[v, v, v];", "car");
            Y.text.addAnimator(I.L, I.base + "_GlitchCouleur", [{ mn: "ADBE Text Fill Color", value: Y.rx.rgba(Y.rx.val(I, s, "color")) }],
                act + "if (act) { seedRandom(textIndex * 29 + Math.floor(time / fd / 2), true); v = (random() < 0.3) ? 100 : 0; }\n[v, v, v];", "car");
        }
    }
});

Y.prim.def("typewriter", {
    label: "Frappe", fx: [], cost: 1, hosts: "text new", main: null,
    params: { cursor: ["b", true], cursorChar: ["t", "|"] },
    install: function (I, s) {
        var st, txt, per, n, X = Y.x.ctl;
        Y.pt.needText(I);
        st = I.L.property("ADBE Text Properties").property("ADBE Text Document");
        txt = String(st.value.text || "");
        per = Math.max(1, Math.round(I.c.frames / Math.max(1, txt.length)));
        n = Y.kit.controls(I.L, I.base, I.c, [
            ["slider", "per", "ImagesParLettre", per],
            ["checkbox", "cursor", "Curseur", !!Y.rx.val(I, s, "cursor")],
            ["dropdown", "mode", "Mode", { "in": 1, out: 2, both: 3 }[I.c.dir] || 1, ["Entrée", "Sortie", "Entrée + sortie"]]
        ]);
        Y.x.set(st,
            "var s = \"\" + value, nb = s.length, fd = thisComp.frameDuration;\n" +
            "var per = Math.max(0.5, " + X(n.per) + ") * fd, mode = Math.round(" + X(n.mode) + ");\n" +
            "var shown = nb;\n" +
            "if (mode != 2) { shown = Math.min(nb, Math.max(0, Math.floor((time - thisLayer.inPoint) / per))); }\n" +
            "if (mode != 1) { var left = Math.floor((thisLayer.outPoint - time) / per); if (left < nb) { shown = Math.min(shown, Math.max(0, left)); } }\n" +
            "var cur = \"\";\n" +
            "if (" + X(n.cursor) + " == 1) { cur = (Math.floor(time / 0.45) % 2 == 0) ? \"" + Y.x.esc(Y.rx.val(I, s, "cursorChar")) + "\" : \" \"; }\n" +
            "s.substr(0, shown) + cur;");
    }
});

Y.prim.def("textWave", {
    label: "Vague", fx: [], cost: 1, hosts: "text new", main: "amp",
    params: { amp: ["n", 18, 0, 300, "k"], freq: ["n", 1.2, 0.05, 12], gap: ["n", 0.6, 0, 4], axis: ["e", "y", ["y", "scale", "rot"]] },
    install: function (I, s) {
        var A, ax = Y.rx.val(I, s, "axis"), prop, sel;
        Y.pt.needText(I);
        A = Y.rx.val(I, s, "amp") * I.c.intensity;
        prop = ax === "scale" ? { mn: "ADBE Text Scale 3D", value: [100 + A, 100 + A, 100] } :
               ax === "rot" ? { mn: "ADBE Text Rotation", value: A } : { mn: "ADBE Text Position 3D", value: [0, -A, 0] };
        sel = "var v = 100 * Math.sin(2 * Math.PI * " + Y.rx.f(Y.rx.val(I, s, "freq")) + " * time + textIndex * " + Y.rx.f(Y.rx.val(I, s, "gap")) + ");\n[v, v, v];";
        Y.text.addAnimator(I.L, I.base + "_Wave", [prop], sel, I.c.by);
    }
});

// Kinetic : un mot par marker du calque texte (sinon tous les « Durée » images). highlight = sous-titres TikTok :
// tous les mots visibles, le mot courant grossit et prend la couleur.
Y.prim.def("textKinetic", {
    label: "Kinetic", fx: [], cost: 1, hosts: "text new", main: null,
    params: { mode: ["e", "word", ["word", "stack", "highlight"]], color: ["c", "#ff4b3e"], scale: ["n", 115, 100, 300] },
    install: function (I, s) {
        var n, X = Y.x.ctl, m = Y.rx.val(I, s, "mode"), head, sc = Y.rx.val(I, s, "scale");
        Y.pt.needText(I);
        n = Y.pt.ctl(I);
        head = Y.x.LIB_CURVE + "\n" +
            "var fd = thisComp.frameDuration, d = Math.max(1, " + X(n.dur) + ") * fd, mm = thisLayer.marker;\n" +
            "var p1 = " + X(n.curve.p1) + ", p2 = " + X(n.curve.p2) + ";\n";
        if (m === "highlight") {
            Y.text.addAnimator(I.L, I.base + "_Mot", [{ mn: "ADBE Text Fill Color", value: Y.rx.rgba(Y.rx.val(I, s, "color")) }, { mn: "ADBE Text Scale 3D", value: [sc, sc, 100] }],
                head + "var cur = 0;\n" +
                "if (mm.numKeys > 0) { for (var j = 1; j <= mm.numKeys; j++) { if (mm.key(j).time <= time) { cur = j; } } }\n" +
                "else { cur = Math.floor((time - thisLayer.inPoint) / d) + 1; }\n" +
                "var t0 = (mm.numKeys >= cur && cur > 0) ? mm.key(cur).time : thisLayer.inPoint + (cur - 1) * d;\n" +
                "var v = (textIndex == cur) ? 100 * yfxCurve(Math.min(1, (time - t0) / d), p1, p2) : 0;\n[v, v, v];", "mot");
            return;
        }
        Y.text.addAnimator(I.L, I.base + "_Kinetic",
            m === "stack" ? [{ mn: "ADBE Text Position 3D", value: [0, 60 * I.c.intensity, 0] }, { mn: "ADBE Text Opacity", value: 0 }] :
                            [{ mn: "ADBE Text Scale 3D", value: [0, 0, 0] }, { mn: "ADBE Text Opacity", value: 0 }],
            head + "var t0 = (mm.numKeys >= textIndex) ? mm.key(textIndex).time : thisLayer.inPoint + (textIndex - 1) * d;\n" +
            "var v = 100 * (1 - yfxCurve((time - t0) / d, p1, p2));\n[v, v, v];", "mot");
    }
});

// Style de titre : police (première installée d'une liste), couleurs, contour, capitales, approche.
Y.prim.def("textStyle", {
    label: "Style", fx: [], cost: 1, hosts: "text new", main: null,
    params: {
        fonts: ["a", []], fill: ["c", "#ffffff"], stroke: ["c", "#000000"], strokeW: ["n", 0, 0, 60, "k"], caps: ["b", false],
        italic: ["b", false], tracking: ["n", 0, -200, 600], fauxBold: ["b", false]
    },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, font = null, f = V("fonts"), i, cands = [];
        Y.pt.needText(I);
        for (i = 0; i < f.length; i++) { if (Y.u.isArray(f[i]) && f[i].length === 2) { cands.push(f[i]); } }
        if (cands.length) { font = Y.style.font(cands); }
        Y.style.doc(I.L, function (td) {
            if (font) { try { td.font = font; } catch (e) {} }
            td.applyFill = true;
            td.fillColor = Y.rx.rgb(V("fill"));
            if (V("strokeW") > 0) {
                td.applyStroke = true;
                td.strokeColor = Y.rx.rgb(V("stroke"));
                td.strokeWidth = Math.max(1, Math.round(V("strokeW") * I.c.intensity));
                td.strokeOverFill = false;
            }
            try { if (V("caps")) { td.allCaps = true; } } catch (e2) {}
            try { if (V("italic")) { td.fauxItalic = true; } } catch (e3) {}
            try { if (V("fauxBold")) { td.fauxBold = true; } } catch (e4) {}
            try { if (V("tracking")) { td.tracking = V("tracking"); } } catch (e5) {}
        });
    }
});

// Ombres empilées : contour, halo, extrusion 3D (ombres successives), ombre longue, décalage.
Y.prim.def("textShadow", {
    label: "Ombre", fx: ["ADBE Drop Shadow"], cost: 1, hosts: "text new layer", main: null,
    params: {
        kind: ["e", "outline", ["outline", "halo", "extrude", "long", "offset"]], color: ["c", "#000000"], size: ["n", 4, 0, 300, "k"],
        steps: ["n", 6, 1, 14], dir: ["n", 135, 0, 360]
    },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, k = V("kind"), col = Y.rx.rgba(V("color")), sz = V("size") * I.c.intensity, i, n, dirs = [0, 90, 180, 270];
        if (k === "outline") {
            for (i = 0; i < dirs.length; i++) { Y.style.shadow(I.L, I.base + "_Contour" + (i + 1), { color: col, dir: dirs[i], dist: Math.max(1, sz), soft: 0 }); }
        } else if (k === "halo") {
            Y.style.shadow(I.L, I.base + "_Halo", { color: col, dir: 0, dist: 0, soft: Math.round(sz * 4) });
            Y.style.shadow(I.L, I.base + "_Halo2", { color: col, dir: 0, dist: 0, soft: Math.round(sz * 12) });
        } else if (k === "extrude") {
            n = Math.max(1, Math.round(V("steps")));
            for (i = 1; i <= n; i++) { Y.style.shadow(I.L, I.base + "_Relief" + i, { color: col, dir: V("dir"), dist: Y.u.round(sz * i / n, 2), soft: 0 }); }
        } else if (k === "long") {
            Y.style.shadow(I.L, I.base + "_Longue", { color: col, opacity: 0.6, dir: V("dir"), dist: Math.round(sz), soft: Math.round(sz * 0.6) });
        } else {
            Y.style.shadow(I.L, I.base + "_Decale", { color: col, dir: V("dir"), dist: Math.round(sz), soft: 0 });
        }
    }
});

// Remplissage : dégradé animé, chrome (dégradé + biseau + reflet qui passe), reflet seul.
Y.prim.def("textFill", {
    label: "Remplissage", fx: ["ADBE Ramp", "ADBE Bevel Alpha", "CC Light Sweep"], cost: 2, hosts: "text new layer", main: null,
    params: { kind: ["e", "gradient", ["gradient", "chrome", "sweep"]], colorA: ["c", "#c8bfff"], colorB: ["c", "#ff4655"], speed: ["n", 0.4, 0, 5] },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, k = V("kind"), gr, bv, ls, sp = Y.rx.f(V("speed"));
        if (k !== "sweep") {
            gr = Y.rx.add(I, ["ADBE Ramp"], /gradient ramp/i, "Degrade");
            Y.rx.set(I, gr, ["ADBE Ramp-0002", "Start Color"], Y.rx.rgba(V("colorA")));
            Y.rx.set(I, gr, ["ADBE Ramp-0004", "End Color"], Y.rx.rgba(V("colorB")));
            if (k === "gradient") {
                Y.rx.setx(I, gr, ["ADBE Ramp-0001", "Start of Ramp"], "var r = sourceRectAtTime(time, false), s = (time * " + sp + ") % 1;\n[r.left - r.width * s, r.top + r.height / 2];");
                Y.rx.setx(I, gr, ["ADBE Ramp-0003", "End of Ramp"], "var r = sourceRectAtTime(time, false), s = (time * " + sp + ") % 1;\n[r.left + r.width * (1 - s), r.top + r.height / 2];");
            } else {
                Y.rx.setx(I, gr, ["ADBE Ramp-0001", "Start of Ramp"], "var r = sourceRectAtTime(time, false);\n[r.left + r.width / 2, r.top];");
                Y.rx.setx(I, gr, ["ADBE Ramp-0003", "End of Ramp"], "var r = sourceRectAtTime(time, false);\n[r.left + r.width / 2, r.top + r.height];");
                bv = Y.rx.add(I, ["ADBE Bevel Alpha"], /bevel alpha/i, "Biseau");
                Y.rx.set(I, bv, ["ADBE Bevel Alpha-0001", "Edge Thickness"], 3);
                try { Y.rx.set(I, bv, ["ADBE Bevel Alpha-0004", "Light Intensity"], 0.6); } catch (e) {}
            }
            if (k === "gradient") { return; }
        }
        ls = Y.rx.add(I, ["CC Light Sweep"], /light sweep/i, "Reflet");
        Y.rx.setx(I, ls, ["CC Light Sweep-0001", "Center"], "var r = sourceRectAtTime(time, false), s = (time * " + (Number(sp) > 0 ? sp : "0.5") + ") % 1.6 - 0.3;\n[r.left + r.width * s, r.top + r.height / 2];");
    }
});

// Compteur : 0 -> N sur la durée, nombre de markers passés (compteur de kills) ou chrono.
Y.prim.def("textCounter", {
    label: "Compteur", fx: [], cost: 1, hosts: "text new", main: null,
    params: {
        kind: ["e", "count", ["count", "markers", "timer"]], from: ["n", 0, -1000000, 1000000], to: ["n", 100, -1000000, 1000000],
        prefix: ["t", ""], suffix: ["t", ""], decimals: ["n", 0, 0, 3]
    },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, st, n, X = Y.x.ctl, k = V("kind"), body, pre = Y.x.esc(V("prefix")), suf = Y.x.esc(V("suffix"));
        Y.pt.needText(I);
        st = I.L.property("ADBE Text Properties").property("ADBE Text Document");
        n = Y.pt.ctl(I);
        if (k === "markers") {
            body = "var mm = thisLayer.marker, c = 0;\nfor (var j = 1; j <= mm.numKeys; j++) { if (mm.key(j).time <= time) { c++; } }\nvar out = \"\" + c;\n";
        } else if (k === "timer") {
            body = "var e = Math.max(0, time - thisLayer.inPoint), m = Math.floor(e / 60), sec = e - m * 60;\n" +
                   "var out = m + \":\" + (sec < 10 ? \"0\" : \"\") + sec.toFixed(2);\n";
        } else {
            body = Y.x.LIB_CURVE + "\nvar fd = thisComp.frameDuration, d = Math.max(1, " + X(n.dur) + ") * fd;\n" +
                   "var g = yfxCurve(Math.max(0, Math.min(1, (time - thisLayer.inPoint) / d)), " + X(n.curve.p1) + ", " + X(n.curve.p2) + ");\n" +
                   "var out = (" + Y.rx.f(V("from")) + " + (" + Y.rx.f(V("to") - V("from")) + ") * g).toFixed(" + Math.round(V("decimals")) + ");\n";
        }
        Y.x.set(st, body + "\"" + pre + "\" + out + \"" + suf + "\";");
    }
});
