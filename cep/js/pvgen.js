/* YexoFX : génération des vidéos de preview (v1.0).
   AE rend chaque preset dans une comp de démo (moteur : pvBegin / pvRender / pvEnd, la recette du catalogue est envoyée),
   puis ffmpeg compresse le rendu en WebM VP9 256x320, 2,4 s max, sans son (< 150 Ko) + une image WebP (affiche de la
   vidéo, et aperçu de repli) dans <assets>/previews/<id>.webm|.webp. Pendant que ffmpeg compresse une preview, AE rend
   déjà la suivante. Par lots : seules les manquantes sont refaites, on peut arrêter et reprendre.
   Sans ffmpeg, le .mp4 d'AE est gardé tel quel. */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};
  const req = typeof window.require === 'function' ? window.require : null;
  let fs = null, path = null, cp = null;
  try { if (req) { fs = req('fs'); path = req('path'); cp = req('child_process'); } } catch (e) { fs = null; }

  const W = 256, H = 320, MAXDUR = '2.4';
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
  const VF = `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}`;
  const ffArgs = (src, dst) => ['-hide_banner', '-v', 'error', '-y', '-i', src, '-t', MAXDUR,
    '-vf', VF, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-deadline', 'good', '-cpu-used', '5', '-row-mt', '1',
    '-pix_fmt', 'yuv420p', '-an', dst];
  // Image fixe : prise vers le milieu (le moment du kill dans la comp de démo).
  const stillArgs = (src, dst) => ['-hide_banner', '-v', 'error', '-y', '-ss', '1.1', '-i', src, '-frames:v', '1',
    '-vf', VF, '-c:v', 'libwebp', '-quality', '72', '-an', dst];

  const removeQuiet = (f) => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { /* ignore */ } };

  const ffRun = (args) => new Promise((resolve, reject) => {
    cp.execFile(YX.pvgen.ffmpeg(), args, { windowsHide: true, timeout: 180000 }, (err, so, se) => {
      if (err) reject(new Error('ffmpeg : ' + String(se || err.message).trim().split(/\r?\n/).pop()));
      else resolve();
    });
  });

  // src -> dst (.webm) + image .webp à côté. keepSrc : garde la vidéo d'origine (tes propres previews).
  // L'image est un bonus : si libwebp manque dans ton ffmpeg, la vidéo reste valable.
  const convert = async (src, dst, keepSrc) => {
    if (!YX.pvgen.ffmpeg()) throw new Error('ffmpeg introuvable');
    const stem = dst.replace(/\.webm$/i, '');
    const tmp = stem + '.part.webm', still = stem + '.webp', stillTmp = stem + '.part.webp';
    try { await ffRun(ffArgs(src, tmp)); } catch (e) { removeQuiet(tmp); throw e; }
    try { await ffRun(stillArgs(src, stillTmp)); } catch (e) { removeQuiet(stillTmp); }
    try {
      removeQuiet(dst);
      fs.renameSync(tmp, dst);
      if (fs.existsSync(stillTmp)) { removeQuiet(still); fs.renameSync(stillTmp, still); }
      if (!keepSrc) removeQuiet(src);
    } catch (e) { removeQuiet(tmp); removeQuiet(stillTmp); throw new Error('écriture impossible : ' + e.message); }
    return dst;
  };

  // ---------------------------------------------------------------- génération
  // Mise en scène : celle du catalogue (preview.kind), sinon déduite de la catégorie. loop = rendu comme un impact.
  const kindOf = (p) => {
    const k = p.preview && p.preview.kind;
    if (k && k !== 'none') return k === 'loop' ? 'hit' : k;
    return p.cat === 'trans' ? 'cut' : (p.cat === 'text' || p.cat === 'styles') ? 'text' : 'hit';
  };
  // ready : Set d'ids ou fonction (preset) -> bool.
  const eligible = (P, ready) => {
    const ok = typeof ready === 'function' ? ready : (p) => ready.has(p.id);
    return P.filter((p) => !p.tool && p.cat !== 'audio' && !(p.preview && p.preview.kind === 'none') && !(p.needs && p.needs.sel === 'audio') && ok(p));
  };

  // Rendu AE -> preview finale. Sans ffmpeg : le .mp4 est copié tel quel.
  const finish = async (p, raw, dir) => {
    if (YX.pvgen.ffmpeg()) return YX.pvgen.convert(raw, path.join(dir, p.id + '.webm'), false);
    if (!/\.mp4$/i.test(raw)) throw new Error('ffmpeg introuvable : le rendu ' + path.basename(raw) + ' ne peut pas être compressé');
    const dst = path.join(dir, p.id + '.mp4');
    fs.copyFileSync(raw, dst);
    removeQuiet(raw);
    return dst;
  };

  // Paramètres de la démo : durée, courbe et découpe par défaut du preset, intensité 100 %.
  const demoParams = (p) => {
    const d = p.defaults || {};
    const params = { frames: p.f === 'loop' ? 0 : p.f, intensity: 1, dir: 'in', by: d.by || 'car' };
    const c = d.curve && YX.catalog ? YX.catalog.CURVE_LIB.find((x) => x.id === d.curve) : null;
    if (c) params.curve = { b: c.b, special: !!c.special, name: c.name };
    return params;
  };

  // list : presets du catalogue. on(phase, st) : begin | render | conv | end. defOf(p) : recette envoyée au moteur.
  const run = async (list, on, defOf) => {
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
          const r = await YX.bridge.call('pvRender', { id: p.id, def: defOf ? defOf(p) : undefined, kind: kindOf(p), word: p.w || 'ACE', params: demoParams(p) });
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
    ffmpeg: findFfmpeg, convert, run, eligible, kindOf, demoParams, userVideos, convertUser, ffArgs, stillArgs, current: null, size: [W, H],
  };
})();
