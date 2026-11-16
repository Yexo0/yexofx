// =====================================================================
// VITESSE & RYTHME
// Time Remapping piloté par expression : chaque preset pose un marker (commentaire = nom du preset)
// sur le clip et ses réglages dans Effect Controls. Une seule expression de Time Remapping combine
// tous les presets de vitesse du clip : déplace un marker pour déplacer l'effet.
// =====================================================================
Y.speed = {};
Y.speed.BASE = {
    velocity: "YFX_Velocity", slowkill: "YFX_SlowKill", speedup: "YFX_SpeedUp", freeze: "YFX_Freeze",
    rewind: "YFX_Rewind", twtime: "YFX_TwitchTime", freezehit: "YFX_FreezeHit"
};

Y.speed.clips = function (c) {
    var r = [], i;
    for (i = 0; i < c.layers.length; i++) {
        if (c.layers[i].canSetTimeRemapEnabled) { r.push(c.layers[i]); }
    }
    if (!r.length) { Y.fail("Sélectionne le clip (footage ou précomp) : ce preset utilise le Time Remapping."); }
    return r;
};

Y.speed.has = function (L, type, key) {
    return !!Y.p.findEffect(L, Y.speed.BASE[type] + "_" + key);
};

// Expression unique de Time Remapping (seuls les presets présents sur le clip sont inclus).
Y.speed.expr = function (L) {
    var B = Y.speed.BASE, C = function (b, k) { return Y.kit.C("", b + "_" + k); }, s = "";
    if (Y.speed.has(L, "velocity", "Duree")) {
        s += "  if (cm == \"" + B.velocity + "\") {\n" +
             "    var D = Math.max(1, " + C(B.velocity, "Duree") + ") * fd, fa = " + C(B.velocity, "Rapide") + " / 100, sl = " + C(B.velocity, "Lent") + " / 100;\n" +
             "    var p1 = " + C(B.velocity, "CourbeP1") + ", p2 = " + C(B.velocity, "CourbeP2") + ";\n" +
             "    var tB = Math.min(time, t0 + D);\n" +
             "    for (var tf = t0 - D; tf < tB; tf += fd) {\n" +
             "      var u = Math.min(1, Math.abs(tf + fd / 2 - t0) / D);\n" +
             "      var sp = sl + (fa - sl) * yfxCurve(u, p1, p2);\n" +
             "      if (u > 0.85) { sp = sp + (1 - sp) * (u - 0.85) / 0.15; }\n" +
             "      src += (sp - 1) * Math.min(fd, tB - tf);\n" +
             "    }\n" +
             "  }\n";
    }
    if (Y.speed.has(L, "slowkill", "Vitesse")) {
        s += "  if (cm == \"" + B.slowkill + "\" && time > t0) { src += (" + C(B.slowkill, "Vitesse") + " / 100 - 1) * (time - t0); }\n";
    }
    if (Y.speed.has(L, "speedup", "Vitesse")) {
        s += "  if (cm == \"" + B.speedup + "\" && time > t0) { src += (" + C(B.speedup, "Vitesse") + " / 100 - 1) * (time - t0); }\n";
    }
    if (Y.speed.has(L, "freeze", "Duree")) {
        s += "  if (cm == \"" + B.freeze + "\" && time > t0) { src -= Math.min(Math.max(1, " + C(B.freeze, "Duree") + ") * fd, time - t0); }\n";
    }
    if (Y.speed.has(L, "freezehit", "Duree")) {
        s += "  if (cm == \"" + B.freezehit + "\" && time > t0) { src -= Math.min(Math.max(1, " + C(B.freezehit, "Duree") + ") * fd, time - t0); }\n";
    }
    if (Y.speed.has(L, "rewind", "Duree")) {
        s += "  if (cm == \"" + B.rewind + "\" && time > t0) {\n" +
             "    var ov = Math.min(Math.max(1, " + C(B.rewind, "Duree") + ") * fd, time - t0);\n" +
             "    src += (-" + C(B.rewind, "Vitesse") + " / 100 - 1) * ov;\n" +
             "  }\n";
    }
    if (Y.speed.has(L, "twtime", "Duree")) {
        s += "  if (cm == \"" + B.twtime + "\" && time >= t0 && time < t0 + Math.max(1, " + C(B.twtime, "Duree") + ") * fd) {\n" +
             "    seedRandom(i * 131 + Math.floor((time - t0) / fd + 0.001), true);\n" +
             "    if (random() < " + C(B.twtime, "Densite") + " / 100) { src += Math.round(random(-1, 1) * " + C(B.twtime, "Saut") + ") * fd; }\n" +
             "  }\n";
    }
    return Y.x.LIB_CURVE + "\n" +
        "var fd = thisComp.frameDuration;\n" +
        "var src = value;\n" +
        "var mm = thisLayer.marker;\n" +
        "for (var i = 1; i <= mm.numKeys; i++) {\n" +
        "  var k = mm.key(i), t0 = k.time, cm = k.comment;\n" +
        s +
        "}\n" +
        "Math.max(0, Math.min(thisLayer.source.duration - fd, src));";
};

