"""YexoFX : banque de SFX de base, synthétisée (aucun échantillon externe, donc libre de droits).

Python 3 standard uniquement (pas de numpy). Résultat reproductible (graines fixes).
Écrit des WAV 16 bits mono 44,1 kHz dans YexoFX_assets/sfx/<type>/<type>[_<variante>].wav.

Les types et variantes suivent le catalogue : un preset dont le champ sfx vaut { "type": "impact", "variant": "phonk" }
trouve impact/impact_phonk.wav ; sans variante, il prend impact/impact.wav. Les packs de style utilisent les mêmes types.

Usage :
    python tools/generate_sfx.py            # (re)génère tout
    python tools/generate_sfx.py --list     # liste ce qui serait généré
    python tools/generate_sfx.py impact     # seulement un type
"""
import math
import os
import random
import struct
import sys
import wave

SR = 44100
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "YexoFX_assets", "sfx"))
TAU = 2 * math.pi


# ---------------------------------------------------------------- briques DSP (listes de flottants, -1..1)
def ns(sec):
    return max(1, int(SR * sec))


def zeros(n):
    return [0.0] * n


def noise(n, rng):
    return [rng.uniform(-1.0, 1.0) for _ in range(n)]


def osc(n, freq, shape="sine", phase=0.0):
    """freq : nombre ou fonction t (s) -> Hz. shape : sine, square, saw, tri."""
    out = [0.0] * n
    ph = phase
    f_const = not callable(freq)
    for i in range(n):
        f = freq if f_const else freq(i / SR)
        ph += f / SR
        ph -= math.floor(ph)
        if shape == "sine":
            v = math.sin(TAU * ph)
        elif shape == "square":
            v = 1.0 if ph < 0.5 else -1.0
        elif shape == "saw":
            v = 2.0 * ph - 1.0
        else:  # tri
            v = 4.0 * abs(ph - 0.5) - 1.0
        out[i] = v
    return out


def env(n, attack=0.002, decay=0.3, curve=1.0, hold=0.0):
    """Attaque linéaire, maintien, puis décroissance exponentielle (decay = temps pour -60 dB)."""
    a, h = ns(attack), ns(hold)
    k = 6.9 / max(1e-4, decay * SR)
    out = [0.0] * n
    for i in range(n):
        if i < a:
            v = i / a
        elif i < a + h:
            v = 1.0
        else:
            v = math.exp(-k * (i - a - h))
        out[i] = v ** curve
    return out


def ramp_env(n, power=2.0, cut=0.0):
    """Montée (crescendo) jusqu'à la fin, coupée net : risers, swells."""
    c = ns(cut)
    return [((i / n) ** power) if i < n - c else 0.0 for i in range(n)]


def mul(x, y):
    return [a * b for a, b in zip(x, y)]


def gain(x, g):
    return [a * g for a in x]


def mix(n, *parts):
    """parts : (signal, gain, décalage en s)."""
    out = [0.0] * n
    for sig, g, off in parts:
        o = ns(off) if off else 0
        for i, v in enumerate(sig):
            j = i + o
            if j >= n:
                break
            out[j] += v * g
    return out


def biquad(x, kind, freq, q=0.707, step=32):
    """Filtre RBJ (lowpass, highpass, bandpass) ; freq : nombre ou fonction t -> Hz (recalculé tous les step)."""
    out = [0.0] * len(x)
    x1 = x2 = y1 = y2 = 0.0
    b0 = b1 = b2 = a1 = a2 = 0.0
    f_const = not callable(freq)
    for i, v in enumerate(x):
        if i % step == 0:
            f = freq if f_const else freq(i / SR)
            f = min(max(f, 20.0), SR * 0.45)
            w = TAU * f / SR
            cw, sw = math.cos(w), math.sin(w)
            al = sw / (2 * q)
            if kind == "lowpass":
                b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
            elif kind == "highpass":
                b0, b1, b2 = (1 + cw) / 2, -(1 + cw), (1 + cw) / 2
            else:  # bandpass (gain de crête 0 dB)
                b0, b1, b2 = al, 0.0, -al
            a0 = 1 + al
            b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, (-2 * cw) / a0, (1 - al) / a0
        y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, y
        out[i] = y
    return out


