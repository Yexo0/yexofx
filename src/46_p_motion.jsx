// =====================================================================
// PRIMITIVES : mouvement (effet Transform + Motion Tile), temps, flou.
// Reprend la mécanique v0.6 (40_shake, 43_twitch, 50_timing) sous forme paramétrable.
// =====================================================================
Y.pm = {};

// Code qui définit les unités de mouvement ox, oy (position), orr (rotation), oz (zoom), à multiplier par l'amplitude.
// f = fréquence, E / EP = enveloppe, tt / u / fr / sd = temps depuis le déclencheur. loop = pilotage continu.
Y.pm.unit = function (pattern, seed, loop) {
    var S = Y.rx.f(seed || 0), T = "6.2832", s;
    s = "seedRandom(sd * 7 + " + S + ", true);\n" +
        "var px = random(0, 6.2832), py = random(0, 6.2832), pr = random(0, 6.2832), ox = 0, oy = 0, orr = 0, oz = 0;\n";
    if (pattern === "wiggle") {
        s += "ox = E * (0.6 * Math.sin(" + T + " * f * tt + px) + 0.4 * Math.sin(" + T + " * f * 2.13 * tt + py));\n" +
             "oy = E * (0.6 * Math.sin(" + T + " * f * 0.93 * tt + py) + 0.4 * Math.sin(" + T + " * f * 1.71 * tt + pr));\n" +
             "orr = E * Math.sin(" + T + " * f * 0.7 * tt + pr);\n";
    } else if (pattern === "bursts") {
        s += "var seg = 1 / Math.max(0.1, f), si = Math.floor(tt / seg);\n" +
             "seedRandom(si * 13 + " + S + " + 3, true);\n" +
             "var on = random() < 0.45, lt = tt - si * seg, kb = on ? Math.max(0, 1 - lt / (seg * 0.6)) : 0, qx = random(0, 6.2832), qy = random(0, 6.2832);\n" +
             "ox = E * kb * Math.sin(" + T + " * 14 * lt + qx);\n" +
             "oy = E * kb * Math.sin(" + T + " * 16.5 * lt + qy);\n" +
             "orr = 0.5 * ox;\n";
    } else if (pattern === "jumps") {
        s += "var seg = 1 / Math.max(0.1, f), si = Math.floor(tt / seg);\n" +
             "seedRandom(si * 17 + " + S + " + 50, true);\n" +
             "var kj = Math.max(0, 1 - (tt - si * seg) / (6 * fd)), jx = random(-1, 1), jy = random(-1, 1);\n" +
             "ox = E * (jx * kj + 0.3 * Math.sin(" + T + " * 0.6 * tt + px));\n" +
             "oy = E * (jy * kj + 0.3 * Math.sin(" + T + " * 0.5 * tt + py));\n" +
             "orr = 0.4 * ox;\n";
    } else if (pattern === "rumble" || pattern === "quake") {
        s += "var rb = " + (loop ? "1" : "(tt >= 0 && tt < D) ? Math.sin(Math.PI * tt / D) : 0") + ";\n";
        if (pattern === "rumble") {
            s += "ox = rb * 0.4 * Math.sin(" + T + " * f * tt + px);\n" +
                 "oy = rb * (0.7 * Math.sin(" + T + " * f * 1.13 * tt + py) + 0.3 * Math.sin(" + T + " * f * 2.3 * tt + pr));\n" +
                 "orr = rb * 0.3 * Math.sin(" + T + " * f * 0.9 * tt + pr);\n";
        } else {
            s += "ox = rb * (0.7 * Math.sin(" + T + " * 1.3 * tt + px) + 0.3 * Math.sin(" + T + " * f * tt + py));\n" +
                 "oy = rb * (0.5 * Math.sin(" + T + " * 1.1 * tt + py) + 0.5 * Math.sin(" + T + " * f * 1.21 * tt + px));\n" +
                 "orr = rb * Math.sin(" + T + " * 0.9 * tt + pr);\n";
        }
    } else if (pattern === "roll") {
        s += "orr = E * Math.sin(" + T + " * f * tt);\n";
    } else if (pattern === "recoil") {
        s += "ox = 0.12 * E * Math.sin(" + T + " * f * tt + px);\n" +
             "oy = -E;\n" +
             "orr = -0.4 * E;\n";
    } else if (pattern === "heartbeat") {
        s += "var hu = " + (loop ? "(time * f) % 1" : "u") + ";\n" +
             "var hb = (hu >= 0 && hu < 1) ? Math.exp(-Math.pow(hu * 12, 2)) + 0.65 * Math.exp(-Math.pow((hu - 0.28) * 12, 2)) : 0;\n" +
             "oy = 0.6 * hb;\n" +
             "oz = hb;\n";
    } else if (pattern === "drunk") {
        s += "ox = E * (0.6 * Math.sin(" + T + " * 0.31 * f * tt + px) + 0.4 * Math.sin(" + T + " * 0.17 * f * tt));\n" +
             "oy = E * 0.5 * Math.sin(" + T + " * 0.23 * f * tt + py);\n" +
             "orr = E * Math.sin(" + T + " * 0.2 * f * tt + pr);\n";
    } else if (pattern === "step") {
        s += "seedRandom(sd * 97 + Math.floor(fr / 2) + " + S + ", true);\n" +
             "ox = E * random(-1, 1);\n" +
             "oy = E * random(-1, 1);\n" +
             "orr = E * random(-1, 1);\n";
    } else {
        // decay : secousse amortie (comme Impact v0.6)
        s += "ox = E * Math.sin(" + T + " * f * tt + px);\n" +
             "oy = E * Math.sin(" + T + " * f * 1.17 * tt + py);\n" +
             "orr = E * Math.sin(" + T + " * f * 0.8 * tt + pr);\n";
    }
    if (pattern !== "heartbeat") { s += "oz = 0.5 * (ox + oy);\n"; }
    return s;
};