// Active le Time Remapping (+ Pixel Motion), pose les réglages au premier passage, le marker,
// puis réécrit l'expression combinée.
Y.speed.applyTo = function (L, c, type, defs, extra) {
    var base = Y.speed.BASE[type];
    if (!Y.p.findEffect(L, base + "_" + defs[0][2])) {
        Y.kit.controls(L, base, c, defs);
        if (extra) { extra(L, base); }
    }
    if (!L.timeRemapEnabled) { L.timeRemapEnabled = true; }
    try {
        L.frameBlendingType = FrameBlendingType.PIXEL_MOTION;
        c.comp.frameBlending = true;
    } catch (e) {}
    Y.m.add(L, c.time, base);
    Y.x.set(L.property("ADBE Time Remapping"), Y.speed.expr(L));
};

Y.speed.preset = function (id, type, name, f, defsFn, extra, msg) {
    Y.reg.add({
        id: id, name: name, needs: "av", f: f,
        run: function (c) {
            var Ls = Y.speed.clips(c), i;
            for (i = 0; i < Ls.length; i++) { Y.speed.applyTo(Ls[i], c, type, defsFn(c), extra); }
            return name + " à " + Y.u.tc(c.time, c.comp) + " sur " + Ls.length + " clip(s) · " + (msg || "Time Remapping + Pixel Motion") +
                   " · déplace le marker pour déplacer l'effet";
        }
    });
};

Y.speed.preset("velocity", "velocity", "Velocity", 30, function (c) {
    return [["slider", "dur", "Duree", c.frames],
            ["slider", "fast", "Rapide", Math.round(100 + 120 * c.intensity)],
            ["slider", "slow", "Lent", Math.max(5, Math.round(30 - 10 * c.intensity))],
            ["curve", "curve"]];
});
Y.speed.preset("slowkill", "slowkill", "Slow Kill", 30, function (c) {
    return [["slider", "speed", "Vitesse", Math.max(5, Math.round(35 - 10 * c.intensity))]];
});
Y.speed.preset("speedup", "speedup", "Speed Up", 20, function (c) {
    return [["slider", "speed", "Vitesse", Math.round(100 + 200 * c.intensity)]];
});
Y.speed.preset("freeze", "freeze", "Freeze", 20, function (c) {
    return [["slider", "dur", "Duree", c.frames]];
});
Y.speed.preset("rewind", "rewind", "Rewind", 24, function (c) {
    return [["slider", "dur", "Duree", c.frames], ["slider", "speed", "Vitesse", Math.round(200 + 100 * c.intensity)]];
});
Y.speed.preset("tw-time", "twtime", "Twitch Time", 8, function (c) {
    return [["slider", "dur", "Duree", c.frames], ["slider", "dens", "Densite", 55], ["slider", "jump", "Saut", Math.max(1, Math.round(3 * c.intensity))]];
}, null, "sauts dans le temps (Time Remapping)");

// Freeze Hit : arrêt sur image + zoom lent + désaturation, puis flash à la reprise.
Y.speed.preset("freezehit", "freezehit", "Freeze Hit", 18, function (c) {
    return [["slider", "dur", "Duree", c.frames], ["slider", "zoom", "Zoom", Y.u.round(7 * c.intensity, 1)], ["curve", "curve"]];
}, function (L, base) {
    var C = Y.kit.C, n = { dur: base + "_Duree", curve: { p1: base + "_CourbeP1", p2: base + "_CourbeP2" } }, env = Y.kit.envCode(n, "", base);
    var tr = Y.shake.addTransform(L, base, 0, 0), ti, ex;
    Y.x.set(Y.shake.trProp(L, tr, "scale"), env + "(tt < d) ? value + " + C("", base + "_Zoom") + " * tt / d : value;");
    ti = Y.fxe.add(L, Y.FX.tint, /^tint$/i, base + "_Tint");
    Y.fxe.expr(L, ti, Y.FX.tintAmt, env + "(tt < d) ? 100 : 0;");
    ex = Y.fxe.add(L, Y.FX.expo, /^exposure$/i, base + "_Exposure");
    Y.fxe.expr(L, ex, Y.FX.expoV, env + "var f3 = 3 * thisComp.frameDuration;\n(tt >= d && tt < d + f3) ? value + 1.2 * (1 - (tt - d) / f3) : value;");
}, "arrêt sur image + zoom + flash");

// Choppy : la cadence tombe à 12 i/s (look saccadé), en continu.
Y.shake.preset("posterize", "Choppy", 0, false, function (L, c, base) {
    var n = Y.kit.controls(L, base, c, [["slider", "rate", "Cadence", 12]]);
    var pt = Y.fxe.add(L, Y.FX.post, /posterize time/i, base + "_Posterize");
    Y.fxe.expr(L, pt, Y.FX.postRate, Y.kit.C("", n.rate) + ";");
});