def sat(x, drive=2.0):
    k = math.tanh(drive)
    return [math.tanh(v * drive) / k for v in x]


def crush(x, bits=6, hold=4):
    q = 2 ** (bits - 1)
    out, last = [0.0] * len(x), 0.0
    for i, v in enumerate(x):
        if i % hold == 0:
            last = round(v * q) / q
        out[i] = last
    return out


def verb(x, wet=0.3, size=1.0, tail=1.2):
    """Petite réverbération de Schroeder (4 peignes + 2 passe-tout), queue ajoutée à la fin."""
    n = len(x) + ns(tail)
    dry = x + [0.0] * (n - len(x))
    combs = [int(d * size) for d in (1557, 1617, 1491, 1422)]
    acc = [0.0] * n
    for d in combs:
        buf = [0.0] * d
        idx = 0
        for i in range(n):
            y = buf[idx]
            buf[idx] = dry[i] + y * 0.82
            idx = (idx + 1) % d
            acc[i] += y * 0.25
    for d in (225, 556):
        buf = [0.0] * d
        idx = 0
        for i in range(n):
            b = buf[idx]
            y = -acc[i] + b
            buf[idx] = acc[i] + b * 0.5
            idx = (idx + 1) % d
            acc[i] = y
    return [dry[i] * (1 - wet) + acc[i] * wet for i in range(n)]


def fade(x, fin=0.002, fout=0.01):
    a, b, n = ns(fin), ns(fout), len(x)
    out = list(x)
    for i in range(min(a, n)):
        out[i] *= i / a
    for i in range(min(b, n)):
        out[n - 1 - i] *= i / b
    return out


def trim(x, floor=0.0008):
    """Coupe le silence de fin."""
    end = len(x)
    while end > 1 and abs(x[end - 1]) < floor:
        end -= 1
    return x[: max(end, ns(0.05))]


def normalize(x, peak=0.89):
    m = max(1e-9, max(abs(v) for v in x))
    return [v * peak / m for v in x]


def reverse(x):
    return x[::-1]


# ---------------------------------------------------------------- sons
def s_whoosh(rng, dur=0.7, lo=300, hi=3200, q=1.2, peak_at=0.55):
    n = ns(dur)
    f = lambda t: lo + (hi - lo) * math.sin(math.pi * min(1.0, t / dur)) ** 1.5
    x = biquad(noise(n, rng), "bandpass", f, q)
    e = [math.sin(math.pi * min(1.0, (i / n) / peak_at * 0.5 if i / n < peak_at else 0.5 + (i / n - peak_at) / (1 - peak_at) * 0.5)) ** 2 for i in range(n)]
    return mul(x, e)


def s_swoosh(rng, dur=0.35):
    n = ns(dur)
    w = s_whoosh(rng, dur, 900, 6000, 1.6, 0.4)
    tone = mul(osc(n, lambda t: 500 + 2500 * t / dur, "sine"), env(n, 0.05, dur * 0.9))
    return mix(n, (w, 1.0, 0), (tone, 0.12, 0))


def s_impact(rng, sub=(140, 42), dur=0.9, crack=0.6, drive=2.2, bright=4000):
    n = ns(dur)
    f0, f1 = sub
    body = mul(osc(n, lambda t: f1 + (f0 - f1) * math.exp(-t * 18), "sine"), env(n, 0.001, dur * 0.85))
    snap = mul(biquad(noise(n, rng), "lowpass", bright, 0.8), env(n, 0.0005, 0.09))
    x = mix(n, (body, 1.0, 0), (snap, crack, 0))
    return sat(x, drive)


