// =====================================================================
// PRIMITIVES : calques créés (HUD, texte, particules), caméra 3D, parallaxe, transitions à 2 calques.
// =====================================================================
Y.pc = {};

// ---------------------------------------------------------------- formes
// Groupe rectangle / ellipse dans un calque de forme. o = { fill, stroke, sw, round, rot, op }. Renvoie l'index du groupe.
Y.pc.shape = function (L, kind, size, pos, o) {
    var root = L.property("ADBE Root Vectors Group"), gi, vg, mn = kind === "ellipse" ? "ADBE Vector Shape - Ellipse" : "ADBE Vector Shape - Rect", sh, tg;
    o = o || {};
    gi = root.addProperty("ADBE Vector Group").propertyIndex;
    vg = function () { return L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group"); };
    vg().addProperty(mn);
    if (o["fill"]) { vg().addProperty("ADBE Vector Graphic - Fill"); }
    if (o.stroke) { vg().addProperty("ADBE Vector Graphic - Stroke"); }
    sh = vg().property(mn);
    if (kind === "ellipse") {
        sh.property("ADBE Vector Ellipse Size").setValue(size);
        sh.property("ADBE Vector Ellipse Position").setValue(pos);
    } else {
        sh.property("ADBE Vector Rect Size").setValue(size);
        sh.property("ADBE Vector Rect Position").setValue(pos);
        if (o.round) { sh.property("ADBE Vector Rect Roundness").setValue(o.round); }
    }
    if (o["fill"]) { vg().property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(Y.rx.rgba(o["fill"])); }
    if (o.stroke) {
        vg().property("ADBE Vector Graphic - Stroke").property("ADBE Vector Stroke Color").setValue(Y.rx.rgba(o.stroke));
        vg().property("ADBE Vector Graphic - Stroke").property("ADBE Vector Stroke Width").setValue(o.sw || 4);
    }
    tg = L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vector Transform Group");
    if (o.rot) { tg.property("ADBE Vector Rotation").setValue(o.rot); }
    if (o.op !== undefined) { tg.property("ADBE Vector Group Opacity").setValue(o.op); }
    return gi;
};
Y.pc.rectProp = function (L, gi, key) {
    return L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group").property("ADBE Vector Shape - Rect").property(key);
};

// Calque texte stylé (utilisé par textLayer et les HUD). o = { size (px), fill, fonts, caps, just: "center|left|right" }
Y.pc.text = function (comp, word, o) {
    var T = comp.layers.addText(word), tp = T.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value, font = null;
    o = o || {};
    if (o.fonts && o.fonts.length) { font = Y.style.font(o.fonts); }
    td.fontSize = o.size || 80;
    td.applyFill = true;
    td.fillColor = Y.rx.rgb(o["fill"] || "#ffffff");
    td.justification = o.just === "left" ? ParagraphJustification.LEFT_JUSTIFY : o.just === "right" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY;
    if (font) { try { td.font = font; } catch (e) {} }
    try { if (o.caps) { td.allCaps = true; } } catch (e2) {}
    tp.setValue(td);
    return T;
};

Y.pc.FONTS = [["Tungsten", "Bold"], ["Bebas Neue", "Regular"], ["Anton", "Regular"], ["Oswald", "Bold"], ["Impact", "Regular"], ["Arial", "Bold"]];

// Opacité et échelle d'un calque créé selon le pilotage : marker = visible pendant Durée après chaque déclenchement,
// inout = entre et sort avec la courbe, loop = toujours.
Y.pc.animate = function (I, L, pop) {
    var tg = L.property("ADBE Transform Group"), body;
    if (I.drive === "marker") {
        Y.x.set(tg.property("ADBE Opacity"), Y.rx.expr(I, { env: "main" }, "(tt >= 0 && tt < D) ? 100 * Math.min(1, 4 * EP + 0.2) : 0;"));
        if (pop) { Y.x.set(tg.property("ADBE Scale"), Y.rx.expr(I, { env: "main" }, "var g = (tt >= 0 && tt < D) ? 1 + " + Y.rx.f(pop) + " * E : 1;\n[value[0] * g, value[1] * g];")); }
    } else if (I.drive === "inout") {
        body = "100 * Math.max(0, Math.min(1, IO));";
        Y.x.set(tg.property("ADBE Opacity"), Y.rx.expr(I, null, body));
        if (pop) { Y.x.set(tg.property("ADBE Scale"), Y.rx.expr(I, null, "var g = 1 - " + Y.rx.f(pop) + " * (1 - IO);\n[value[0] * g, value[1] * g];")); }
    }
};

Y.pc.HUD = ["hitmarker", "crosshair", "killfeed", "letterbox", "frame", "perforation", "rec", "scoreboard", "playerbar", "lowerthird", "grid", "brackets", "cases"];

Y.prim.def("hud", {
    label: "HUD", fx: [], cost: 1, hosts: "new", main: null, creates: true,
    params: {
        kind: ["e", "hitmarker", Y.pc.HUD], color: ["c", "#ffffff"], accent: ["c", "#ff4655"], size: ["n", 100, 10, 400],
        ratio: ["n", 2.39, 0.5, 4], text: ["t", ""], text2: ["t", ""]
    },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, k = V("kind"), comp = I.comp, w = comp.width, h = comp.height, cx = w / 2, cy = h / 2;
        var L = comp.layers.addShape(), sz = V("size") / 100, col = V("color"), acc = V("accent"), i, gi, T, T2, bh, span = I.drive === "inout" ? "cti" : "comp", g, n;
        // instance propre à chaque calque : les expressions lisent les réglages et markers du calque maître
        var X = function (lay) { return lay === I.M ? I : Y.rx.child(I, lay); };
        Y.rx.place(I, L, "HUD", span);
        L.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
        if (k === "hitmarker") {
            for (i = 0; i < 4; i++) {
                Y.pc.shape(L, "rect", [7 * sz, 30 * sz], [cx + (i % 2 ? 1 : -1) * 26 * sz, cy + (i < 2 ? -1 : 1) * 26 * sz], { fill: col, rot: (i === 0 || i === 3) ? -45 : 45 });
            }
            L.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([cx, cy]);
            L.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy]);
            Y.pc.animate(X(L), L, 0.5);
        } else if (k === "crosshair") {
            for (i = 0; i < 4; i++) {
                gi = Y.pc.shape(L, "rect", i < 2 ? [6 * sz, 26 * sz] : [26 * sz, 6 * sz], [cx, cy], { fill: col });
                Y.x.set(Y.pc.rectProp(L, gi, "ADBE Vector Rect Position"), Y.rx.expr(X(L), { env: "main" },
                    "var G = " + Y.rx.f(12 * sz) + " + " + Y.rx.f(30 * sz) + " * EP + " + Y.rx.f(13 * sz) + ";\n" +
                    ["[" + cx + ", " + cy + " - G]", "[" + cx + ", " + cy + " + G]", "[" + cx + " - G, " + cy + "]", "[" + cx + " + G, " + cy + "]"][i] + ";"));
            }
            Y.pc.shape(L, "rect", [6 * sz, 6 * sz], [cx, cy], { fill: acc });
        } else if (k === "killfeed") {
            T = Y.pc.text(comp, V("text") || "YEXO  >  ENEMY", { size: Math.round(h * 0.022 * sz), fill: "#ffffff", just: "right" });
            Y.rx.place(I, T, "Texte", span);
            T.property("ADBE Transform Group").property("ADBE Position").setValue([w * 0.92, h * 0.16]);
            T.moveBefore(L);
            g = "thisComp.layer(\"" + Y.x.esc(T.name) + "\")";
            gi = Y.pc.shape(L, "rect", [100, 40], [0, 0], { fill: "#0e0e10", op: 85 });
            Y.x.set(Y.pc.rectProp(L, gi, "ADBE Vector Rect Size"), "var r = " + g + ".sourceRectAtTime(time, false);\n[r.width + 40, r.height + 24];");
            Y.x.set(Y.pc.rectProp(L, gi, "ADBE Vector Rect Position"), "var r = " + g + ".sourceRectAtTime(time, false), p = " + g + ".transform.position;\n[p[0] + r.left + r.width / 2, p[1] + r.top + r.height / 2];");
            gi = Y.pc.shape(L, "rect", [6, 40], [0, 0], { fill: acc });
            Y.x.set(Y.pc.rectProp(L, gi, "ADBE Vector Rect Size"), "var r = " + g + ".sourceRectAtTime(time, false);\n[6, r.height + 24];");
            Y.x.set(Y.pc.rectProp(L, gi, "ADBE Vector Rect Position"), "var r = " + g + ".sourceRectAtTime(time, false), p = " + g + ".transform.position;\n[p[0] + r.left + r.width + 23, p[1] + r.top + r.height / 2];");
            if (I.drive === "inout") {
                Y.x.set(T.property("ADBE Transform Group").property("ADBE Position"), Y.rx.expr(X(T), null, "[value[0] + " + Y.rx.f(w * 0.5) + " * (1 - IO), value[1]];"));
            }
        } else if (k === "letterbox") {
            bh = V("ratio") >= w / h ? Math.max(0, (h - w / V("ratio")) / 2) : 0;
            n = bh > 0 ? [[w + 4, bh, cx, bh / 2], [w + 4, bh, cx, h - bh / 2]] : [[(w - h * V("ratio")) / 2, h + 4, (w - h * V("ratio")) / 4, cy], [(w - h * V("ratio")) / 2, h + 4, w - (w - h * V("ratio")) / 4, cy]];
            for (i = 0; i < 2; i++) {
                gi = Y.pc.shape(L, "rect", [n[i][0], n[i][1]], [n[i][2], n[i][3]], { fill: "#000000" });
                if (I.drive === "inout" && bh > 0) {
                    Y.x.set(Y.pc.rectProp(L, gi, "ADBE Vector Rect Position"), Y.rx.expr(X(L), null, "[value[0], value[1] + " + (i ? 1 : -1) + " * " + Y.rx.f(bh) + " * (1 - IO)];"));
                }
            }
        } else if (k === "frame" || k === "cases") {
            Y.pc.shape(L, "rect", [w - 60 * sz, h - 60 * sz], [cx, cy], { stroke: k === "cases" ? "#000000" : col, sw: k === "cases" ? 26 * sz : 4 * sz, round: k === "cases" ? 0 : 18 * sz });
            if (k === "cases") { Y.pc.shape(L, "rect", [w - 104 * sz, h - 104 * sz], [cx, cy], { stroke: "#ffffff", sw: 6 * sz }); }
            Y.pc.animate(X(L), L, 0);
        } else if (k === "perforation") {
            for (i = 0; i < 2; i++) { Y.pc.shape(L, "rect", [w * 0.07, h + 4], [i ? w - w * 0.035 : w * 0.035, cy], { fill: "#0a0a0a" }); }
            n = 14;
            for (i = 0; i < n * 2; i++) {
                Y.pc.shape(L, "rect", [w * 0.03, h / n * 0.45], [(i < n) ? w * 0.035 : w - w * 0.035, (i % n + 0.5) * h / n], { fill: "#d9d2c3", round: 4 });
            }
            Y.x.set(L.property("ADBE Transform Group").property("ADBE Position"), "[value[0], value[1] + (time * 300) % " + Y.rx.f(h / n) + "];");
        } else if (k === "rec") {
            for (i = 0; i < 4; i++) {
                g = [i % 2 ? w - 70 * sz : 70 * sz, i < 2 ? 110 * sz : h - 110 * sz];
                Y.pc.shape(L, "rect", [70 * sz, 6 * sz], [g[0] + (i % 2 ? -32 : 32) * sz, g[1]], { fill: col });
                Y.pc.shape(L, "rect", [6 * sz, 70 * sz], [g[0], g[1] + (i < 2 ? 32 : -32) * sz], { fill: col });
            }
            gi = Y.pc.shape(L, "ellipse", [26 * sz, 26 * sz], [130 * sz, 190 * sz], { fill: acc });
            Y.x.set(L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vector Transform Group").property("ADBE Vector Group Opacity"), "(Math.floor(time * 2) % 2 == 0) ? 100 : 0;");
            T = Y.pc.text(comp, V("text") || "REC", { size: Math.round(44 * sz), fill: col, just: "left", fonts: [["Courier New", "Bold"], ["Consolas", "Bold"]] });
            Y.rx.place(I, T, "Rec", span);
            T.property("ADBE Transform Group").property("ADBE Position").setValue([160 * sz, 206 * sz]);
            T2 = Y.pc.text(comp, "00:00:00", { size: Math.round(40 * sz), fill: col, just: "right", fonts: [["Courier New", "Bold"], ["Consolas", "Bold"]] });
            Y.rx.place(I, T2, "Horloge", span);
            T2.property("ADBE Transform Group").property("ADBE Position").setValue([w - 110 * sz, h - 170 * sz]);
            Y.x.set(T2.property("ADBE Text Properties").property("ADBE Text Document"),
                "var e = Math.floor(time), hh = Math.floor(e / 3600), mn = Math.floor(e / 60) % 60, ss = e % 60;\nfunction z(n) { return (n < 10 ? \"0\" : \"\") + n; }\nz(hh) + \":\" + z(mn) + \":\" + z(ss);");
        } else if (k === "scoreboard") {
            Y.pc.shape(L, "rect", [w * 0.46 * sz, 74 * sz], [cx, 96 * sz], { fill: "#0b1a2e", round: 8 * sz, op: 92 });
            Y.pc.shape(L, "rect", [w * 0.1 * sz, 74 * sz], [cx - w * 0.18 * sz, 96 * sz], { fill: acc, round: 8 * sz });
            Y.pc.shape(L, "rect", [w * 0.1 * sz, 74 * sz], [cx + w * 0.18 * sz, 96 * sz], { fill: col === "#ffffff" ? "#00c2b2" : col, round: 8 * sz });
            T = Y.pc.text(comp, V("text") || "13   -   11", { size: Math.round(48 * sz), fill: "#ffffff", fonts: Y.pc.FONTS });
            Y.rx.place(I, T, "Score", span);
            T.property("ADBE Transform Group").property("ADBE Position").setValue([cx, 113 * sz]);
            Y.pc.animate(X(L), L, 0);
        } else if (k === "playerbar" || k === "lowerthird") {
            g = k === "playerbar" ? [w * 0.36 * sz, h - 150 * sz] : [w * 0.42 * sz, h * 0.78];
            Y.pc.shape(L, "rect", [w * 0.6 * sz, 96 * sz], [g[0], g[1]], { fill: "#0b0b0d", round: 6 * sz, op: 90 });
            Y.pc.shape(L, "rect", [10 * sz, 96 * sz], [g[0] - w * 0.3 * sz + 5 * sz, g[1]], { fill: acc });
            if (k === "playerbar") {
                gi = Y.pc.shape(L, "rect", [w * 0.5 * sz, 10 * sz], [g[0] + 10 * sz, g[1] + 30 * sz], { fill: "#3fcf8e" });
                Y.x.set(Y.pc.rectProp(L, gi, "ADBE Vector Rect Size"), "[value[0] * (0.35 + 0.65 * (Math.cos(time * 0.7) * 0.5 + 0.5)), value[1]];");
            }
            T = Y.pc.text(comp, V("text") || (k === "playerbar" ? "YEXO" : "YEXO FPS"), { size: Math.round(40 * sz), fill: "#ffffff", just: "left", fonts: Y.pc.FONTS, caps: true });
            Y.rx.place(I, T, "Nom", span);
            T.property("ADBE Transform Group").property("ADBE Position").setValue([g[0] - w * 0.27 * sz, g[1] + (k === "playerbar" ? 4 : -6) * sz]);
            if (k === "lowerthird") {
                T2 = Y.pc.text(comp, V("text2") || "VALORANT · ACE", { size: Math.round(24 * sz), fill: "#b8b5af", just: "left" });
                Y.rx.place(I, T2, "Sous", span);
                T2.property("ADBE Transform Group").property("ADBE Position").setValue([g[0] - w * 0.27 * sz, g[1] + 30 * sz]);
            }
            if (I.drive === "inout") {
                Y.x.set(L.property("ADBE Transform Group").property("ADBE Position"), Y.rx.expr(X(L), null, "[value[0] - " + Y.rx.f(w * 0.8) + " * (1 - IO), value[1]];"));
                T.parent = L;
                if (T2) { T2.parent = L; }
            }
        } else if (k === "grid") {
            n = 6;
            for (i = 1; i < n; i++) { Y.pc.shape(L, "rect", [2, h + 4], [w * i / n, cy], { fill: col, op: 22 }); }
            for (i = 1; i < 10; i++) { Y.pc.shape(L, "rect", [w + 4, 2], [cx, h * i / 10], { fill: col, op: 22 }); }
            Y.pc.animate(X(L), L, 0);
        } else {
            // brackets : crochets de visée aux 4 coins
            for (i = 0; i < 4; i++) {
                g = [i % 2 ? w - 90 * sz : 90 * sz, i < 2 ? 220 * sz : h - 220 * sz];
                Y.pc.shape(L, "rect", [80 * sz, 8 * sz], [g[0] + (i % 2 ? -36 : 36) * sz, g[1]], { fill: col });
                Y.pc.shape(L, "rect", [8 * sz, 80 * sz], [g[0], g[1] + (i < 2 ? 36 : -36) * sz], { fill: col });
            }
            L.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([cx, cy]);
            L.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy]);
            Y.pc.animate(X(L), L, -0.08);
        }
    }
});

