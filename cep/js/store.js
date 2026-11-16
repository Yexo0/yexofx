/* YexoFX : préférences du panel (favoris, durées et courbes perso, réglages), bibliothèque de SFX
   et vidéos de preview. Fichiers dans %APPDATA%\YexoFX (Node.js de CEP) ; localStorage hors d'AE. */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};
  const nodeRequire = (typeof window.require === 'function') ? window.require : null;
  const mod = (name) => { try { return nodeRequire ? nodeRequire(name) : null; } catch (e) { return null; } };
  const fs = mod('fs'), path = mod('path'), cp = mod('child_process');
  const appData = (typeof process !== 'undefined' && process.env && process.env.APPDATA) ? process.env.APPDATA : null;
  const userDir = (fs && appData) ? path.join(appData, 'YexoFX') : null;
  const prefsFile = userDir ? path.join(userDir, 'panel.json') : null;
  const LS_KEY = 'yexofx.panel';

  const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } };
  const ensureDir = (d) => { try { fs.mkdirSync(d, { recursive: true }); } catch (e) { /* déjà là */ } };

  const load = () => {
    if (prefsFile) return readJson(prefsFile) || {};
    try { return JSON.parse(window.localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  };
  let timer = null;
  const save = (data) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const txt = JSON.stringify(data, null, 2);
      if (prefsFile) { try { ensureDir(userDir); fs.writeFileSync(prefsFile, txt, 'utf8'); } catch (e) { /* lecture seule */ } return; }
      try { window.localStorage.setItem(LS_KEY, txt); } catch (e) { /* stockage bloqué */ }
    }, 250);
  };

  const fileUrl = (p) => 'file:///' + encodeURI(String(p).replace(/\\/g, '/')).replace(/#/g, '%23');

  // ------------------------------------------------------------ assets (dossier fourni par le moteur)
  let assetsDir = null;
  const setAssets = (dir) => { assetsDir = dir || null; previewCache.clear(); };

  const AUDIO_EXT = /\.(wav|mp3|aif|aiff|m4a)$/i;
  // Sons rangés dans <assets>/sfx/<catégorie>/<nom>.<ext>
  const listSfx = () => {
    if (!fs || !assetsDir) return [];
    const root = path.join(assetsDir, 'sfx');
    const out = [];
    let cats = [];
    try { cats = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch (e) { return []; }
    cats.sort().forEach((cat) => {
      let files = [];
      try { files = fs.readdirSync(path.join(root, cat)).filter((f) => AUDIO_EXT.test(f)); } catch (e) { files = []; }
      files.sort().forEach((f) => {
        const full = path.join(root, cat, f);
        let size = 0;
        try { size = fs.statSync(full).size; } catch (e) { size = 0; }
        out.push({ id: f.replace(AUDIO_EXT, ''), file: full, url: fileUrl(full), cat, size });
      });
    });
    return out;
  };
  const sfxRoot = () => (assetsDir && path ? path.join(assetsDir, 'sfx') : null);

  // Vidéo de preview : <assets>/previews puis cep/previews. WebM d'abord (toujours lisible par le panel) ;
  // MP4 seulement si le Chromium du panel sait lire le H.264. ?v=<date> : une preview regénérée est rechargée.
  const previewCache = new Map();
  let mp4Ok = null;
  const canMp4 = () => {
    if (mp4Ok === null) {
      try { const v = document.createElement('video'); mp4Ok = !!(v.canPlayType && v.canPlayType('video/mp4; codecs="avc1.42E01E"')); } catch (e) { mp4Ok = false; }
    }
    return mp4Ok;
  };
  const previewDirs = () => {
    const dirs = [];
    if (assetsDir) dirs.push(path.join(assetsDir, 'previews'));
    if (YX.bridge && YX.bridge.extensionPath()) dirs.push(path.join(YX.bridge.extensionPath(), 'previews'));
    return dirs;
  };
  const previewUrl = (id) => {
    if (!fs) return null;
    if (previewCache.has(id)) return previewCache.get(id);
    const exts = canMp4() ? ['.webm', '.mp4'] : ['.webm'];
    let found = null;
    for (const d of previewDirs()) {
      for (const ext of exts) {
        const f = path.join(d, id + ext);
        try { if (fs.existsSync(f)) { found = fileUrl(f) + '?v=' + Math.round(fs.statSync(f).mtimeMs); break; } } catch (e) { /* ignore */ }
      }
      if (found) break;
    }
    previewCache.set(id, found);
    return found;
  };
  const clearPreviews = () => previewCache.clear();
  // Dossier où écrire les previews générées (créé au besoin) ; noCreate : juste le chemin s'il existe.
  const previewDir = (noCreate) => {
    if (!fs) return null;
    const d = previewDirs()[0];
    if (!d) return null;
    if (noCreate) return fs.existsSync(d) ? d : null;
    ensureDir(d);
    return d;
  };

  // En dev, l'extension est un lien vers <projet>/cep : les assets du projet sont à côté.
  const devAssets = () => {
    if (!fs || !YX.bridge || !YX.bridge.extensionPath()) return null;
    try {
      const d = path.join(fs.realpathSync(YX.bridge.extensionPath()), '..', 'YexoFX_assets');
      return fs.existsSync(d) ? path.resolve(d) : null;
    } catch (e) { return null; }
  };

  // Ouvre un fichier ou un dossier dans Windows.
  const open = (p) => {
    if (!cp || !p) return false;
    try { cp.exec('explorer "' + String(p).replace(/\//g, '\\') + '"'); return true; } catch (e) { return false; }
  };

  YX.store = { hasNode: !!fs, userDir, load, save, setAssets, listSfx, sfxRoot, previewUrl, clearPreviews, previewDir, canMp4, open, fileUrl, devAssets, readFile: (f) => (fs ? fs.readFileSync(f) : null) };
})();