def s_boom(rng, dur=2.2, cinematic=True):
    n = ns(dur)
    sub = mul(osc(n, lambda t: 30 + 45 * math.exp(-t * 4), "sine"), env(n, 0.003, dur * 0.9))
    rumble = mul(biquad(noise(n, rng), "lowpass", lambda t: 400 * math.exp(-t * 2) + 60, 0.7), env(n, 0.002, dur * 0.7))
    x = sat(mix(n, (sub, 1.0, 0), (rumble, 0.7, 0)), 1.8)
    return verb(x, 0.35, 1.3, 1.5) if cinematic else x


def s_comic_boom(rng):
    n = ns(0.7)
    body = mul(osc(n, lambda t: 220 * math.exp(-t * 6) + 50, "square"), env(n, 0.002, 0.55))
    return sat(biquad(body, "lowpass", 1800, 0.9), 1.5)


def s_bassdrop(rng, dur=1.6):
    n = ns(dur)
    x = mul(osc(n, lambda t: 34 + 70 * math.exp(-t * 9), "sine"), env(n, 0.002, dur, hold=0.15))
    click = mul(biquad(noise(n, rng), "highpass", 2500), env(n, 0.0003, 0.012))
    return sat(mix(n, (x, 1.0, 0), (click, 0.25, 0)), 2.5)


def s_bass(rng, note=55.0, dur=0.9, funk=False):
    n = ns(dur)
    if funk:
        raw = osc(n, note * 2, "saw")
        x = biquad(raw, "lowpass", lambda t: 300 + 2600 * math.exp(-t * 14), 2.5)
        return sat(mul(x, env(n, 0.002, 0.5)), 1.6)
    x = mul(osc(n, lambda t: note * (1 + 0.6 * math.exp(-t * 40)), "sine"), env(n, 0.002, dur, hold=0.1))
    return sat(x, 1.8)


def s_sub(rng, dur=0.7):
    n = ns(dur)
    return mul(osc(n, 45, "sine"), env(n, 0.01, dur, hold=0.1))


def s_glitch(rng, dur=0.45, crushy=True):
    n = ns(dur)
    out = [0.0] * n
    i = 0
    while i < n:
        seg = ns(rng.uniform(0.008, 0.05))
        kind = rng.choice(["sq", "noise", "sine", "gap", "sq"])
        f = rng.choice([110, 220, 440, 880, 1760, 3520]) * rng.uniform(0.9, 1.1)
        if kind == "gap":
            chunk = zeros(seg)
        elif kind == "noise":
            chunk = noise(seg, rng)
        else:
            chunk = osc(seg, f, "square" if kind == "sq" else "sine")
        g = rng.uniform(0.4, 1.0)
        for k in range(seg):
            if i + k < n:
                out[i + k] = chunk[k] * g
        i += seg
    return crush(out, 5, 6) if crushy else out


def s_stutter(rng):
    base = s_impact(rng, (160, 50), 0.12, 0.8, 2.0)
    n = ns(0.6)
    parts = [(base, 1.0 - k * 0.12, k * 0.075) for k in range(7)]
    return mix(n, *parts)


def s_click(rng, soft=False):
    n = ns(0.03)
    x = mul(biquad(noise(n, rng), "highpass" if not soft else "bandpass", 3500 if not soft else 1800, 0.9), env(n, 0.0002, 0.012 if not soft else 0.02))
    return x


def s_tick(rng):
    n = ns(0.06)
    return mul(osc(n, 2600, "sine"), env(n, 0.0005, 0.03))


def s_pop(rng, comic=False):
    dur = 0.12 if not comic else 0.22
    n = ns(dur)
    f = (lambda t: 300 + 1100 * min(1, t / 0.02)) if not comic else (lambda t: 250 + 900 * (t / dur) ** 0.5)
    return mul(osc(n, f, "sine"), env(n, 0.001, dur * 0.8))


