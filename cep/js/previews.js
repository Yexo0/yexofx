/* YexoFX : vignettes animées des presets.
   Si une vidéo existe (YexoFX_assets/previews/<id>.mp4|webm, puis cep/previews/), elle remplace l'animation CSS. */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const elasticF = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1);

  // Tracé d'une courbe (bézier ou Elastic) dans une boîte w x h, valeurs y0..y1.
  const curveD = (c, w, h, pad, y0, y1) => {
    const X = (x) => (pad + x * (w - 2 * pad)).toFixed(1);
    const Yv = (v) => (h - pad - ((v - y0) / (y1 - y0)) * (h - 2 * pad)).toFixed(1);
    if (c.special) {
      let d = '';
      for (let i = 0; i <= 48; i++) { const t = i / 48; d += (i ? 'L' : 'M') + X(t) + ' ' + Yv(elasticF(t)); }
      return d;
    }
    return `M${X(0)} ${Yv(0)} C${X(c.b[0])} ${Yv(c.b[1])} ${X(c.b[2])} ${Yv(c.b[3])} ${X(1)} ${Yv(1)}`;
  };

  const letters = (word) => {
    let i = 0, w = 0;
    return Array.from(word).map((ch) => {
      if (ch === ' ') { w++; return '<span class="sp"></span>'; }
      return `<span class="ch" style="--i:${i++};--w:${w}">${esc(ch)}</span>`;
    }).join('');
  };
  const size = (w) => (w.length > 6 ? ' md' : '');
  const bg = (v) => `<div class="bgl${v ? ' ' + v : ''}"><i class="xh"></i></div>`;

  const pvText = (p) => {
    const sz = size(p.w);
    if (p.id === 'type' || p.id === 'scramble') {
      return bg() + `<div class="word${sz}"><span class="tick" data-kind="${p.id}" data-text="${esc(p.w)}">${esc(p.w)}</span>${p.id === 'type' ? '<span class="caret"></span>' : ''}</div>`;
    }
    if (p.id === 'feed') return bg('b') + '<div class="word sm">ACE</div><div class="feed"><b>YEXO</b><i></i><span>ENEMY</span></div>';
    if (p.id === 'stomp') return `<div class="cam c-stomp">${bg()}<div class="word w-stomp">${letters(p.w)}</div></div>`;
    const cls = { pop: 'w-pop', slide: 'w-slide', blur: 'w-blur', glitch: 'w-glitch', flip: 'w-flip', track: 'w-track', wave: 'w-wave', kin: 'w-kin' }[p.id];
    return bg() + `<div class="word${sz} ${cls}" data-text="${esc(p.w)}">${p.id === 'track' ? esc(p.w) : letters(p.w)}</div>`;
  };
  const pvImpact = (p) => {
    const w = (cls) => `<div class="word sm${cls ? ' ' + cls : ''}">ACE</div>`;
    switch (p.id) {
      case 'killhit': return `<div class="cam c-killhit">${bg('b')}${w('spike')}</div><div class="ov ov-hit"></div>`;
      case 'shaketwitch': return `<div class="cam c-killhit"><div class="tw-sc">${bg('b')}${w()}</div></div>`;
      case 'rgbpunch': return `<div class="cam c-rgbpunch">${bg('b')}${w('spike long')}</div>`;
      case 'hspop': return `<div class="cam c-hspop">${bg()}${w()}</div><div class="ov ov-hit"></div>`;
      case 'bassdrop': return `<div class="cam c-bass">${bg('b')}${w('spike')}</div>`;
      case 'flicker': return `<div class="cam">${bg()}${w()}</div><div class="ov ov-strobe"></div>`;
      case 'choppy': return `<div class="cam c-choppy">${bg('b')}${w()}</div>`;
      case 'glowhit': return `<div class="cam">${bg('c')}${w('glowspike')}</div><div class="ov ov-bloom"></div>`;
      case 'lenspunch': return `<div class="cam c-lens">${bg()}${w()}</div><div class="ov ov-lens"></div>`;
      default: return `<div class="cam c-freeze">${bg('b')}${w()}</div><div class="ov ov-hit late"></div><span class="tagmap">freeze</span>`;
    }
  };
  const pvShake = (p) => `<div class="cam c-${p.id}">${bg('b')}<div class="word sm">ACE</div></div>${p.id === 'impact' ? '<i class="ring-imp"></i>' : ''}`;
  const pvTwitch = (p) => {
    const inner = bg('b') + '<div class="word sm spike">ACE</div>';
    switch (p.id) {
      case 'tw-scale': return `<div class="cam"><div class="tw-sc">${inner}</div></div>`;
      case 'tw-slide': return `<div class="cam c-twsl">${inner}</div>`;
      case 'tw-light': return `<div class="cam c-twl">${bg('b')}<div class="word sm">ACE</div></div>`;
      case 'tw-blur': return `<div class="cam c-twbl">${bg('b')}<div class="word sm">ACE</div></div>`;
      case 'tw-time': return bg('b') + '<i class="runner r-twtime"></i>';
      default: return `<div class="cam c-twl"><div class="layer c-twsl"><div class="tw-sc">${inner}</div></div></div>`;
    }
  };
  const SPD = {
    velocity: 'M3 6 C 12 6, 14 22, 24 22 S 37 6, 46 6',
    slowkill: 'M3 6 C 13 6, 15 22, 24 22 L 46 22',
    speedup: 'M3 22 L 24 22 C 32 22, 36 6, 46 6',
    freeze: 'M3 9 L 18 9 L 18 23 L 31 23 L 31 9 L 46 9',
    rewind: 'M3 9 L 22 9 L 22 21 L 30 21 L 30 9 L 46 9',
    posterize: 'M3 20 h5 v-2 h5 v-2 h5 v-2 h5 v-2 h5 v-2 h5 v-2 h5 v-2 h5',
  };
  const pvSpeed = (p, curve) => {
    if (p.id === 'marker') {
      return bg('c') + '<div class="tl"><svg viewBox="0 0 120 120"><rect class="trk" x="8" y="34" width="104" height="10" rx="2"/><rect class="clip" x="8" y="34" width="60" height="10" rx="2"/><rect class="trk" x="8" y="50" width="104" height="10" rx="2"/><rect class="clip2" x="30" y="50" width="70" height="10" rx="2"/><text class="txt" x="8" y="26">V2</text><text class="txt" x="8" y="76">V1</text><g class="cti-move"><line class="cti" x1="10" y1="18" x2="10" y2="100"/></g>' +
        [22, 47, 72, 97].map((x, i) => `<path class="mk mk-pop" style="animation-delay:${(i * 0.24).toFixed(2)}s" d="M${x - 3} 20h6v4l-3 3-3-3z"/>`).join('') + '</svg></div>';
    }
    if (p.id === 'beat') {
      const hs = [8, 14, 30, 10, 6, 12, 36, 9, 7, 16, 28, 8, 6, 11, 34, 10, 8, 13, 26, 7];
      return bg('c') + '<div class="tl"><svg viewBox="0 0 120 120">' + hs.map((h, i) => `<rect class="wf" x="${10 + i * 5}" y="${70 - h}" width="3" height="${h * 2}" rx="1"/>`).join('') +
        [2, 6, 10, 14, 18].map((i, j) => (hs[i] > 25 ? `<path class="mk mk-pop" style="animation-delay:${(j * 0.18).toFixed(2)}s" d="M${11.5 + i * 5 - 3} 14h6v4l-3 3-3-3z"/>` : '')).join('') + '<text class="txt" x="10" y="110">SEUIL 60 %</text></svg></div>';
    }
    if (p.id === 'ease') {
      return bg('c') + `<div class="tl"><svg viewBox="0 0 120 120"><line class="grid-l" x1="14" y1="96" x2="106" y2="96"/><line class="grid-l" x1="14" y1="34" x2="106" y2="34"/><path class="crv draw" d="${curveD(curve, 120, 120, 14, -0.3, 1.5)}"/><text class="txt" x="14" y="22">${esc(curve.name.toUpperCase())}</text></svg></div>`;
    }
    let ov = '';
    if (p.id === 'freeze') ov = '<div class="ov ov-frz"></div><span class="tagmap">freeze</span>';
    if (p.id === 'rewind') ov = '<div class="ov ov-rew"><div class="ov ov-vhs"></div></div>';
    return bg('b') + `<i class="runner r-${p.id}"></i>${ov}<svg class="spd" viewBox="0 0 50 30" aria-hidden="true"><line x1="3" y1="14" x2="46" y2="14"/><path d="${SPD[p.id]}"/></svg>`;
  };
  const pvTrans = (p) => {
    const k = 't-' + p.id;
    const wc = p.id === 'rgbshake' ? 'word rgbjit' : 'word';
    return `<div class="sh a ${k}">${bg('a')}<span class="tagmap">ascent</span><div class="${wc}">A</div></div><div class="sh b ${k}">${bg('b')}<span class="tagmap">bind</span><div class="${wc}">B</div></div>` +
      (p.id === 'tflash' || p.id === 'whiteglitch' ? '<div class="ov ov-tflash"></div>' : '');
  };
  const pvFx = (p) => {
    const id = p.id;
    if (id === 'grain') return bg() + '<div class="word">ACE</div><div class="ov ov-grain"></div>';
    if (id === 'flash') return bg() + '<div class="word">ACE</div><div class="ov ov-hit"></div>';
    if (id === 'rgb') return bg('b') + '<div class="word fx-rgb">ACE</div>';
    if (id === 'glow') return bg('c') + '<div class="word fx-glow">ACE</div>';
    if (id === 'vhs') return bg() + '<div class="word fx-vhs">REC</div><div class="ov ov-vhs"></div>';
    if (id === 'vig') return bg('b') + '<div class="word">ACE</div><div class="ov ov-vig"></div>';
    if (id === 'letterbox') return bg('b') + '<div class="word">ACE</div><i class="lb t"></i><i class="lb b2"></i>';
    if (id === 'lens') return `<div class="cam c-lensfx">${bg()}<div class="word">ACE</div></div>`;
    if (id === 'leak') return bg('c') + '<div class="word">ACE</div><div class="ov ov-leak"></div>';
    return bg() + '<div class="word">ACE</div>' + `<div class="grade ${id}">${bg()}<div class="word">ACE</div></div><i class="split"></i><span class="tagmap">avant · après</span>`;
  };
  const pvStyle = (p) => {
    const sz = p.id === 'double' || p.id === 'cs2' ? size(p.w) : '';
    return bg('c') + `<div class="word${sz} st-${p.id}">${esc(p.w)}</div>${p.id === 'val' ? '<i class="bar"></i>' : ''}`;
  };
  const PV = { impacts: pvImpact, text: pvText, shake: pvShake, twitch: pvTwitch, speed: pvSpeed, trans: pvTrans, fx: pvFx, styles: pvStyle };

  // Contenu d'une vignette : vidéo si disponible, sinon animation CSS ; + coins de viseur + état d'application.
  const inner = (p, curve, checkIcon) => {
    const video = YX.store && YX.store.previewUrl ? YX.store.previewUrl(p.id) : null;
    const body = video ? `${bg()}<video class="pvv" src="${esc(video)}" muted loop playsinline autoplay></video>` : PV[p.cat](p, curve);
    return body + `<span class="br"></span><div class="state"><span class="ring"></span><span class="ok">${checkIcon}</span></div>`;
  };

  // Typewriter et scramble : animés en JS (texte qui change).
  const GLYPHS = '!<>-_\\/[]{}=+*^?#ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const startTickers = (isAutoplay) => {
    const t0 = performance.now();
    const loop = (now) => {
      document.querySelectorAll('.tick').forEach((el) => {
        const tile = el.closest('.tile');
        const playing = isAutoplay() || !tile || tile.matches(':hover, :focus-within');
        const txt = el.dataset.text;
        if (!playing) { if (el.textContent !== txt) el.textContent = txt; return; }
        const host = el.closest('[style*="--loop"]');
        const loopMs = host ? parseFloat(host.style.getPropertyValue('--loop')) * 1000 * 1.4 : 2400;
        const t = ((now - t0) % loopMs) / loopMs;
        if (el.dataset.kind === 'type') {
          let n;
          if (t < 0.5) n = Math.floor((t / 0.5) * (txt.length + 1));
          else if (t < 0.82) n = txt.length;
          else n = Math.max(0, Math.round(txt.length * (1 - (t - 0.82) / 0.14)));
          el.textContent = txt.slice(0, Math.min(n, txt.length));
        } else {
          let out = '';
          for (let i = 0; i < txt.length; i++) {
            if (txt[i] === ' ') { out += ' '; continue; }
            out += (t > 0.12 + i * 0.07 && t < 0.86) ? txt[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          el.textContent = out;
        }
      });
      setTimeout(() => requestAnimationFrame(loop), 55);
    };
    requestAnimationFrame(loop);
  };

  YX.previews = { inner, curveD, elasticF, startTickers, esc };
})();
