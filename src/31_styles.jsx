// =====================================================================
// STYLES DE TEXTE : document texte (police, couleur, contour) + effets natifs (Drop Shadow,
// Gradient Ramp). Polices : la meilleure installée dans une liste (app.fonts, AE 2024+).
// =====================================================================
Y.style = {};

// PostScript de la première police installée parmi cands = [[famille, style], ...], ou null.
Y.style.font = function (cands) {
    var i, r;
    try {
        if (!app.fonts || !app.fonts.getFontsByFamilyNameAndStyleName) { return null; }
        for (i = 0; i < cands.length; i++) {
            r = app.fonts.getFontsByFamilyNameAndStyleName(cands[i][0], cands[i][1]);
            if (r && r.length) { return r[0].postScriptName; }
        }
    } catch (e) {}
    return null;
};

Y.style.doc = function (L, fn) {
    var tp = L.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
    fn(td);
    tp.setValue(td);
};

// Ombre portée nommée. o = { color, opacity, dir, dist, soft, distExpr }
Y.style.shadow = function (L, name, o) {
    var sh = Y.fxe.add(L, Y.FX.shadow, /drop shadow/i, name);
    Y.fxe.set(L, sh, Y.FX.shColor, o.color);
    Y.fxe.set(L, sh, Y.FX.shOpacity, Math.round((o.opacity === undefined ? 1 : o.opacity) * 255));
    Y.fxe.set(L, sh, Y.FX.shDir, o.dir || 0);
    Y.fxe.set(L, sh, Y.FX.shDist, o.dist || 0);
    Y.fxe.set(L, sh, Y.FX.shSoft, o.soft || 0);
    if (o.distExpr) { Y.fxe.expr(L, sh, Y.FX.shDist, o.distExpr); }
    return sh;
};

Y.style.preset = function (id, name, apply) {
    Y.reg.add({
        id: id, name: name, needs: "text",
        run: function (c) {
            var i, base = Y.PREFIX + name.replace(/[^A-Za-z0-9]/g, ""), font = null;
            for (i = 0; i < c.layers.length; i++) { font = apply(c.layers[i], c, base) || font; }
            return "Style " + name + " sur " + c.layers.length + " calque(s) texte" + (font ? " · police " + font : "");
        }
    });
};

Y.style.preset("val", "Valorant", function (L, c, base) {
    var font = Y.style.font([["Tungsten", "Bold"], ["Bebas Neue", "Regular"], ["Anton", "Regular"], ["Oswald", "Bold"], ["Impact", "Regular"]]);
    Y.style.doc(L, function (td) {
        if (font) { try { td.font = font; } catch (e) {} }
        td.applyFill = true;
        td.fillColor = [1, 0.2745, 0.3333];
        td.applyStroke = true;
        td.strokeColor = [1, 1, 1];
        td.strokeWidth = Math.max(1, Math.round(4 * c.intensity));
        td.strokeOverFill = false;
        try { td.allCaps = true; } catch (e2) {}
    });
    Y.style.shadow(L, base + "_Ombre", { color: [0, 0, 0, 1], dir: 135, dist: Math.round(8 * c.intensity), soft: 0 });
    return font;
});

Y.style.preset("cs2", "CS2", function (L, c, base) {
    var font = Y.style.font([["Stratum2", "Bold"], ["Rajdhani", "Bold"], ["Teko", "SemiBold"], ["Barlow Condensed", "Bold"], ["Arial", "Bold"]]);
    Y.style.doc(L, function (td) {
        if (font) { try { td.font = font; } catch (e) {} }
        td.applyFill = true;
        td.fillColor = [0.949, 0.663, 0.231];
        try { td.fauxItalic = true; td.allCaps = true; } catch (e2) {}
    });
    Y.style.shadow(L, base + "_Ombre", { color: [0.16, 0.16, 0.16, 1], dir: 135, dist: Math.round(5 * c.intensity), soft: 0 });
    return font;
});

Y.style.preset("neon", "Neon", function (L, c, base) {
    Y.style.doc(L, function (td) { td.applyFill = true; td.fillColor = [0.957, 0.941, 1]; });
    Y.style.shadow(L, base + "_Halo", { color: [0.78, 0.75, 1, 1], dir: 0, dist: 0, soft: Math.round(18 * c.intensity) });
    Y.style.shadow(L, base + "_Halo2", { color: [0.557, 0.498, 1, 1], dir: 0, dist: 0, soft: Math.round(60 * c.intensity) });
    Y.x.set(L.property("ADBE Transform Group").property("ADBE Opacity"),
        "seedRandom(Math.floor(time * 12), true);\n(random() < 0.06) ? value * random(0.45, 0.8) : value;");
});

// Double contour : contour noir (texte) + contour lavande (4 ombres dures).
Y.style.preset("double", "Double contour", function (L, c, base) {
    var w = Math.max(1, Math.round(4 * c.intensity)), dirs = [0, 90, 180, 270], i;
    Y.style.doc(L, function (td) {
        td.applyStroke = true;
        td.strokeColor = [0, 0, 0];
        td.strokeWidth = w + 2;
        td.strokeOverFill = false;
    });
    for (i = 0; i < dirs.length; i++) {
        Y.style.shadow(L, base + "_Contour" + (i + 1), { color: [0.78, 0.75, 1, 1], dir: dirs[i], dist: w, soft: 0 });
    }
});

// Gradient : Gradient Ramp calé sur la boîte du texte, couleurs dans Effect Controls.
Y.style.preset("grad", "Gradient", function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["color", "a", "CouleurA", [0.78, 0.75, 1]],
        ["color", "b", "CouleurB", [1, 0.2745, 0.3333]],
        ["slider", "speed", "Vitesse", 0.4]
    ]), gr = Y.fxe.add(L, ["ADBE Ramp"], /gradient ramp/i, base + "_Degrade");
    Y.fxe.expr(L, gr, ["ADBE Ramp-0001", "Start of Ramp"], "var r = sourceRectAtTime(time, false), s = (time * " + C("", n.speed) + ") % 1;\n[r.left - r.width * s, r.top + r.height / 2];");
    Y.fxe.expr(L, gr, ["ADBE Ramp-0003", "End of Ramp"], "var r = sourceRectAtTime(time, false), s = (time * " + C("", n.speed) + ") % 1;\n[r.left + r.width * (1 - s), r.top + r.height / 2];");
    Y.fxe.expr(L, gr, ["ADBE Ramp-0002", "Start Color"], C("", n.a) + ";");
    Y.fxe.expr(L, gr, ["ADBE Ramp-0004", "End Color"], C("", n.b) + ";");
});

// Glitch figé : écart rouge / cyan permanent avec des sauts ponctuels.
Y.style.preset("glitchs", "Glitch", function (L, c, base) {
    var dist = Math.max(1, Math.round(3 * c.intensity)), jump = "seedRandom(Math.floor(time * 12), true);\n(random() < 0.15) ? value * random(2, 4) : value;";
    Y.style.shadow(L, base + "_Rouge", { color: [1, 0.2745, 0.3333, 1], dir: 270, dist: dist, soft: 0, distExpr: jump });
    Y.style.shadow(L, base + "_Cyan", { color: [0.27, 0.88, 1, 1], dir: 90, dist: dist, soft: 0, distExpr: jump });
});