Y.prim.def("shake", {
    label: "Secousse", fx: ["ADBE Tile", "ADBE Geometry2"], cost: 1, hosts: "any adj layer cut clip new", main: "amp",
    params: {
        pattern: ["e", "decay", ["decay", "wiggle", "bursts", "jumps", "rumble", "roll", "recoil", "heartbeat", "quake", "drunk", "step"]],
        axis: ["e", "xy", ["xy", "x", "y", "diag", "rot"]],
        amp: ["n", 24, 0, 400, "k"], rot: ["n", 0, 0, 45, "k"], freq: ["n", 11, 0.05, 40], zoom: ["n", 0, 0, 60, "k"],
        blur: ["n", 180, 0, 360], tile: ["n", 140, 0, 300], seed: ["n", 0, 0, 999]
    },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, ax = V("axis"), loop = I.drive === "loop" || I.drive === "static";
        var tr, A = Y.rx.num(I, s, "amp"), head, R, Z;
        Y.rx.tile(I, V("tile"));
        tr = Y.rx.transform(I, "Shake", V("blur"));
        head = Y.rx.pre(I) + Y.rx.envCode(I, s) + "var f = " + Y.rx.num(I, s, "freq") + ";\n" + Y.pm.unit(V("pattern"), V("seed"), loop);
        if (ax !== "rot") {
            Y.rx.setx(I, tr, Y.shake.TR.pos, head + "var a = " + A + ";\n" +
                (ax === "x" ? "[value[0] + a * ox, value[1]];" : ax === "y" ? "[value[0], value[1] + a * oy];" :
                 ax === "diag" ? "[value[0] + a * ox, value[1] + a * ox];" : "[value[0] + a * ox, value[1] + a * oy];"));
        }
        if (V("rot") > 0 || ax === "rot" || V("pattern") === "roll") {
            R = V("rot") > 0 ? Y.rx.num(I, s, "rot") : "(" + A + " / 10)";
            Y.rx.setx(I, tr, Y.shake.TR.rot, head + "value + " + R + " * orr;");
        }
        if (V("zoom") > 0) {
            Z = Y.rx.num(I, s, "zoom");
            Y.rx.setx(I, tr, Y.shake.TR.scale, head + "value + " + Z + " * oz;");
        }
    }
});