// Calque texte : mot de kill (ACE, 1v5, CLUTCH), onomatopée, titre. Les étapes suivantes l'animent.
Y.prim.def("textLayer", {
    label: "Texte", fx: [], cost: 1, hosts: "new", main: null, creates: true,
    params: {
        word: ["t", "ACE"], size: ["n", 14, 2, 60], pos: ["e", "center", ["center", "upper", "lower", "top", "bottom"]],
        fill: ["c", "#ffffff"], fonts: ["a", []], caps: ["b", true], rot: ["n", 0, -45, 45]
    },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, comp = I.comp, f = V("fonts"), T, y;
        T = Y.pc.text(comp, String(V("word")), { size: Math.round(comp.height * V("size") / 100), fill: V("fill"), fonts: f.length ? f : Y.pc.FONTS, caps: V("caps") });
        Y.rx.place(I, T, "Texte", I.drive === "inout" ? "cti" : "comp");
        y = { center: 0.5, upper: 0.36, lower: 0.66, top: 0.18, bottom: 0.84 }[V("pos")];
        T.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height * y]);
        if (V("rot")) { T.property("ADBE Transform Group").property("ADBE Rotate Z").setValue(V("rot")); }
        if (I.drive === "marker") { Y.pc.animate(T === I.M ? I : Y.rx.child(I, T), T, 0); }
    }
});