Y.reg.add({
    id: "marker", name: "Marker au CTI", needs: "layer",
    run: function (c) {
        for (var i = 0; i < c.layers.length; i++) {
            Y.m.add(c.layers[i], c.time, "");
        }
        return "Marker posé à " + Y.u.tc(c.time, c.comp) + " sur " + c.layers.length + " calque(s).";
    }
});

// Beat sync : Convert Audio to Keyframes, détection des pics, un marker "beat" par pic sur le calque audio.
// Ensuite : sélectionne ce calque audio et clique un impact / flash -> un impact par beat.
Y.reg.add({
    id: "beat", name: "Beat sync", needs: "audio", f: 8, autotest: false,
    run: function (c) {
        var L = c.layer, cmd = app.findMenuCommandId("Convert Audio to Keyframes"), before, amp, fx, both, n, i, vals = [], times = [], mx = 0, thr, gap, last = -1e9, count = 0;
        if (!cmd) { Y.fail("Commande « Convert Audio to Keyframes » introuvable dans ce AE."); }
        for (i = 1; i <= c.comp.numLayers; i++) { c.comp.layer(i).selected = false; }
        L.selected = true;
        before = c.comp.numLayers;
        app.executeCommand(cmd);
        if (c.comp.numLayers === before) { Y.fail("AE n'a pas créé le calque Audio Amplitude. Clique dans la timeline de la comp puis relance."); }
        amp = c.comp.layer(1);
        fx = Y.p.parade(amp);
        both = fx.property(fx.numProperties).property(1);
        n = both.numKeys;
        for (i = 1; i <= n; i++) {
            vals.push(both.keyValue(i));
            times.push(both.keyTime(i));
            if (vals[i - 1] > mx) { mx = vals[i - 1]; }
        }
        thr = mx * Y.u.clamp(0.75 - 0.25 * c.intensity, 0.2, 0.95);
        gap = c.frames * c.fd;
        for (i = 1; i < n - 1; i++) {
            if (vals[i] >= thr && vals[i] >= vals[i - 1] && vals[i] >= vals[i + 1] && times[i] - last >= gap) {
                Y.m.add(L, times[i], "beat");
                last = times[i];
                count++;
            }
        }
        amp.remove();
        L.selected = true;
        return count + " beats posés en markers sur " + L.name + " · garde-le sélectionné et clique un impact ou un flash : un par beat";
    }
});

// Easing sur les keyframes sélectionnées (conversion bézier -> vitesse + influence, comme Flow).
Y.k.bezier = function (P, k1, k2, b) {
    var t1 = P.keyTime(k1), t2 = P.keyTime(k2), dt = t2 - t1, v1 = P.keyValue(k1), v2 = P.keyValue(k2);
    var dims = Y.k.easeDims(P), speeds = [], i, dv, outE = [], inE = [];
    var x1 = Y.u.clamp(b[0], 0.01, 1), y1 = b[1], x2 = Y.u.clamp(b[2], 0, 0.99), y2 = b[3];
    if (dims === 1) {
        if (Y.u.isArray(v1)) {
            dv = 0;
            for (i = 0; i < v1.length; i++) { dv += (v2[i] - v1[i]) * (v2[i] - v1[i]); }
            dv = Math.sqrt(dv);
        } else {
            dv = v2 - v1;
        }
        speeds.push(dv / dt);
    } else {
        for (i = 0; i < dims; i++) { speeds.push((v2[i] - v1[i]) / dt); }
    }
    for (i = 0; i < speeds.length; i++) {
        outE.push(new KeyframeEase(speeds[i] * y1 / x1, x1 * 100));
        inE.push(new KeyframeEase(speeds[i] * (1 - y2) / (1 - x2), Y.u.clamp((1 - x2) * 100, 0.1, 100)));
    }
    P.setInterpolationTypeAtKey(k1, P.keyInInterpolationType(k1), KeyframeInterpolationType.BEZIER);
    P.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, P.keyOutInterpolationType(k2));
    P.setTemporalEaseAtKey(k1, P.keyInTemporalEase(k1), outE);
    P.setTemporalEaseAtKey(k2, inE, P.keyOutTemporalEase(k2));
};

Y.reg.add({
    id: "ease", name: "Easing keys", needs: "comp", autotest: false,
    run: function (c) {
        var props = c.comp.selectedProperties, i, j, P, keys, done = 0;
        if (c.curve.special) { Y.fail("Elastic ne s'applique pas à des keyframes : choisis une courbe bézier."); }
        for (i = 0; i < props.length; i++) {
            P = props[i];
            if (P.propertyType !== PropertyType.PROPERTY || !P.numKeys) { continue; }
            keys = P.selectedKeys;
            for (j = 0; j < keys.length - 1; j++) {
                if (keys[j + 1] === keys[j] + 1) {
                    Y.k.bezier(P, keys[j], keys[j + 1], c.curve.b);
                    done++;
                }
            }
        }
        if (!done) { Y.fail("Sélectionne au moins 2 keyframes qui se suivent sur une propriété."); }
        return "Courbe " + c.curve.name + " appliquée à " + done + " intervalle(s) de keyframes.";
    }
});