// Twitch : sauts aléatoires image par image, graine commune à tous les canaux (sauts synchronisés).
Y.pm.pick = function (salt) {
    return "var v = 0;\n" +
        "if (EP > 0.001) { seedRandom(sd * 131 + fr * 7 + " + salt + ", true); if (random() < DENS / 100) { v = random(-1, 1); } }\n";
};
Y.prim.def("twitch", {
    label: "Densite", fx: ["ADBE Tile", "ADBE Geometry2", "ADBE Exposure2", "ADBE Box Blur2", "ADBE CHANNEL MIXER"], cost: 1,
    hosts: "any adj layer cut clip", main: "density",
    params: {
        channels: ["l", ["scale"], ["scale", "slide", "slidey", "rot", "skew", "light", "blur", "rgb"]],
        density: ["n", 55, 0, 100], scale: ["n", 14, 0, 100, "k"], slide: ["n", 40, 0, 400, "k"], rot: ["n", 6, 0, 90, "k"],
        skew: ["n", 12, 0, 60, "k"], light: ["n", 1.4, 0, 5, "k"], blur: ["n", 14, 0, 100, "k"], rgb: ["n", 10, 0, 80, "k"]
    },
    install: function (I, s) {
        var ch = Y.rx.val(I, s, "channels"), has = function (x) { return Y.u.has(ch, x); }, tr = null, head, ex, bb, src, J;
        head = Y.rx.pre(I) + Y.rx.envCode(I, s) + "var DENS = " + Y.rx.num(I, s, "density") + ";\n";
        if (has("scale") || has("slide") || has("slidey") || has("rot") || has("skew")) {
            Y.rx.tile(I, 150);
            tr = Y.rx.transform(I, "Twitch", 180);
        }
        if (has("scale")) {
            Y.rx.setx(I, tr, Y.shake.TR.scale, head + Y.pm.pick(1) + "value + " + Y.rx.num(I, s, "scale") + " * v * EP;");
            Y.rx.setx(I, tr, Y.shake.TR.anchor, head + Y.pm.pick(1) +
                "seedRandom(sd * 17 + fr, true);\n(v != 0) ? [value[0] + random(-0.2, 0.2) * thisComp.width, value[1] + random(-0.2, 0.2) * thisComp.height] : value;");
        }
        if (has("slide") || has("slidey")) {
            Y.rx.setx(I, tr, Y.shake.TR.pos, head + Y.pm.pick(2) + "var w = v;\n" + Y.pm.pick(5) +
                "[value[0] + " + (has("slide") ? Y.rx.num(I, s, "slide") + " * w * EP" : "0") + ", value[1] + " + (has("slidey") ? Y.rx.num(I, s, "slide") + " * v * EP" : "0") + "];");
        }
        if (has("rot")) { Y.rx.setx(I, tr, Y.shake.TR.rot, head + Y.pm.pick(6) + "value + " + Y.rx.num(I, s, "rot") + " * v * EP;"); }
        if (has("skew")) { Y.rx.setx(I, tr, ["ADBE Geometry2-0005", "Skew"], head + Y.pm.pick(8) + "value + " + Y.rx.num(I, s, "skew") + " * v * EP;"); }
        if (has("light")) {
            ex = Y.rx.add(I, Y.FX.expo, /^exposure$/i, "Exposure");
            Y.rx.setx(I, ex, Y.FX.expoV, head + Y.pm.pick(3) + "value + " + Y.rx.num(I, s, "light") + " * v * EP;");
        }
        if (has("blur")) {
            bb = Y.rx.add(I, Y.FX.boxBlur, /fast box blur/i, "Blur");
            Y.rx.setx(I, bb, Y.FX.boxR, head + Y.pm.pick(4) + Y.rx.num(I, s, "blur") + " * Math.abs(v) * EP;");
        }
        if (has("rgb")) {
            J = Y.rx.child(I, I.L);
            J.src = Y.kit.layerRef(I.M.name);
            Y.pp.ghosts(J, s, "h", Y.rx.pre(J) + Y.rx.envCode(J, s) + "var DENS = " + Y.rx.num(J, s, "density") + ";\n" + Y.pm.pick(2) +
                "var off = " + Y.rx.num(J, s, "rgb") + " * Math.abs(v) * EP;");
        }
    }
});

