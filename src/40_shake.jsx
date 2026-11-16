// =====================================================================
// SHAKE
// Effet Transform (pas la transform du calque : tes keyframes restent intactes) précédé
// de Motion Tile (bords en miroir : pas de bords noirs). Le shutter angle du Transform
// donne le motion blur du shake sans activer le MB du calque.
// Shakes "impact" : déclenchés par les markers (voir Y.kit.apply) ; enveloppe = Durée + Courbe.
// =====================================================================
Y.shake = {};

Y.shake.TR = {
    anchor: ["ADBE Geometry2-0001", "Anchor Point"],
    pos: ["ADBE Geometry2-0002", "Position"],
    uniform: ["ADBE Geometry2-0011", "Uniform Scale"],
    scale: ["ADBE Geometry2-0003", "Scale", "Scale Height"],
    scaleW: ["ADBE Geometry2-0004", "Scale Width"],
    rot: ["ADBE Geometry2-0007", "Rotation"],
    compShutter: ["ADBE Geometry2-0009", "Use Composition's Shutter Angle"],
    shutter: ["ADBE Geometry2-0010", "Shutter Angle"]
};
Y.shake.TILE = {
    outW: ["ADBE Tile-0004", "Output Width"],
    outH: ["ADBE Tile-0005", "Output Height"],
    mirror: ["ADBE Tile-0006", "Mirror Edges"]
};

// Motion Tile + Transform nommés base_Tile / base_Transform. Renvoie le nom du Transform.
Y.shake.addTransform = function (L, base, tilePercent, shutter) {
    var tn, trn;
    if (tilePercent) {
        tn = Y.p.addEffect(L, "ADBE Tile", base + "_Tile").name;
        Y.fxe.set(L, tn, Y.shake.TILE.outW, tilePercent);
        Y.fxe.set(L, tn, Y.shake.TILE.outH, tilePercent);
        Y.fxe.set(L, tn, Y.shake.TILE.mirror, 1);
    }
    trn = Y.p.addEffect(L, "ADBE Geometry2", base + "_Transform").name;
    Y.fxe.set(L, trn, Y.shake.TR.compShutter, 0);
    Y.fxe.set(L, trn, Y.shake.TR.shutter, shutter === undefined ? 180 : shutter);
    return trn;
};

Y.shake.trProp = function (L, trn, key) {
    return Y.fxe.p(L, trn, Y.shake.TR[key]);
};

// Expressions d'impact : secousse qui démarre sur le dernier marker, enveloppe e (Durée + Courbe).
Y.shake.impactPosExpr = function (n, tag) {
    var C = Y.kit.C;
    return Y.kit.envCode(n, "", tag) +
        "var r = value;\n" +
        "if (tt < d) {\n" +
        "  var a = " + C("", n.amp) + ", f = " + C("", n.freq) + ", ax = Math.round(" + C("", n.axis) + ");\n" +
        "  seedRandom(mk.index, true);\n" +
        "  var px = random(0, 6.2832), py = random(0, 6.2832);\n" +
        "  var x = a * e * Math.sin(2 * Math.PI * f * tt + px);\n" +
        "  var y = a * e * Math.sin(2 * Math.PI * f * 1.17 * tt + py);\n" +
        "  if (ax == 2) { y = 0; }\n" +
        "  if (ax == 3) { x = 0; }\n" +
        "  r = [value[0] + x, value[1] + y];\n" +
        "}\n" +
        "r;";
};

Y.shake.impactRotExpr = function (n, tag) {
    var C = Y.kit.C;
    return Y.kit.envCode(n, "", tag) +
        "var r = value;\n" +
        "if (tt < d) {\n" +
        "  seedRandom(mk.index + 7, true);\n" +
        "  r = value + " + C("", n.rot) + " * e * Math.sin(2 * Math.PI * " + C("", n.freq) + " * 0.8 * tt + random(0, 6.2832));\n" +
        "}\n" +
        "r;";
};

// Pose un impact shake complet (contrôles + Motion Tile + Transform) sur L.
Y.shake.installImpact = function (L, base, c, opt, tag) {
    var n = Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "amp", "Amplitude", Y.u.round(opt.amp * c.intensity, 1)],
        ["slider", "rot", "Rotation", Y.u.round(opt.rot * c.intensity, 2)],
        ["slider", "freq", "Frequence", opt.freq],
        ["dropdown", "axis", "Axe", opt.axis, ["X et Y", "X seulement", "Y seulement"]],
        ["curve", "curve"]
    ]);
    n.tr = Y.shake.addTransform(L, base, 140);
    Y.x.set(Y.shake.trProp(L, n.tr, "pos"), Y.shake.impactPosExpr(n, tag));
    Y.x.set(Y.shake.trProp(L, n.tr, "rot"), Y.shake.impactRotExpr(n, tag));
    return n;
};

// Shake continu : wiggle (fréquence, amplitude, rotation).
Y.shake.installWiggle = function (L, base, c, opt) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "freq", "Frequence", opt.freq],
        ["slider", "amp", "Amplitude", Y.u.round(opt.amp * c.intensity, 1)],
        ["slider", "rot", "Rotation", Y.u.round(opt.rot * c.intensity, 2)]
    ]);
    n.tr = Y.shake.addTransform(L, base, 130);
    Y.x.set(Y.shake.trProp(L, n.tr, "pos"), "wiggle(" + C("", n.freq) + ", " + C("", n.amp) + ");");
    Y.x.set(Y.shake.trProp(L, n.tr, "rot"), "wiggle(" + C("", n.freq) + " * 0.8, " + C("", n.rot) + ");");
    return n;
};