// Particules (lourd) : étoiles (CC Star Burst) ou CC Particle World (poussière, étincelles, braises, neige).
Y.prim.def("particles", {
    label: "Particules", fx: ["CC Particle World", "CC Star Burst"], cost: 4, hosts: "new any adj", main: "amount", creates: true,
    params: { kind: ["e", "dust", ["dust", "sparks", "stars", "snow", "embers"]], amount: ["n", 60, 0, 400, "k"], color: ["c", "#ffffff"] },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, k = V("kind"), L, pw, J, soft, cfg;
        L = Y.l.addSolid(I.comp, I.base, [0, 0, 0], "sib_000000", {});
        L.blendingMode = BlendingMode.SCREEN;
        if (I.L) { Y.rx.place(I, L, "Particules"); J = Y.rx.child(I, L); } else { Y.rx.place(I, L, "Particules", I.drive === "inout" ? "cti" : "comp"); J = I; }
        soft = function (keys, v) { try { Y.rx.set(J, pw, keys, v); } catch (e) { Y.log("WARN", I.def.name + " : " + keys.join("/") + " ignoré (" + Y.errText(e) + ")"); } };
        if (k === "stars") {
            pw = Y.rx.add(J, ["CC Star Burst"], /star burst/i, "Etoiles");
            soft(["CC Star Burst-0002", "Speed"], 0.4);
            soft(["CC Star Burst-0004", "Grid Spacing"], 40);
            Y.rx.setx(J, pw, ["CC Star Burst-0005", "Size"], Y.rx.expr(J, s, "Math.max(0, " + Y.rx.amt(J, s, "amount", true) + " * 0.5);"));
            return;
        }
        cfg = { dust: [0.6, 3, 0, 0.05, 1.2], sparks: [3, 0.8, 0.6, 1.4, 0.1], snow: [1.5, 4, 0.06, 0.05, 1.5], embers: [1, 2.5, -0.12, 0.3, 0.6] }[k];
        pw = Y.rx.add(J, ["CC Particle World"], /particle world/i, "Particules");
        Y.rx.setx(J, pw, ["CC Particle World-0001", "Birth Rate"], Y.rx.expr(J, s, Y.rx.f(cfg[0]) + " * Math.max(0, " + Y.rx.amt(J, s, "amount", true) + ") / 60;"));
        soft(["CC Particle World-0002", "Longevity (sec)"], cfg[1]);
        soft(["Gravity"], cfg[2]);
        soft(["Velocity"], cfg[3]);
        soft(["Radius X"], cfg[4]);
        soft(["Radius Y"], cfg[4]);
        soft(["Birth Color"], Y.rx.rgba(V("color")));
        soft(["Death Color"], Y.rx.rgba(V("color")));
    }
});