Y.prim.def("punch", {
    label: "Punch", fx: ["ADBE Tile", "ADBE Geometry2"], cost: 1, hosts: "any adj layer cut clip new", main: "amount",
    params: { channel: ["e", "scale", ["scale", "rot", "posx", "posy"]], amount: ["n", 20, -200, 400, "k"], blur: ["n", 180, 0, 360] },
    install: function (I, s) {
        var ch = Y.rx.val(I, s, "channel"), amt = Y.rx.val(I, s, "amount"), tr, a = Y.rx.amt(I, s, "amount"), head = Y.rx.expr(I, s, "");
        if (ch !== "scale" || (typeof amt === "number" && amt < 0)) { Y.rx.tile(I, 160); }
        tr = Y.rx.transform(I, "Punch", Y.rx.val(I, s, "blur"));
        if (ch === "scale") { Y.rx.setx(I, tr, Y.shake.TR.scale, head + "value + " + a + ";"); }
        else if (ch === "rot") { Y.rx.setx(I, tr, Y.shake.TR.rot, head + "value + " + a + ";"); }
        else if (ch === "posx") { Y.rx.setx(I, tr, Y.shake.TR.pos, head + "[value[0] + " + a + ", value[1]];"); }
        else { Y.rx.setx(I, tr, Y.shake.TR.pos, head + "[value[0], value[1] + " + a + "];"); }
    }
});

// Drift : mouvement lent (push, pull, pan, rotation, dutch). En continu : sur toute la durée du calque.
Y.prim.def("drift", {
    label: "Derive", fx: ["ADBE Tile", "ADBE Geometry2"], cost: 1, hosts: "any adj layer clip new", main: "amount",
    params: { kind: ["e", "push", ["push", "pull", "panx", "pany", "rot", "dutch"]], amount: ["n", 12, -400, 400, "k"] },
    install: function (I, s) {
        var k = Y.rx.val(I, s, "kind"), tr, A = Y.rx.num(I, s, "amount"), st = s, head;
        if (!s.env && I.drive !== "loop" && I.drive !== "static") { st = { p: s.p, env: { shape: "ramp" } }; }
        head = Y.rx.pre(I) + Y.rx.envCode(I, st) +
            (I.drive === "loop" || I.drive === "static" ? "var G = yfxBez(Math.max(0, Math.min(1, (time - LAY.inPoint) / Math.max(fd, LAY.outPoint - LAY.inPoint))), 0.45, 0, 0.55, 1);\n" : "var G = E;\n") +
            "var A = " + A + ";\n";
        if (k !== "push" && k !== "pull") { Y.rx.tile(I, 160); }
        tr = Y.rx.transform(I, "Drift", 90);
        if (k === "push") { Y.rx.setx(I, tr, Y.shake.TR.scale, head + "value + A * G;"); }
        else if (k === "pull") { Y.rx.setx(I, tr, Y.shake.TR.scale, head + "value + A * (1 - G);"); }
        else if (k === "panx") { Y.rx.setx(I, tr, Y.shake.TR.pos, head + "[value[0] + A * (G - 0.5), value[1]];"); }
        else if (k === "pany") { Y.rx.setx(I, tr, Y.shake.TR.pos, head + "[value[0], value[1] + A * (G - 0.5)];"); }
        else if (k === "rot") { Y.rx.setx(I, tr, Y.shake.TR.rot, head + "value + A * G;"); }
        else {
            Y.rx.setx(I, tr, Y.shake.TR.rot, head + "value + A * G;");
            Y.rx.setx(I, tr, Y.shake.TR.scale, head + "value + Math.abs(A) * 0.9 * G;");
        }
    }
});