def s_shimmer(rng, dur=1.4, base=2200, spread=4.0, rate=7.0, arp=False):
    n = ns(dur)
    out = [0.0] * n
    parts = 9
    for k in range(parts):
        f = base * (1 + spread * rng.random())
        start = (k / parts) * dur * 0.5 if arp else rng.uniform(0, 0.08)
        tone = mul(osc(n - ns(start), f, "sine"), env(n - ns(start), 0.004, dur * rng.uniform(0.4, 0.9)))
        out = mix(n, (out, 1.0, 0), (tone, 0.25, start))
    trem = [0.75 + 0.25 * math.sin(TAU * rate * i / SR) for i in range(n)]
    return mul(out, trem)


def s_shing(rng, dur=1.3):
    n = ns(dur)
    out = [0.0] * n
    for r, g, d in ((1.0, 1.0, 1.0), (2.76, 0.6, 0.7), (5.4, 0.4, 0.5), (8.93, 0.25, 0.35)):
        out = mix(n, (out, 1.0, 0), (mul(osc(n, 2900 * r, "sine"), env(n, 0.001, dur * d)), g, 0))
    scrape = mul(biquad(noise(n, rng), "highpass", 5000), env(n, 0.001, 0.08))
    return mix(n, (out, 0.7, 0), (scrape, 0.5, 0))


def s_heartbeat(rng):
    n = ns(0.9)
    thump = lambda f: mul(osc(ns(0.25), lambda t: f * (1 + 0.8 * math.exp(-t * 30)), "sine"), env(ns(0.25), 0.003, 0.18))
    return sat(mix(n, (thump(62), 1.0, 0), (thump(52), 0.75, 0.22)), 1.4)


def s_static(rng, dur=1.0):
    n = ns(dur)
    x = biquad(noise(n, rng), "bandpass", 3000, 0.5)
    for _ in range(int(dur * 40)):
        p = rng.randrange(n)
        for k in range(ns(0.002)):
            if p + k < n:
                x[p + k] += rng.uniform(-1, 1) * 1.5
    return mul(x, env(n, 0.01, dur, hold=dur * 0.6))


def s_zap(rng, cyber=False):
    dur = 0.35 if not cyber else 0.5
    n = ns(dur)
    mod = osc(n, 90, "sine")
    f = lambda t: 2400 * math.exp(-t * 9) + 120
    car = osc(n, lambda t: f(t) * (1 + 0.3 * mod[min(n - 1, int(t * SR))]), "saw")
    x = mul(biquad(car, "lowpass", 6000), env(n, 0.001, dur))
    return crush(x, 6, 3) if cyber else x


def s_blip(rng, f=880):
    n = ns(0.07)
    return mul(biquad(osc(n, f, "square"), "lowpass", 4000), env(n, 0.001, 0.06))


def s_riser(rng, dur=2.0):
    n = ns(dur)
    nz = biquad(noise(n, rng), "bandpass", lambda t: 400 + 6000 * (t / dur) ** 2, 1.4)
    saw = biquad(osc(n, lambda t: 180 + 1600 * (t / dur) ** 2, "saw"), "lowpass", lambda t: 800 + 5000 * t / dur)
    return mul(mix(n, (nz, 1.0, 0), (saw, 0.35, 0)), ramp_env(n, 2.2, 0.0))


def s_swell(rng, dur=1.6):
    n = ns(dur)
    x = biquad(noise(n, rng), "highpass", lambda t: 1500 + 5000 * t / dur, 0.7)
    return mul(x, ramp_env(n, 3.0, 0.0))


def s_rewind(rng, dur=0.9):
    n = ns(dur)
    wob = lambda t: 1 + 0.5 * math.sin(TAU * 13 * t)
    tone = osc(n, lambda t: (300 + 2500 * (t / dur) ** 1.5) * wob(t), "saw")
    x = biquad(tone, "bandpass", lambda t: 900 + 3000 * t / dur, 1.2)
    nz = biquad(noise(n, rng), "bandpass", lambda t: 1500 + 4000 * t / dur, 2.0)
    return mul(mix(n, (x, 0.7, 0), (nz, 0.6, 0)), env(n, 0.02, dur, hold=dur * 0.7))