// ---------------------------------------------------------------- caméra 3D
// Caméra YFX + null de contrôle (les réglages vont sur le null : une caméra n'a pas d'effets).
// Les calques visuels sélectionnés passent en 3D. Pour la parallaxe, il faut des calques à des profondeurs différentes.
Y.pc.MOVES = ["push", "pull", "orbit", "tilt", "pan", "roll", "crane", "dollyzoom", "shake3d"];
Y.prim.def("camera", {
    label: "Camera", fx: [], cost: 2, hosts: "new", main: "amount", creates: true,
    params: { move: ["e", "push", Y.pc.MOVES], amount: ["n", 30, -400, 400, "k"], make3d: ["b", true] },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, comp = I.comp, cx = comp.width / 2, cy = comp.height / 2, N, cam, J, z0, mv = V("move"), st = s, i, tg, head, A;
        N = comp.layers.addNull(comp.duration);
        Y.rx.place(I, N, "Ctrl", I.drive === "inout" ? "cti" : "comp");
        if (V("make3d")) {
            tg = Y.kit.split(I.c.layers).targets;
            for (i = 0; i < tg.length; i++) { try { tg[i].threeDLayer = true; } catch (e) {} }
        }
        cam = comp.layers.addCamera(Y.kit.freeName(comp, I.base + "_Cam"), [cx, cy]);
        cam.inPoint = N.inPoint;
        cam.outPoint = N.outPoint;
        cam.comment = "YexoFX";
        I.made.push(cam.name);
        z0 = Number(cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom").value);
        J = Y.rx.child(I, cam);
        if (!s.env && I.drive === "marker" && mv !== "shake3d") { st = { p: s.p, env: { shape: "ramp" } }; }
        A = Y.rx.num(J, st, "amount");
        head = Y.rx.pre(J) + Y.rx.envCode(J, st) +
            (I.drive === "loop" || I.drive === "static" ? "var G = yfxBez(Math.max(0, Math.min(1, (time - LAY.inPoint) / Math.max(fd, LAY.outPoint - LAY.inPoint))), 0.45, 0, 0.55, 1);\n" : "var G = E;\n") +
            "var A = " + A + ", Z0 = " + Y.rx.f(z0) + ";\n";
        tg = function (mn) { return cam.property("ADBE Transform Group").property(mn); };
        if (mv === "push" || mv === "pull") {
            Y.x.set(tg("ADBE Position"), head + "[value[0], value[1], value[2] + " + (mv === "push" ? "" : "-") + "Z0 * A / 100 * G];");
        } else if (mv === "orbit") {
            Y.x.set(tg("ADBE Position"), head + "var th = A * G * Math.PI / 180;\n[" + cx + " + Z0 * Math.sin(th), value[1], -Z0 * Math.cos(th)];");
        } else if (mv === "tilt" || mv === "pan") {
            Y.x.set(tg("ADBE Anchor Point"), head + "var o = Z0 * Math.tan(A * G * Math.PI / 180);\n" + (mv === "tilt" ? "[value[0], value[1] - o, value[2]];" : "[value[0] + o, value[1], value[2]];"));
        } else if (mv === "roll") {
            Y.x.set(tg("ADBE Rotate Z"), head + "value + A * G;");
        } else if (mv === "crane") {
            Y.x.set(tg("ADBE Position"), head + "[value[0], value[1] - A / 100 * thisComp.height * G, value[2]];");
            Y.x.set(tg("ADBE Anchor Point"), head + "[value[0], value[1] - A / 100 * thisComp.height * G * 0.6, value[2]];");
        } else if (mv === "dollyzoom") {
            Y.x.set(tg("ADBE Position"), head + "[value[0], value[1], value[2] + Z0 * A / 100 * G];");
            Y.x.set(cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom"), head + "value * (Z0 - Z0 * A / 100 * G) / Z0;");
        } else {
            Y.x.set(tg("ADBE Position"), head + "seedRandom(sd, true);\nvar q = random(0, 6.28);\n[value[0] + A * E * Math.sin(17 * tt + q), value[1] + A * E * Math.sin(21 * tt + q * 2), value[2] + A * 2 * E * Math.sin(13 * tt)];");
            Y.x.set(tg("ADBE Rotate Z"), head + "value + A * 0.05 * E * Math.sin(19 * tt);");
        }
    }
});

// Parallaxe : calques sélectionnés répartis en profondeur (le premier en avant), ou faux relief sur un clip 2D.
Y.prim.def("parallax", {
    label: "Profondeur", fx: ["ADBE Displacement Map", "CC Cylinder", "CC Sphere"], cost: 2, hosts: "any layer new", main: null,
    params: { kind: ["e", "layers", ["layers", "depth", "cylinder", "sphere"]], depth: ["n", 400, 0, 6000, "k"], speed: ["n", 0.5, 0, 6] },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, k = V("kind"), tg = Y.kit.split(I.c.layers).targets, i, L, n, z, Z0, sc, d = V("depth") * I.c.intensity, fx, T, sp = Y.rx.f(V("speed") * 2 * Math.PI);
        if (k === "layers") {
            n = tg.length;
            if (n < 2) { Y.fail("La parallaxe demande au moins 2 calques sélectionnés (premier plan, arrière-plan…)."); }
            Z0 = I.comp.width * 50 / 36;
            for (i = 0; i < n; i++) {
                L = tg[i];
                if (L.locked) { Y.fail(Y.MSG.locked(L)); }
                L.threeDLayer = true;
                z = -d / 2 + d * i / (n - 1);
                T = L.property("ADBE Transform Group");
                T.property("ADBE Position").setValue([T.property("ADBE Position").value[0], T.property("ADBE Position").value[1], z]);
                sc = T.property("ADBE Scale").value;
                T.property("ADBE Scale").setValue([sc[0] * (Z0 + z) / Z0, sc[1] * (Z0 + z) / Z0, 100]);
            }
            return;
        }
        L = I.L;
        if (!L || L.adjustmentLayer) { Y.fail("Sélectionne ton clip : le relief se calcule sur l'image elle-même, pas sur un calque d'ajustement."); }
        if (k === "depth") {
            fx = Y.rx.add(I, ["ADBE Displacement Map"], /displacement map/i, "Relief");
            Y.rx.set(I, fx, ["ADBE Displacement Map-0001", "Displacement Map Layer"], L.index);
            Y.rx.set(I, fx, ["ADBE Displacement Map-0002", "Use For Horizontal Displacement"], 5);
            Y.rx.set(I, fx, ["ADBE Displacement Map-0004", "Use For Vertical Displacement"], 5);
            Y.rx.setx(I, fx, ["ADBE Displacement Map-0003", "Max Horizontal Displacement"], Y.rx.f(d / 40) + " * Math.sin(time * " + sp + ");");
            Y.rx.setx(I, fx, ["ADBE Displacement Map-0005", "Max Vertical Displacement"], Y.rx.f(d / 80) + " * Math.cos(time * " + sp + ");");
            return;
        }
        fx = Y.rx.add(I, k === "sphere" ? ["CC Sphere"] : ["CC Cylinder"], k === "sphere" ? /cc sphere/i : /cc cylinder/i, k === "sphere" ? "Sphere" : "Cylindre");
        Y.rx.setx(I, fx, ["Rotation Y"], Y.rx.f(d / 20) + " * Math.sin(time * " + sp + ");");
    }
});