Y.prim.def("stretch", {
    label: "Etirement", fx: ["ADBE Tile", "ADBE Geometry2"], cost: 1, hosts: "any adj layer cut clip", main: "amount",
    params: { axis: ["e", "x", ["x", "y"]], amount: ["n", 60, -90, 400, "k"], skew: ["n", 0, -60, 60, "k"], blur: ["n", 270, 0, 360] },
    install: function (I, s) {
        var tr, head = Y.rx.expr(I, s, "");
        Y.rx.tile(I, 200);
        tr = Y.rx.transform(I, "Stretch", Y.rx.val(I, s, "blur"));
        Y.rx.set(I, tr, Y.shake.TR.uniform, 0);
        Y.rx.setx(I, tr, Y.rx.val(I, s, "axis") === "x" ? Y.shake.TR.scaleW : Y.shake.TR.scale, head + "value + " + Y.rx.amt(I, s, "amount") + ";");
        if (Y.rx.val(I, s, "skew") !== 0) { Y.rx.setx(I, tr, ["ADBE Geometry2-0005", "Skew"], head + "value + " + Y.rx.amt(I, s, "skew") + ";"); }
    }
});

Y.prim.def("flip", {
    label: "Flip", fx: ["ADBE Geometry2"], cost: 1, hosts: "any adj layer cut clip", main: null,
    params: { axis: ["e", "h", ["h", "v", "rot"]] },
    install: function (I, s) {
        var ax = Y.rx.val(I, s, "axis"), st = s.env ? s : { p: s.p, env: { shape: "hold" } }, tr, head = Y.rx.expr(I, st, "");
        tr = Y.rx.transform(I, "Flip", 0);
        if (ax === "rot") { Y.rx.setx(I, tr, Y.shake.TR.rot, head + "value + ((EP > 0.5) ? 180 : 0);"); return; }
        Y.rx.set(I, tr, Y.shake.TR.uniform, 0);
        Y.rx.setx(I, tr, ax === "h" ? Y.shake.TR.scaleW : Y.shake.TR.scale, head + "(EP > 0.5) ? -value : value;");
    }
});


// ---------------------------------------------------------------- temps
// Time Remapping : chaque preset de vitesse ajoute un « terme » dans l'expression combinée du clip (Y.speed.expr).
// Forme mémorisée dans le réglage <base>_Forme (lu au moment où l'expression est réécrite).
Y.pm.SPEED = ["velocity", "slowmo", "speedup", "freeze", "rewind", "stutter", "boomerang", "steps", "ramp", "reverse"];

Y.pm.speedTerms = function (L) {
    var fx = Y.p.parade(L), i, nm, base, shape, s = "", C = function (k) { return Y.kit.C("", base + "_" + k); };
    for (i = 1; i <= fx.numProperties; i++) {
        nm = fx.property(i).name;
        if (!/_Forme$/.test(nm)) { continue; }
        base = nm.substr(0, nm.length - 6);
        shape = Math.round(Number(fx.property(i).property(1).value));
        s += "  if (cm == \"" + Y.x.esc(base) + "\") {\n" +
             "    var Db = Math.max(1, " + C("Duree") + ") * fd, kk = " + C("Intensite") + " / 100, dt = time - t0;\n" +
             "    var fa = 1 + (" + C("Rapide") + " / 100 - 1) * kk, sl = 1 + (" + C("Lent") + " / 100 - 1) * kk;\n" +
             "    var p1b = " + C("CourbeP1") + ", p2b = " + C("CourbeP2") + ", cb = Math.max(1, " + C("Bloc") + ") * fd, rp = Math.max(1, Math.round(" + C("Repete") + "));\n";
        if (shape === 1) {
            s += "    var tB = Math.min(time, t0 + Db);\n" +
                 "    for (var tf = t0 - Db; tf < tB; tf += fd) {\n" +
                 "      var uu = Math.min(1, Math.abs(tf + fd / 2 - t0) / Db), sp = sl + (fa - sl) * yfxCurve(uu, p1b, p2b);\n" +
                 "      if (uu > 0.85) { sp = sp + (1 - sp) * (uu - 0.85) / 0.15; }\n" +
                 "      src += (sp - 1) * Math.min(fd, tB - tf);\n" +
                 "    }\n";
        } else if (shape === 2) { s += "    if (dt > 0) { src += (sl - 1) * Math.min(dt, Db); }\n"; }
        else if (shape === 3) { s += "    if (dt > 0) { src += (fa - 1) * Math.min(dt, Db); }\n"; }
        else if (shape === 4) { s += "    if (dt > 0) { src -= Math.min(Db, dt); }\n"; }
        else if (shape === 5) { s += "    if (dt > 0) { src += (-fa - 1) * Math.min(Db, dt); }\n"; }
        else if (shape === 6) { s += "    if (dt > 0) { src -= (dt < cb * rp) ? dt - (dt % cb) : cb * (rp - 1); }\n"; }
        else if (shape === 7) { s += "    if (dt > Db / 2) { src -= (dt < Db) ? 2 * (dt - Db / 2) : Db; }\n"; }
        else if (shape === 8) { s += "    if (dt > 0 && dt < Db) { src -= dt % cb; }\n"; }
        else if (shape === 9) {
            s += "    var tA = t0 - Db, tC = Math.min(time, t0);\n" +
                 "    for (var tg = tA; tg < tC; tg += fd) {\n" +
                 "      var sq = sl + (1 - sl) * yfxCurve((tg + fd / 2 - tA) / Db, p1b, p2b);\n" +
                 "      src += (sq - 1) * Math.min(fd, tC - tg);\n" +
                 "    }\n";
        } else { s += "    if (dt > 0) { src += -2 * Math.min(dt, Db); }\n"; }
        s += "  }\n";
    }
    return s;
};

