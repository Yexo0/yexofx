/* YexoFX : génération des vidéos de preview.
   AE rend chaque preset dans une comp de démo (moteur : pvBegin / pvRender / pvEnd), puis ffmpeg compresse le rendu
   en WebM VP9 432x540 (~150 Ko, lisible par le panel) dans <assets>/previews/<id>.webm. Pendant que ffmpeg compresse
   une preview, AE rend déjà la suivante. Sans ffmpeg, le .mp4 d'AE est gardé tel quel. */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};
  const req = typeof window.require === 'function' ? window.require : null;
  let fs = null, path = null, cp = null;
  try { if (req) { fs = req('fs'); path = req('path'); cp = req('child_process'); } } catch (e) { fs = null; }

  const W = 432, H = 540;
  const VIDEO_EXT = /\.(mp4|mov|m4v|webm)$/i;

  // ---------------------------------------------------------------- ffmpeg
  let ffCache;
  const findFfmpeg = () => {
    if (ffCache !== undefined) return ffCache;
    ffCache = null;
    if (!cp || !fs) return null;
    try {
      const out = cp.execFileSync('where', ['ffmpeg'], { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
      const first = String(out).split(/\r?\n/).map((s) => s.trim()).find(Boolean);
      if (first && fs.existsSync(first)) ffCache = first;
    } catch (e) { /* pas dans le PATH */ }
    if (!ffCache) {
      const env = (window.process && window.process.env) || {};
      const cands = ['C:\\ffmpeg\\bin\\ffmpeg.exe'];
      if (env.LOCALAPPDATA) cands.push(path.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'));
      if (env.ProgramFiles) cands.push(path.join(env.ProgramFiles, 'ffmpeg', 'bin', 'ffmpeg.exe'));
      if (env.USERPROFILE) cands.push(path.join(env.USERPROFILE, 'scoop', 'shims', 'ffmpeg.exe'));
      ffCache = cands.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } }) || null;
    }
    return ffCache;
  };

  // Recadre au format des cartes (4:5) quel que soit le format d'origine, sans son.
  const ffArgs = (src, dst) => ['-hide_banner', '-v', 'error', '-y', '-i', src,
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}`,
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-deadline', 'good', '-cpu-used', '5', '-row-mt', '1',
    '-pix_fmt', 'yuv420p', '-an', dst];

  const removeQuiet = (f) => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { /* ignore */ } };

  // src -> dst (.webm). keepSrc : garde la vidéo d'origine (tes propres previews).
  const convert = (src, dst, keepSrc) => new Promise((resolve, reject) => {
    const ff = YX.pvgen.ffmpeg();
    if (!ff) { reject(new Error('ffmpeg introuvable')); return; }
    const tmp = dst.replace(/\.webm$/i, '') + '.part.webm';
    cp.execFile(ff, ffArgs(src, tmp), { windowsHide: true, timeout: 180000 }, (err, so, se) => {
      if (err) {
        removeQuiet(tmp);
        const last = String(se || err.message).trim().split(/\r?\n/).pop();
        reject(new Error('ffmpeg : ' + last));
        return;
      }
      try {
        removeQuiet(dst);
        fs.renameSync(tmp, dst);
        if (!keepSrc) removeQuiet(src);
      } catch (e) { removeQuiet(tmp); reject(new Error('écriture impossible : ' + e.message)); return; }
      resolve(dst);
    });
  });

  // ---------------------------------------------------------------- génération
  const kindOf = (p) => (p.cat === 'trans' ? 'cut' : (p.cat === 'text' || p.cat === 'styles') ? 'text' : 'hit');
  const eligible = (P, ready) => P.filter((p) => !p.tool && p.cat !== 'audio' && ready.has(p.id));

  // Rendu AE -> preview finale. Sans ffmpeg : le .mp4 est copié tel quel.
  const finish = async (p, raw, dir) => {
    if (YX.pvgen.ffmpeg()) return YX.pvgen.convert(raw, path.join(dir, p.id + '.webm'), false);
    if (!/\.mp4$/i.test(raw)) throw new Error('ffmpeg introuvable : le rendu ' + path.basename(raw) + ' ne peut pas être compressé');
    const dst = path.join(dir, p.id + '.mp4');
    fs.copyFileSync(raw, dst);
    removeQuiet(raw);
    return dst;
  };

  // list : presets du catalogue. on(phase, st) : begin | render | conv | end.
  const run = async (list, on) => {
    const st = { n: list.length, done: 0, ok: 0, errors: [], stop: false, renderMs: 0, rendered: 0, cur: null, source: null, template: null };
    const emit = (ph) => { try { on(ph, st); } catch (e) { /* l'affichage ne doit pas casser la génération */ } };
    const dir = YX.store.previewDir();
    if (!dir) throw new Error('Dossier des previews introuvable : choisis ton dossier YexoFX_assets dans les réglages.');
    YX.pvgen.current = st;
    let begun = false;
    const convs = [];
    try {
      const b = await YX.bridge.call('pvBegin');
      begun = true;
      st.source = b.source;
      st.template = b.template;
      emit('begin');
      for (const p of list) {
        if (st.stop) break;
        st.cur = p;
        emit('render');
        try {
          const t = Date.now();
          const r = await YX.bridge.call('pvRender', { id: p.id, kind: kindOf(p), word: p.w || 'ACE', params: { frames: p.f === 'loop' ? 0 : p.f, intensity: 1, dir: 'in', by: 'car' } });
          st.renderMs += Date.now() - t;
          st.rendered++;
          convs.push(finish(p, r.file, dir).then(() => { st.ok++; }, (e) => { st.errors.push({ id: p.id, name: p.name, msg: e.message }); }).then(() => emit('conv')));
        } catch (e) {
          st.errors.push({ id: p.id, name: p.name, msg: e.message });
          if (e.engine) st.stop = true;
        }
        st.done++;
        emit('render');
      }
      st.cur = null;
      await Promise.all(convs);
    } finally {
      if (begun) { try { await YX.bridge.call('pvEnd', {}); } catch (e) { st.errors.push({ id: '', name: 'Ménage', msg: e.message }); } }
      YX.store.clearPreviews();
      YX.pvgen.current = null;
    }
    emit('end');
    return st;
  };

  // Tes propres vidéos (mp4, mov…) déposées dans previews/ sans .webm à côté : à convertir.
  const userVideos = () => {
    const dir = YX.store.previewDir(true);
    if (!fs || !dir) return [];
    let names = [];
    try { names = fs.readdirSync(dir); } catch (e) { return []; }
    return names.filter((n) => VIDEO_EXT.test(n) && !/\.webm$/i.test(n) && !/\.part\./i.test(n))
      .map((n) => ({ id: n.replace(VIDEO_EXT, ''), src: path.join(dir, n) }))
      .filter((v) => !fs.existsSync(path.join(dir, v.id + '.webm')));
  };
  const convertUser = async (list, on) => {
    const st = { n: list.length, done: 0, ok: 0, errors: [] };
    for (const v of list) {
      try { await YX.pvgen.convert(v.src, v.src.replace(VIDEO_EXT, '.webm'), true); st.ok++; } catch (e) { st.errors.push({ id: v.id, name: v.id, msg: e.message }); }
      st.done++;
      if (on) on(st);
    }
    YX.store.clearPreviews();
    return st;
  };

  YX.pvgen = {
    available: !!(fs && cp),
    ffmpeg: findFfmpeg, convert, run, eligible, kindOf, userVideos, convertUser, ffArgs, current: null, size: [W, H],
  };
})();