// ---------------------------------------------------------------- transitions à 2 calques
// Volet : le plan entrant B se révèle par-dessus A pendant Durée avant la coupe. Il faut que B ait des images
// avant sa coupe (B est rallongé vers la gauche) ; sinon, message clair.
Y.pc.WIPES = ["linear", "radial", "clock", "iris", "venetian", "block", "luma", "grid"];
Y.pc.handlesBefore = function (L, t) {
    var src = L.source;
    if (!src || (src.mainSource && src.mainSource.isStill) || L.timeRemapEnabled) { return true; }
    return t >= L.startTime - 0.0001;
};
Y.prim.def("wipe", {
    label: "Volet", fx: ["ADBE Linear Wipe", "ADBE Radial Wipe", "ADBE Venetian Blinds", "ADBE Block Dissolve", "ADBE Gradient Wipe", "CC Grid Wipe"], cost: 1,
    hosts: "two", main: null,
    params: { kind: ["e", "linear", Y.pc.WIPES], angle: ["n", 90, 0, 360], feather: ["n", 40, 0, 600] },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, k = V("kind"), A = I.A, B = I.B, D = I.c.dur, t0 = I.cut - D, fx, comp, prog, mi, sh, r, cx, cy;
        if (!A || !B) { Y.fail("Sélectionne 2 calques : le plan sortant puis le plan entrant."); }
        if (!Y.pc.handlesBefore(B, t0)) {
            Y.fail("Le plan entrant « " + B.name + " » n'a pas " + I.c.frames + " images avant sa coupe. Rallonge-le vers la gauche, ou choisis une transition sur calque d'ajustement.");
        }
        B.inPoint = Math.max(0, t0);
        if (B.index > A.index) { B.moveBefore(A); }
        prog = "var w = nk ? Math.max(0, Math.min(1, (tn + D) / D)) : 1;\nvar g = Math.max(0, Math.min(1, yfxCurve(w, c1, c2)));\n";
        if (k === "iris") {
            comp = I.comp;
            cx = (B.width || comp.width) / 2;
            cy = (B.height || comp.height) / 2;
            r = 2;
            sh = new Shape();
            sh.vertices = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
            sh.inTangents = [[-r * 0.55, 0], [0, -r * 0.55], [r * 0.55, 0], [0, r * 0.55]];
            sh.outTangents = [[r * 0.55, 0], [0, r * 0.55], [-r * 0.55, 0], [0, -r * 0.55]];
            sh.closed = true;
            mi = B.property("ADBE Mask Parade").addProperty("ADBE Mask Atom").propertyIndex;
            B.property("ADBE Mask Parade").property(mi).name = I.base + "_Iris";
            B.property("ADBE Mask Parade").property(mi).property("ADBE Mask Shape").setValue(sh);
            B.property("ADBE Mask Parade").property(mi).property("ADBE Mask Feather").setValue([V("feather"), V("feather")]);
            Y.x.set(B.property("ADBE Mask Parade").property(mi).property("ADBE Mask Offset"), Y.rx.expr(I, null, prog + "g * " + Y.rx.f(Math.sqrt(cx * cx + cy * cy) * 1.3) + ";"));
            return;
        }
        if (k === "linear") {
            fx = Y.rx.add(I, ["ADBE Linear Wipe"], /linear wipe/i, "Volet");
            Y.rx.set(I, fx, ["ADBE Linear Wipe-0002", "Wipe Angle"], V("angle"));
            Y.rx.set(I, fx, ["ADBE Linear Wipe-0003", "Feather"], V("feather"));
        } else if (k === "radial" || k === "clock") {
            fx = Y.rx.add(I, ["ADBE Radial Wipe"], /radial wipe/i, "Volet");
            Y.rx.set(I, fx, ["ADBE Radial Wipe-0002", "Start Angle"], V("angle"));
            try { Y.rx.set(I, fx, ["ADBE Radial Wipe-0004", "Wipe"], k === "clock" ? 1 : 3); } catch (e) {}
            Y.rx.set(I, fx, ["ADBE Radial Wipe-0005", "Feather"], V("feather"));
        } else if (k === "venetian") {
            fx = Y.rx.add(I, ["ADBE Venetian Blinds"], /venetian blinds/i, "Volet");
            Y.rx.set(I, fx, ["ADBE Venetian Blinds-0002", "Direction"], V("angle"));
            Y.rx.set(I, fx, ["ADBE Venetian Blinds-0003", "Width"], 60);
        } else if (k === "block") {
            fx = Y.rx.add(I, ["ADBE Block Dissolve"], /block dissolve/i, "Volet");
            Y.rx.set(I, fx, ["ADBE Block Dissolve-0002", "Block Width"], 40);
            Y.rx.set(I, fx, ["ADBE Block Dissolve-0003", "Block Height"], 40);
        } else if (k === "luma") {
            fx = Y.rx.add(I, ["ADBE Gradient Wipe"], /gradient wipe/i, "Volet");
            Y.rx.set(I, fx, ["ADBE Gradient Wipe-0002", "Transition Softness"], Math.min(100, V("feather")));
            Y.rx.set(I, fx, ["ADBE Gradient Wipe-0003", "Gradient Layer"], B.index);
        } else {
            fx = Y.rx.add(I, ["CC Grid Wipe"], /grid wipe/i, "Volet");
        }
        mi = { linear: "ADBE Linear Wipe-0001", radial: "ADBE Radial Wipe-0001", clock: "ADBE Radial Wipe-0001", venetian: "ADBE Venetian Blinds-0001",
               block: "ADBE Block Dissolve-0001", luma: "ADBE Gradient Wipe-0001", grid: "CC Grid Wipe-0001" }[k];
        Y.rx.setx(I, fx, [mi, "Transition Completion", "Completion"], Y.rx.expr(I, null, prog + "100 * (1 - g);"));
    }
});