Y.prim.def("timeRemap", {
    label: "Vitesse", fx: [], cost: 2, hosts: "clip", main: null,
    params: {
        shape: ["e", "velocity", Y.pm.SPEED], fast: ["n", 220, 100, 1000], slow: ["n", 25, 1, 100],
        repeat: ["n", 3, 1, 12], chunk: ["n", 4, 1, 30], pixel: ["b", true]
    },
    install: function (I, s) {
        var L = I.L, V = function (k) { return Y.rx.val(I, s, k); };
        if (!L.canSetTimeRemapEnabled) { Y.fail("Sélectionne le clip (footage ou précomp) : ce preset utilise le Time Remapping."); }
        if (!Y.p.findEffect(L, I.base + "_Forme")) {
            Y.ctl.add(L, "slider", I.base + "_Forme", Y.u.idx(Y.pm.SPEED, V("shape")) + 1);
            Y.ctl.add(L, "slider", I.base + "_Rapide", V("fast"));
            Y.ctl.add(L, "slider", I.base + "_Lent", V("slow"));
            Y.ctl.add(L, "slider", I.base + "_Repete", V("repeat"));
            Y.ctl.add(L, "slider", I.base + "_Bloc", V("chunk"));
        }
        if (!L.timeRemapEnabled) { L.timeRemapEnabled = true; }
        if (V("pixel")) {
            try { L.frameBlendingType = FrameBlendingType.PIXEL_MOTION; I.comp.frameBlending = true; } catch (e) {}
        }
        Y.x.set(L.property("ADBE Time Remapping"), Y.speed.expr(L));
    }
});

Y.prim.def("posterizeTime", {
    label: "Cadence", fx: ["ADBE Posterize Time"], cost: 1, hosts: "any adj layer cut clip", main: "fps",
    params: { fps: ["n", 12, 1, 60] },
    install: function (I, s) {
        var pt = Y.rx.add(I, Y.FX.post, /posterize time/i, "Posterize");
        Y.rx.setx(I, pt, Y.FX.postRate, I.drive === "loop" || I.drive === "static" ? Y.rx.expr(I, s, Y.rx.num(I, s, "fps") + ";") :
            Y.rx.expr(I, s, "(EP > 0.001) ? " + Y.rx.num(I, s, "fps") + " : 1 / fd;"));
    }
});