def s_reverse(rng):
    tail = verb(s_impact(rng, (120, 45), 0.8, 0.9, 1.8), 0.45, 1.2, 0.9)
    return fade(reverse(trim(tail)), 0.05, 0.004)


def s_tapestop(rng, dur=0.9):
    n = ns(dur)
    speed = lambda t: max(0.0, 1 - (t / dur) ** 0.7)
    chord = [0.0] * n
    for f in (220, 277.2, 329.6):
        chord = mix(n, (chord, 1.0, 0), (osc(n, lambda t, f=f: f * speed(t), "saw"), 0.33, 0))
    return mul(biquad(chord, "lowpass", lambda t: 400 + 3000 * speed(t)), env(n, 0.005, dur * 2, hold=dur * 0.7))


def s_clap(rng):
    n = ns(0.35)
    burst = lambda: mul(biquad(noise(ns(0.3), rng), "bandpass", 1200, 1.1), env(ns(0.3), 0.0005, 0.12))
    return mix(n, (burst(), 0.7, 0), (burst(), 0.7, 0.011), (burst(), 1.0, 0.023))


def s_cowbell(rng):
    n = ns(0.5)
    x = mix(n, (osc(n, 540, "square"), 0.5, 0), (osc(n, 800, "square"), 0.5, 0))
    return mul(biquad(x, "bandpass", 900, 1.4), env(n, 0.001, 0.35))


def s_punch(rng):
    n = ns(0.3)
    body = mul(osc(n, lambda t: 95 + 80 * math.exp(-t * 40), "sine"), env(n, 0.001, 0.2))
    slap = mul(biquad(noise(n, rng), "bandpass", 1600, 0.9), env(n, 0.0005, 0.05))
    return sat(mix(n, (body, 1.0, 0), (slap, 0.6, 0)), 2.0)


def s_stinger(rng, dur=1.6):
    n = ns(dur)
    out = [0.0] * n
    for f in (110, 116.5, 155.6, 164.8, 233.1):
        out = mix(n, (out, 1.0, 0), (osc(n, f * rng.uniform(0.995, 1.005), "saw"), 0.2, 0))
    x = mul(biquad(out, "lowpass", lambda t: 3000 * math.exp(-t * 1.5) + 300), env(n, 0.004, dur))
    return verb(sat(x, 1.5), 0.3, 1.1, 1.0)


def s_vinyl(rng, dur=2.0):
    n = ns(dur)
    x = gain(biquad(noise(n, rng), "lowpass", 3000), 0.15)
    for _ in range(int(dur * 25)):
        p = rng.randrange(n)
        a = rng.uniform(0.3, 1.0)
        for k in range(ns(0.0015)):
            if p + k < n:
                x[p + k] += a * (1 - k / ns(0.0015)) * rng.choice((-1, 1))
    return x


def s_tape(rng, dur=2.0):
    n = ns(dur)
    hiss = gain(biquad(noise(n, rng), "highpass", 4000), 0.4)
    wow = osc(n, lambda t: 196 * (1 + 0.006 * math.sin(TAU * 0.8 * t)), "tri")
    return mix(n, (hiss, 1.0, 0), (biquad(wow, "lowpass", 1200), 0.35, 0))


def s_drone(rng, dur=3.0):
    n = ns(dur)
    out = [0.0] * n
    for f in (55, 55.4, 82.2, 109.6):
        out = mix(n, (out, 1.0, 0), (osc(n, f, "saw"), 0.25, 0))
    x = biquad(out, "lowpass", lambda t: 300 + 250 * math.sin(TAU * 0.25 * t), 1.0)
    e = [min(1.0, i / ns(0.6)) * min(1.0, (n - i) / ns(0.8)) for i in range(n)]
    return mul(x, e)