// Transition 3D : A sort pendant la première moitié (avant la coupe), B entre pendant la seconde. Pas besoin de
// chevauchement : chaque plan reste dans son propre temps.
Y.prim.def("layer3d", {
    label: "Transition3D", fx: [], cost: 2, hosts: "two", main: null,
    params: { kind: ["e", "flip", ["flip", "cube", "swing", "slide3d", "fold"]], axis: ["e", "y", ["y", "x"]], amount: ["n", 90, 10, 180] },
    install: function (I, s) {
        var V = function (k) { return Y.rx.val(I, s, k); }, k = V("kind"), A = I.A, B = I.B, ja, jb, rot, w = I.comp.width, h = I.comp.height, amt = Y.rx.f(V("amount")), set, Ls = [A, B], i, T, an, ps;
        if (!A || !B) { Y.fail("Sélectionne 2 calques : le plan sortant puis le plan entrant."); }
        rot = (k === "swing" || k === "fold" || V("axis") === "x") ? "ADBE Rotate X" : "ADBE Rotate Y";
        for (i = 0; i < 2; i++) {
            if (Ls[i].locked) { Y.fail(Y.MSG.locked(Ls[i])); }
            Ls[i].threeDLayer = true;
            T = Ls[i].property("ADBE Transform Group");
            an = T.property("ADBE Anchor Point").value;
            ps = T.property("ADBE Position").value;
            if (k === "cube") {
                T.property("ADBE Anchor Point").setValue([an[0], an[1], (Ls[i].width || w) / 2]);
                T.property("ADBE Position").setValue([ps[0], ps[1], (ps[2] || 0) + (Ls[i].width || w) / 2]);
            } else if (k === "swing" || k === "fold") {
                T.property("ADBE Anchor Point").setValue([an[0], k === "swing" ? 0 : (Ls[i].height || h), an[2] || 0]);
                T.property("ADBE Position").setValue([ps[0], ps[1] + (k === "swing" ? -1 : 1) * (Ls[i].height || h) / 2, ps[2] || 0]);
            }
        }
        ja = Y.rx.child(I, A);
        jb = I;
        // progression : gA = 0 -> 1 pendant la demi-durée avant la coupe ; gB = 0 -> 1 pendant la demi-durée après.
        set = function (J, L, which) {
            var g = which === "a" ? "var g = nk ? Math.max(0, Math.min(1, (tn + D / 2) / (D / 2))) : 1;\nvar e = yfxCurve(g, c1, c2);\n"
                                  : "var g = mk ? Math.max(0, Math.min(1, tt / (D / 2))) : 0;\nvar e = 1 - yfxCurve(g, c1, c2);\n";
            var T2 = L.property("ADBE Transform Group");
            if (k === "slide3d") {
                Y.x.set(T2.property("ADBE Position"), Y.rx.expr(J, null, g + "[value[0] " + (which === "a" ? "-" : "+") + " " + Y.rx.f(w * 0.7) + " * e, value[1], value[2] + 600 * e];"));
                Y.x.set(T2.property("ADBE Rotate Y"), Y.rx.expr(J, null, g + "value " + (which === "a" ? "+" : "-") + " 35 * e;"));
                return;
            }
            // A tourne de 0 à -angle, B arrive de +angle à 0 : une seule rotation continue.
            Y.x.set(T2.property(rot), Y.rx.expr(J, null, g + "value " + (which === "a" ? "-" : "+") + " " + amt + " * e;"));
            if (k === "flip") { Y.x.set(T2.property("ADBE Position"), Y.rx.expr(J, null, g + "[value[0], value[1], value[2] + 300 * Math.sin(Math.PI * Math.min(1, e))];")); }
        };
        set(ja, A, "a");
        set(jb, B, "b");
    }
});