Y.prim.def("echo", {
    label: "Echos", fx: ["ADBE Echo"], cost: 4, hosts: "any adj layer clip", main: "count",
    params: {
        time: ["n", -2, -30, 30], count: ["n", 6, 1, 30], decay: ["n", 0.7, 0, 1],
        mode: ["e", "add", ["add", "max", "min", "screen", "behind", "front", "blend"]]
    },
    install: function (I, s) {
        var ec = Y.rx.add(I, ["ADBE Echo"], /^echo$/i, "Echo"), modes = ["add", "max", "min", "screen", "behind", "front", "blend"];
        Y.rx.set(I, ec, ["ADBE Echo-0001", "Echo Time (seconds)"], Y.rx.val(I, s, "time") / I.c.fps);
        Y.rx.set(I, ec, ["ADBE Echo-0004", "Decay"], Y.rx.val(I, s, "decay"));
        Y.rx.set(I, ec, ["ADBE Echo-0005", "Echo Operator"], Y.u.idx(modes, Y.rx.val(I, s, "mode")) + 1);
        Y.rx.setx(I, ec, ["ADBE Echo-0002", "Number Of Echoes"], Y.rx.expr(I, s, "Math.round(" + Y.rx.num(I, s, "count") + " * EP);"));
    }
});


// ---------------------------------------------------------------- flou
Y.prim.def("dirBlur", {
    label: "Flou", fx: ["ADBE Motion Blur"], cost: 2, hosts: "any adj layer cut clip", main: "length",
    params: { angle: ["n", 90, -360, 360], length: ["n", 60, 0, 600, "k"] },
    install: function (I, s) {
        var db = Y.rx.add(I, Y.FX.dirBlur, /directional blur/i, "DirBlur");
        Y.rx.set(I, db, Y.FX.dirAngle, Y.rx.val(I, s, "angle"));
        Y.rx.setx(I, db, Y.FX.dirLen, Y.rx.expr(I, s, "Math.max(0, " + Y.rx.amt(I, s, "length", true) + ");"));
    }
});

Y.prim.def("radialBlur", {
    label: "Flou", fx: ["CC Radial Fast Blur", "ADBE Radial Blur"], cost: 2, hosts: "any adj layer cut clip", main: "amount",
    params: { type: ["e", "zoom", ["zoom", "spin"]], amount: ["n", 40, 0, 100, "k"] },
    install: function (I, s) {
        var rb, body = "Math.max(0, Math.min(100, " + Y.rx.amt(I, s, "amount", true) + "));";
        if (Y.rx.val(I, s, "type") === "spin") {
            rb = Y.rx.add(I, Y.FX.spin, /^radial blur$/i, "Spin");
            Y.rx.set(I, rb, Y.FX.spinType, 1);
            Y.rx.setx(I, rb, Y.FX.spinAmt, Y.rx.expr(I, s, body));
        } else {
            rb = Y.rx.add(I, Y.FX.radial, /radial (fast )?blur/i, "Zoom");
            Y.rx.setx(I, rb, ["CC Radial Fast Blur-0002", "Amount"], Y.rx.expr(I, s, body));
        }
    }
});

Y.prim.def("blur", {
    label: "Flou", fx: ["ADBE Box Blur2", "ADBE Gaussian Blur 2"], cost: 2, hosts: "any adj layer cut clip new", main: "radius",
    params: { kind: ["e", "gauss", ["box", "gauss"]], radius: ["n", 12, 0, 300, "k"], dims: ["e", "both", ["both", "h", "v"]] },
    install: function (I, s) {
        var d = Y.u.idx(["both", "h", "v"], Y.rx.val(I, s, "dims")) + 1, b, body = "Math.max(0, " + Y.rx.amt(I, s, "radius", true) + ");";
        if (Y.rx.val(I, s, "kind") === "box") {
            b = Y.rx.add(I, Y.FX.boxBlur, /fast box blur/i, "Blur");
            Y.rx.set(I, b, ["ADBE Box Blur2-0003", "Blur Dimensions"], d);
            Y.rx.setx(I, b, Y.FX.boxR, Y.rx.expr(I, s, body));
        } else {
            b = Y.rx.add(I, ["ADBE Gaussian Blur 2"], /gaussian blur/i, "Gauss");
            Y.rx.set(I, b, ["ADBE Gaussian Blur 2-0002", "Blur Dimensions"], d);
            try { Y.rx.set(I, b, ["ADBE Gaussian Blur 2-0003", "Repeat Edge Pixels"], 1); } catch (e) {}
            Y.rx.setx(I, b, ["ADBE Gaussian Blur 2-0001", "Blurriness"], Y.rx.expr(I, s, body));
        }
    }
});