def s_metal(rng, dur=1.4):
    n = ns(dur)
    out = [0.0] * n
    for r, g in ((1.0, 1.0), (1.47, 0.7), (2.09, 0.55), (2.56, 0.4), (3.9, 0.3)):
        out = mix(n, (out, 1.0, 0), (mul(osc(n, 210 * r, "sine"), env(n, 0.001, dur * rng.uniform(0.5, 1.0))), g, 0))
    hit = mul(biquad(noise(n, rng), "bandpass", 2500, 1.0), env(n, 0.0005, 0.04))
    return mix(n, (out, 0.6, 0), (hit, 0.5, 0))


def s_bitcrush(rng):
    return crush(s_impact(rng, (150, 45), 0.7, 0.8, 2.5), 4, 10)


# ---------------------------------------------------------------- banque : type -> variantes
# (nom de fichier sans .wav, fonction, graine). Variantes nommées comme les styles du catalogue.
BANK = {
    "whoosh": [("whoosh", lambda r: s_whoosh(r), 1), ("whoosh_deep", lambda r: s_whoosh(r, 0.95, 110, 900, 1.0), 2),
               ("whoosh_fast", lambda r: s_whoosh(r, 0.32, 600, 4500, 1.4, 0.45), 3), ("whoosh_air", lambda r: s_whoosh(r, 0.6, 2000, 9000, 1.8), 4)],
    "swoosh": [("swoosh", lambda r: s_swoosh(r), 5), ("swoosh_reverse", lambda r: fade(reverse(s_swoosh(r, 0.5)), 0.03, 0.004), 6)],
    "impact": [("impact", lambda r: s_impact(r), 10), ("impact_punch", lambda r: s_impact(r, (170, 55), 0.45, 0.9, 2.6, 6000), 11),
               ("impact_phonk", lambda r: s_impact(r, (110, 36), 1.3, 0.5, 3.5, 2500), 12), ("impact_hype", lambda r: s_impact(r, (180, 48), 0.8, 1.1, 2.8, 9000), 13),
               ("impact_horror", lambda r: verb(mix(ns(1.4), (s_impact(r, (90, 30), 1.4, 0.4, 1.6, 1500), 1.0, 0), (s_metal(r, 1.4), 0.35, 0)), 0.4, 1.4, 1.2), 14),
               ("impact_anime", lambda r: mix(ns(1.0), (s_impact(r, (200, 60), 0.5, 1.0, 2.2, 8000), 1.0, 0), (s_shing(r, 1.0), 0.5, 0)), 15),
               ("impact_esport", lambda r: mix(ns(0.7), (s_impact(r, (160, 50), 0.6, 0.8, 2.0, 7000), 1.0, 0), (s_tick(r), 0.4, 0)), 16),
               ("impact_cinematic", lambda r: verb(s_impact(r, (120, 35), 1.4, 0.6, 1.8, 3000), 0.35, 1.3, 1.4), 17)],
    "boom": [("boom", lambda r: s_boom(r, 2.0, False), 20), ("boom_cinematic", lambda r: s_boom(r, 2.4, True), 21), ("boom_comic", lambda r: s_comic_boom(r), 22)],
    "bassdrop": [("bassdrop", lambda r: s_bassdrop(r), 25), ("bassdrop_long", lambda r: s_bassdrop(r, 2.6), 26)],
    "bass": [("bass", lambda r: s_bass(r), 27), ("bass_funk", lambda r: s_bass(r, 55, 0.6, True), 28)],
    "sub": [("sub", lambda r: s_sub(r), 29)],
    "glitch": [("glitch", lambda r: s_glitch(r), 30), ("glitch_02", lambda r: s_glitch(r, 0.6), 31), ("glitch_clean", lambda r: s_glitch(r, 0.35, False), 32),
               ("glitch_stutter", lambda r: s_stutter(r), 33)],
    "click": [("click", lambda r: s_click(r), 35), ("click_soft", lambda r: s_click(r, True), 36)],
    "tick": [("tick", lambda r: s_tick(r), 37)],
    "pop": [("pop", lambda r: s_pop(r), 38), ("pop_comic", lambda r: s_pop(r, True), 39)],
    "shimmer": [("shimmer", lambda r: s_shimmer(r), 40), ("shimmer_esport", lambda r: s_shimmer(r, 0.9, 3000, 2.0, 11.0), 41),
                ("shimmer_y2k", lambda r: s_shimmer(r, 1.2, 1800, 3.0, 5.0, True), 42)],
    "shing": [("shing", lambda r: s_shing(r), 43)],
    "heartbeat": [("heartbeat", lambda r: s_heartbeat(r), 44)],
    "static": [("static", lambda r: s_static(r), 45)],
    "zap": [("zap", lambda r: s_zap(r), 46), ("zap_cyberpunk", lambda r: s_zap(r, True), 47)],
    "blip": [("blip", lambda r: s_blip(r), 48), ("blip_high", lambda r: s_blip(r, 1760), 49)],
    "riser": [("riser", lambda r: s_riser(r), 50), ("riser_short", lambda r: s_riser(r, 1.0), 51)],
    "swell": [("swell", lambda r: s_swell(r), 52)],
    "rewind": [("rewind", lambda r: s_rewind(r), 53)],
    "reverse": [("reverse", lambda r: s_reverse(r), 54)],
    "tapestop": [("tapestop", lambda r: s_tapestop(r), 55)],
    "clap": [("clap", lambda r: s_clap(r), 56)],
    "cowbell": [("cowbell", lambda r: s_cowbell(r), 57)],
    "punch": [("punch", lambda r: s_punch(r), 58)],
    "stinger": [("stinger", lambda r: s_stinger(r), 59)],
    "vinyl": [("vinyl", lambda r: s_vinyl(r), 60)],
    "tape": [("tape", lambda r: s_tape(r), 61)],
    "drone": [("drone", lambda r: s_drone(r), 62)],
    "metal": [("metal", lambda r: s_metal(r), 63)],
    "bitcrush": [("bitcrush", lambda r: s_bitcrush(r), 64)],
}