// Enregistre un preset "any" : base = "YFX_<Nom>" ; install(L, c, base, tag) pose les effets.
// tag = commentaire des markers à suivre quand le calque n'est pas un calque YFX (null sinon).
Y.shake.preset = function (id, name, f, markerDriven, install) {
    Y.reg.add({
        id: id, name: name, needs: "any", f: f,
        run: function (c) {
            var base = Y.PREFIX + name.replace(/[^A-Za-z0-9]/g, "");
            return name + " : " + Y.kit.apply(c, base, markerDriven, function (L) {
                install(L, c, base, L.name === base ? null : base);
            });
        }
    });
};

Y.shake.preset("impact", "Impact", 12, true, function (L, c, base, tag) {
    Y.shake.installImpact(L, base, c, { amp: 28, rot: 2, freq: 11, axis: 1 }, tag);
});
Y.shake.preset("hor", "Horizontal", 10, true, function (L, c, base, tag) {
    Y.shake.installImpact(L, base, c, { amp: 34, rot: 0, freq: 11, axis: 2 }, tag);
});
Y.shake.preset("ver", "Vertical", 10, true, function (L, c, base, tag) {
    Y.shake.installImpact(L, base, c, { amp: 34, rot: 0, freq: 11, axis: 3 }, tag);
});

Y.shake.preset("smooth", "Smooth", 0, false, function (L, c, base) {
    Y.shake.installWiggle(L, base, c, { freq: 1.2, amp: 14, rot: 0.7 });
});
Y.shake.preset("hand", "Handheld", 0, false, function (L, c, base) {
    Y.shake.installWiggle(L, base, c, { freq: 4, amp: 6, rot: 0.3 });
});

// Twitchy : immobilité, puis rafales de secousse (dans l'esprit du mode Twitchy de S_Shake).
Y.shake.preset("twitchy", "Twitchy", 0, false, function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "amp", "Amplitude", Y.u.round(18 * c.intensity, 1)],
        ["slider", "freq", "Frequence", 14],
        ["slider", "dens", "Rafales", 45],
        ["slider", "seg", "Rythme", 0.45]
    ]), tr = Y.shake.addTransform(L, base, 140);
    Y.x.set(Y.shake.trProp(L, tr, "pos"),
        "var seg = Math.max(0.1, " + C("", n.seg) + ");\n" +
        "var si = Math.floor(time / seg);\n" +
        "seedRandom(si, true);\n" +
        "var r = value;\n" +
        "if (random() < " + C("", n.dens) + " / 100) {\n" +
        "  var lt = time - si * seg, k = Math.max(0, 1 - lt / (seg * 0.6));\n" +
        "  var a = " + C("", n.amp) + ", f = " + C("", n.freq) + ";\n" +
        "  var px = random(0, 6.2832), py = random(0, 6.2832);\n" +
        "  r = [value[0] + a * k * Math.sin(2 * Math.PI * f * lt + px), value[1] + a * k * Math.sin(2 * Math.PI * f * 1.2 * lt + py)];\n" +
        "}\n" +
        "r;");
});

// Jumpy : sauts soudains séparés par une dérive lente.
Y.shake.preset("jumpy", "Jumpy", 0, false, function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "amp", "Amplitude", Y.u.round(20 * c.intensity, 1)],
        ["slider", "seg", "Rythme", 0.7]
    ]), tr = Y.shake.addTransform(L, base, 140);
    Y.x.set(Y.shake.trProp(L, tr, "pos"),
        "var a = " + C("", n.amp) + ", seg = Math.max(0.1, " + C("", n.seg) + ");\n" +
        "var si = Math.floor(time / seg);\n" +
        "seedRandom(si + 50, true);\n" +
        "var k = Math.max(0, 1 - (time - si * seg) / (6 * thisComp.frameDuration));\n" +
        "var jx = random(-1, 1) * a * k, jy = random(-1, 1) * a * k;\n" +
        "var w = wiggle(0.6, a * 0.3);\n" +
        "[w[0] + jx, w[1] + jy];");
});

// Rumble : vibration continue qui monte puis redescend après le marker (pour un riser, une ult).
Y.shake.preset("rumble", "Rumble", 40, true, function (L, c, base, tag) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "dur", "Duree", c.frames],
        ["slider", "amp", "Amplitude", Y.u.round(7 * c.intensity, 1)],
        ["slider", "freq", "Frequence", 18],
        ["curve", "curve"]
    ]), tr = Y.shake.addTransform(L, base, 120);
    Y.x.set(Y.shake.trProp(L, tr, "pos"),
        Y.kit.envCode(n, "", tag) +
        "var r = value;\n" +
        "if (tt < d) {\n" +
        "  var env = Math.sin(Math.PI * tt / d);\n" +
        "  var w = wiggle(" + C("", n.freq) + ", " + C("", n.amp) + " * env);\n" +
        "  r = [value[0] + (w[0] - value[0]) * 0.4, w[1]];\n" +
        "}\n" +
        "r;");
});

// Roll : la caméra roule doucement de gauche à droite.
Y.shake.preset("roll", "Roll", 0, false, function (L, c, base) {
    var C = Y.kit.C, n = Y.kit.controls(L, base, c, [
        ["slider", "rot", "Rotation", Y.u.round(2.4 * c.intensity, 2)],
        ["slider", "freq", "Frequence", 0.3]
    ]), tr = Y.shake.addTransform(L, base, 125);
    Y.x.set(Y.shake.trProp(L, tr, "rot"), "value + " + C("", n.rot) + " * Math.sin(time * 2 * Math.PI * " + C("", n.freq) + ");");
});