def write_wav(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".part"
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1.0, min(1.0, v)) * 32767)) for v in x))
    os.replace(tmp, path)


LISEZMOI = """YexoFX - bibliotheque de SFX
=============================

Un sous-dossier = une categorie affichee dans l'onglet Audio du panel.
Formats acceptes : WAV, MP3, AIFF. Ajoute tes propres sons ou dossiers a cote.

Pack de base : genere par tools/generate_sfx.py (synthese pure, aucun echantillon
externe : libre de droits, utilisable dans tes edits et tes videos monetisees).
Variantes par style : <type>_<style>.wav (ex. impact/impact_phonk.wav). Un preset
qui suggere "impact" en style Phonk prend impact_phonk.wav, sinon impact.wav.

Pour regenerer : python tools/generate_sfx.py
"""


def main(argv):
    only = [a for a in argv if not a.startswith("-")]
    if "--list" in argv:
        for t, items in BANK.items():
            print(t + " : " + ", ".join(n for n, _, _ in items))
        return 0
    total, size = 0, 0
    for t, items in BANK.items():
        if only and t not in only:
            continue
        for name, fn, seed in items:
            x = fn(random.Random(seed))
            x = normalize(fade(trim(x), 0.0015, 0.012), 0.89)
            path = os.path.join(ROOT, t, name + ".wav")
            write_wav(path, x)
            total += 1
            size += os.path.getsize(path)
            print("  %-26s %5.2f s" % (t + "/" + name + ".wav", len(x) / SR))
    with open(os.path.join(ROOT, "LISEZMOI.txt"), "w", encoding="ascii", newline="\r\n") as f:
        f.write(LISEZMOI)
    print("%d sons generes dans %s (%.1f Mo)" % (total, ROOT, size / 1048576.0))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
