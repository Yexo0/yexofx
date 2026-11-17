// Test du panel v1.0 (cep/index.html) dans jsdom, avec le moteur simulé du bridge et le vrai Node.js
// (fs, crypto) comme dans CEP. Vérifie : licence, rail de catégories, cartes, durée et courbe par preset,
// paramètres envoyés au moteur, favoris, réglages, audio, previews par lots avec reprise, styles, filtres, tri,
// compatibilité avec la sélection, pile et presets perso, packs, collections, comparer A/B, historique,
// auto-test complet, persistance, absence d'erreur JS.
// Usage : node tests/panel.dom.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'yexofx-panel-'));
const APPDATA = path.join(TMP, 'AppData');
const ASSETS = path.join(TMP, 'YexoFX_assets');
fs.mkdirSync(APPDATA, { recursive: true });

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  ok   ' + msg); else { failures++; console.log('  FAIL ' + msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- licence : même calcul que tools/licence.mjs
const machineId = () => {
  let guid;
  try { guid = require('child_process').execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { windowsHide: true }).toString().match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/)[1].toLowerCase(); }
  catch (e) { guid = os.hostname() + '|' + os.userInfo().username; }
  return crypto.createHash('sha256').update('yexofx|' + guid).digest('hex').slice(0, 16).toUpperCase().match(/.{4}/g).join('-');
};
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const issue = (id, name) => {
  const p = b64url(JSON.stringify({ v: 1, n: name, m: id, iat: Math.floor(Date.now() / 1000), exp: null }));
  const s = b64url(crypto.sign(null, Buffer.from('YFX1.' + p), crypto.createPrivateKey(fs.readFileSync(path.join(ROOT, 'keys', 'yexofx_private.pem'), 'utf8'))));
  return 'YFX1.' + p + '.' + s;
};

// ---- un petit WAV valide pour la bibliothèque
const wav = () => {
  const n = 4800, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(48000, 24); b.writeUInt32LE(96000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 10) * 8000 * (1 - i / n)), 44 + i * 2);
  return b;
};
fs.mkdirSync(path.join(ASSETS, 'sfx', 'whoosh'), { recursive: true });
fs.writeFileSync(path.join(ASSETS, 'sfx', 'whoosh', 'whoosh_01.wav'), wav());

const load = async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(String(e.detail && e.detail.stack ? e.detail.stack : e.message).split('\n').slice(0, 3).join(' | ')));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const dom = await JSDOM.fromFile(path.join(ROOT, 'cep', 'index.html'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      win.require = require;
      win.process = { env: { APPDATA } };
      win.matchMedia = () => ({ matches: false });
      win.HTMLCanvasElement.prototype.getContext = () => ({ scale() {}, fillRect() {}, set fillStyle(v) {} });
      win.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      win.HTMLMediaElement.prototype.pause = function () {};
      win.AudioContext = class { decodeAudioData() { return Promise.resolve({ duration: 0.1, getChannelData: () => new Float32Array(4800).fill(0.3) }); } };
      win.addEventListener('error', (e) => errors.push('window.error: ' + e.message));
    },
  });
  await new Promise((r) => dom.window.addEventListener('load', r));
  await sleep(250);
  return { dom, w: dom.window, d: dom.window.document, errors };
};

(async () => {
  console.log('\n1. Licence');
  let { w, d, errors } = await load();
  const $ = (s) => d.querySelector(s), $$ = (s) => Array.from(d.querySelectorAll(s));
  const click = (el, o) => { if (!el) throw new Error('élément introuvable'); el.dispatchEvent(new w.MouseEvent('click', Object.assign({ bubbles: true }, o || {}))); };
  const submitKey = (k) => { $('#key').value = k; $('#gateForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); };
  const mid = machineId();
  ok(!$('#gate').hidden && $('#mid').textContent === mid, 'écran de licence avec l\'ID machine ' + mid);
  submitKey('n importe quoi');
  ok(/YFX1/.test($('#keyErr').textContent), 'clé au mauvais format : ' + $('#keyErr').textContent);
  submitKey(issue('AAAA-BBBB-CCCC-DDDD', 'Autre'));
  ok(/autre PC/.test($('#keyErr').textContent), 'clé d\'un autre PC refusée : ' + $('#keyErr').textContent);
  const good = issue(mid, 'Yexo');
  submitKey(good.slice(0, -4) + 'AAAA');
  ok(/invalide/.test($('#keyErr').textContent), 'signature trafiquée refusée');
  submitKey(good);
  await sleep(700);
  ok($('#gate').hidden && /Licence active · Yexo/.test($('#status').title), 'licence activée : ' + $('#status').title.split('\n')[0]);
  ok(fs.readFileSync(path.join(APPDATA, 'YexoFX', 'licence.key'), 'utf8') === good, 'clé enregistrée dans %APPDATA%\\YexoFX\\licence.key');

  console.log('\n2. Moteur et presets');
  await sleep(300);
  ok(/Moteur v1\.0\.0/.test($('#status').title) && $('#status').classList.contains('ok') && $('#banner').hidden, 'moteur chargé : ' + $('#status').title.split('\n')[1]);
  ok(/EDIT_VALO_01/.test($('#ctx').textContent) && /TITRE/.test($('#ctx').textContent), 'contexte AE affiché : ' + $('#ctx').textContent.trim());
  const nCats = w.YX.catalog.CATS.length;
  ok($$('#cats .rail-btn').length === nCats && $('#btnHome').getAttribute('aria-pressed') === 'true' && $$('#rail .rail-btn[aria-pressed="true"]').length === 1, 'rail : ' + nCats + ' catégories + Accueil actif au premier lancement');
  ok($('#view .home') && /EDIT_VALO_01/.test($('#homeCard').textContent) && /1080 × 1920/.test($('#homeCard').textContent) && /2 calques sélectionnés/.test($('#homeCard').textContent), 'accueil : comp active, taille et sélection');
  ok(/Texte sélectionné/.test($('#homeSug').textContent) && $('#homeSug .qa.sug[data-id="pop"]'), 'accueil : suggestions selon la sélection (calque texte)');
  ok($('#crumb').textContent.trim() === 'Accueil' && $('#status').classList.contains('ok'), "fil d'Ariane « Accueil », barre d'état au vert");
  const calls = [];
  const orig = w.YX.mockHost;
  w.YX.mockHost = (cmd, a) => { calls.push({ cmd, a }); return orig(cmd, a); };
  click($('#view .qa[data-id="killhit"]'));
  await sleep(150);
  ok(calls.some((c) => c.cmd === 'apply' && c.a.id === 'killhit') && /Kill Hit/.test($('#homeRecent').textContent), 'action rapide Kill Hit appliquée, ajoutée aux récents');

  console.log('\n2b. Recherche Ctrl+K, apparence');
  const key = (k, o) => d.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, o || {})));
  const qkey = (k, o) => $('#q').dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, o || {})));
  const typeQ = (v) => { $('#q').value = v; $('#q').dispatchEvent(new w.Event('input', { bubbles: true })); };
  key('k', { ctrlKey: true });
  ok(!$('#pal').hidden && /Aller à/.test($('#palList').textContent) && /Récents/.test($('#palList').textContent), 'Ctrl+K : palette ouverte (récents, pages, actions)');
  typeQ('velo');
  const firstIt = $('#palList .pal-it[aria-selected="true"]');
  ok(firstIt && /Velocity/.test(firstIt.textContent), 'recherche « velo » : Velocity en premier');
  qkey('Enter');
  await sleep(150);
  ok($('#pal').hidden && calls.filter((c) => c.cmd === 'apply').pop().a.id === 'velocity', 'Entrée : Velocity appliqué, palette fermée');
  key('k', { ctrlKey: true });
  typeQ('rgb');
  qkey('Enter', { shiftKey: true });
  ok($('#pal').hidden && /Recherche/.test($('#crumb').textContent) && $$('#view .tile.card').length >= 3, 'Maj+Entrée : résultats en cartes (' + $$('#view .tile.card').length + ')');
  click($('#crumb [data-act="q-clear"]'));
  ok(!/Recherche/.test($('#crumb').textContent), 'recherche effacée');
  key('k', { ctrlKey: true });
  typeQ('reglages');
  qkey('Enter');
  ok($('#view .settings') && $('#btnSettings').getAttribute('aria-pressed') === 'true' && $('#dock').hidden, 'palette → page Réglages (dock masqué)');
  key('/');
  ok(!$('#pal').hidden, '« / » ouvre aussi la palette');
  key('Escape');
  ok($('#pal').hidden, 'Échap ferme la palette');
  click($('#view [data-motion="off"]'));
  click($('#view [data-density="comfort"]'));
  click($('#view [data-act="sw-rail"]'));
  ok(d.documentElement.getAttribute('data-motion') === 'off' && d.documentElement.getAttribute('data-density') === 'comfort' && $('#panel').classList.contains('wide'), 'apparence : animations coupées, densité confortable, rail avec libellés');
  click($('#cats button[data-cat="impacts"]'));
  const first = $('#view .tile');
  ok(first.dataset.id === 'killhit' && !first.classList.contains('not-ready'), 'Impacts : les presets dispo sont en tête (Kill Hit)');
  const nImp = w.YX.catalog.P.filter((p) => p.cat === 'impacts').length;
  ok($$('#view .tile.card').length === nImp && $$('#view .tile.not-ready').length === 0 && $('#view .cat-head h2'), 'Impacts : ' + nImp + ' cartes, toutes disponibles');
  click($('#view .tile[data-id="killhit"] [data-act="dplus"]'));
  click($('#view .tile[data-id="killhit"] [data-act="dplus"]'), { shiftKey: true });
  ok($('#view .tile[data-id="killhit"] .durctl span').textContent === '14 f', 'durée Kill Hit : 8 + 1 + 5 = 14 f');
  click($('#view .tile[data-id="killhit"] .hit'));
  await sleep(150);
  const ap = calls.filter((c) => c.cmd === 'apply').pop();
  ok(ap && ap.a.id === 'killhit' && ap.a.params.frames === 14 && ap.a.params.curve.name === 'Back' && ap.a.params.intensity === 1, 'paramètres envoyés au moteur : ' + JSON.stringify(ap && ap.a.params));
  ok($('#toast').classList.contains('show') && /simulation/.test($('#toast').textContent), 'toast de succès');
  click($('#view .tile[data-id="shaketwitch"] .hit'));
  await sleep(150);
  ok(calls.filter((c) => c.cmd === 'apply').pop().a.id === 'shaketwitch', 'Shake + Twitch appliqué');
  const favCnt = () => Number(($('#cats .rail-btn[data-cat="fav"] .cnt') || { textContent: '0' }).textContent);
  const fav0 = favCnt();
  click($('#view .tile[data-id="shaketwitch"] [data-act="fav"]'));
  ok(favCnt() === fav0 + 1 && $('#view .tile[data-id="shaketwitch"] .tools').classList.contains('has-fav'), `favori : compteur du rail ${fav0} → ${favCnt()}, étoile visible`);
  click($('#view .tile[data-id="shaketwitch"] [data-act="fav"]'));

  console.log('\n3. Fiche, courbe perso, texte');
  click($('#view .tile[data-id="killhit"] [data-act="more"]'));
  click($('#sheet [data-act="d-curve"]'));
  $('#sheet .hdl[data-h="1"]').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, shiftKey: true }));
  click($('#sheet [data-act="ce-use"]'));
  ok(/Perso \(perso\)/.test($('#dCurveName').textContent), 'courbe perso pour Kill Hit');
  click($('#sheet [data-act="apply-detail"]'));
  await sleep(150);
  const ap2 = calls.filter((c) => c.cmd === 'apply').pop();
  ok(ap2.a.params.curve.name === 'Perso' && Math.abs(ap2.a.params.curve.b[1] - 1.6) < 1e-9, 'courbe perso envoyée au moteur (Back 1,56 + 0,05, borné à 1,6) : ' + JSON.stringify(ap2.a.params.curve.b));
  click($('#cats button[data-cat="text"]'));
  click($('#view [data-dir="out"]'));
  click($('#view .tile[data-id="pop"] .hit'));
  await sleep(150);
  ok(calls.filter((c) => c.cmd === 'apply').pop().a.params.dir === 'out', 'Pop en sortie : dir=out envoyé');
  click($('#ctx'));
  await sleep(150);
  click($('#view .tile[data-id="pop"] .hit'));
  await sleep(150);
  ok($('#toast').classList.contains('err') && /calque texte/.test($('#toast').textContent), 'sans calque texte : erreur claire');

  console.log('\n4. Audio, réglages, outils');
  w.YX.store.setAssets(ASSETS);
  click($('#cats button[data-cat="audio"]'));
  click($('#view [data-act="rescan"]'));
  ok($$('#view .sfx').length === 1 && /whoosh_01/.test($('#view .sfx').textContent), 'bibliothèque : whoosh_01 trouvé');
  click($('#view .sfx [data-act="play"]'));
  ok($('#view .sfx .play').getAttribute('aria-pressed') === 'true', 'lecture du son');
  click($('#view .sfx [data-act="cti"]'));
  await sleep(150);
  ok(calls.some((c) => c.cmd === 'sfx' && /whoosh_01\.wav$/.test(c.a.path) && c.a.mode === 'cti'), 'son envoyé au moteur (au CTI)');
  click($('#btnSettings'));
  click($('#view [data-act="sw-auto"]'));
  click($('#view [data-act="tool"][data-id="tools_clean"]'));
  click($('#view [data-act="autotest-ask"]'));
  click($('#sheet [data-act="autotest-run"]'));
  await sleep(300);
  ok(calls.some((c) => c.cmd === 'autotest'), 'auto-test lancé via le moteur');
  click($('#cats button[data-cat="impacts"]'));
  click($('#btnCurve'));
  click($('#sheet [data-cid="snap"]'));
  click($('#sheet [data-act="ce-save"]'));
  click($('#sheet [data-act="ce-use"]'));
  ok(/Perso 1/.test($('#curveV').textContent), 'courbe globale enregistrée et utilisée');
  click($('#view .tile') ? $('#view .tile') : $('#cats button[data-cat="fav"]'));

  console.log('\n4b. Vidéos de preview');
  const PV = w.YX.pvgen;
  const realConvert = PV.convert, realFf = PV.ffmpeg();
  const RAW = path.join(TMP, 'raw');
  fs.mkdirSync(RAW, { recursive: true });
  w.YX.mockState.pvRaw = (id) => { const f = path.join(RAW, id + '.mp4'); fs.writeFileSync(f, 'mp4 ' + id); return f; };
  w.YX.mockState.pvFail = 'glow';
  PV.ffmpeg = () => 'C:/ffmpeg/bin/ffmpeg.exe';
  PV.convert = async (src, dst) => { fs.copyFileSync(src, dst); fs.unlinkSync(src); return dst; };
  const nPv = PV.eligible(w.YX.catalog.P, new Set(w.YX.catalog.P.map((p) => p.id))).length;
  click($('#btnSettings'));
  ok(new RegExp('0 / ' + nPv).test($('#view').textContent) && $('#view [data-act="pv-ask"][data-scope="missing"]'), `réglages : 0 / ${nPv} previews, bouton « Générer les manquantes »`);
  w.YX.mockState.delay = 0;
  const countWebm = () => fs.readdirSync(path.join(ASSETS, 'previews')).filter((f) => f.endsWith('.webm')).length;
  const waitPv = async () => { for (let i = 0; i < 1200 && !/prêtes|arrêtée|impossible/.test(($('#pvTitle') || {}).textContent || ''); i++) await sleep(25); };
  click($('#view [data-act="pv-ask"][data-scope="missing"]'));
  await sleep(150);
  ok($('#sheet [data-act="pv-run"]') && /Clip_ace\.mp4/.test($('#sheet').textContent) && /WebM 256×320/.test($('#sheet').textContent) && $('#sheet [data-pvlot="25"]'), 'confirmation : source (clip sélectionné), WebM 256×320, choix du lot');
  click($('#sheet [data-pvlot="25"]'));
  const nCalls = calls.length;
  click($('#sheet [data-act="pv-run"]'));
  await sleep(20);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(!$('#sheet').hidden && $('#pvBar'), 'pendant la génération : Échap ne ferme pas la fenêtre');
  await waitPv();
  const made1 = countWebm();
  const lot1 = calls.slice(nCalls).filter((c) => c.cmd === 'pvRender').map((c) => c.a.id);
  ok(lot1.length === 25 && made1 >= 24 && made1 <= 25, `lot de 25 : ${lot1.length} rendus, ${made1} .webm écrits`);
  click($('#sheet [data-act="close"]'));
  click($('#btnSettings'));
  ok(new RegExp(made1 + ' / ' + nPv).test($('#view').textContent), `réglages : ${made1} / ${nPv} previews après le premier lot`);
  click($('#view [data-act="pv-ask"][data-scope="missing"]'));
  await sleep(150);
  click($('#sheet [data-pvlot="all"]'));
  const nCalls2 = calls.length;
  click($('#sheet [data-act="pv-run"]'));
  await waitPv();
  const lot2 = calls.slice(nCalls2).filter((c) => c.cmd === 'pvRender').map((c) => c.a.id);
  const made = countWebm();
  ok(/prêtes/.test($('#pvTitle').textContent) && made === nPv - 1, `reprise : ${made} .webm au total (${$('#pvNow').textContent})`);
  ok(lot2.length === nPv - made1 && !lot2.some((id) => id !== 'glow' && lot1.includes(id)), `reprise : seules les ${lot2.length} manquantes sont rendues`);
  const pvCalls = calls.slice(nCalls);
  ok(pvCalls[0].cmd === 'pvBegin' && pvCalls.filter((c) => c.cmd === 'pvBegin').length === 2 && pvCalls.filter((c) => c.cmd === 'pvEnd').length === 2, 'moteur : pvBegin / pvEnd une fois par lot');
  const pvOf = (id) => pvCalls.find((c) => c.cmd === 'pvRender' && c.a.id === id);
  ok(pvOf('zoom').a.kind === 'cut' && pvOf('pop').a.kind === 'text' && pvOf('pop').a.word === 'ACE' && pvOf('killhit').a.kind === 'hit', 'mise en scène : transitions sur une coupe, textes avec leur mot, impacts au kill');
  const rxPv = pvCalls.find((c) => c.cmd === 'pvRender' && c.a.def && c.a.def.impl === 'recipe');
  ok(rxPv && Array.isArray(rxPv.a.def.recipe) && rxPv.a.def.recipe.length && pvOf('killhit').a.def.impl === 'native', `recette envoyée au moteur pour les presets v1 (${rxPv && rxPv.a.id}), id seul pour les natifs`);
  ok(/Glow/.test($('#pvErrs').textContent) && /introuvable/.test($('#pvErrs').textContent), 'erreur d\'un preset listée sans arrêter les autres');
  ok(fs.readdirSync(RAW).length === 0, 'rendus bruts supprimés après compression');
  click($('#sheet [data-act="close"]'));
  click($('#cats button[data-cat="impacts"]'));
  const vid = $('#view .tile[data-id="killhit"] video.pvv');
  ok(vid && /killhit\.webm\?v=\d+$/.test(vid.getAttribute('src')) && vid.getAttribute('preload') === (w.YX.app.state.autoplay ? 'auto' : 'none'), 'carte Kill Hit : vidéo WebM (préchargée seulement en lecture auto)');
  click($('#view .tile[data-id="killhit"] [data-act="more"]'));
  ok(/Regénérer la vidéo/.test($('#sheet [data-act="pv-one"]').textContent), 'fiche : « Regénérer la vidéo de preview »');
  click($('#sheet [data-act="pv-one"]'));
  await sleep(150);
  ok(/Preview de Kill Hit/.test($('#sheet h3').textContent), 'fiche → confirmation pour ce seul preset');
  click($('#sheet [data-act="close"]'));
  w.YX.mockState.delay = undefined;
  if (realFf) {
    const src = path.join(RAW, 'sample.mp4'), dst = path.join(RAW, 'sample.webm');
    require('child_process').execFileSync(realFf, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=540x676:rate=60:duration=2', '-pix_fmt', 'yuv420p', src]);
    await realConvert(src, dst, true);
    const probe = require('child_process').spawnSync(realFf, ['-hide_banner', '-i', dst], { encoding: 'utf8' }).stderr;
    const kb = Math.round(fs.statSync(dst).size / 1024), still = dst.replace(/\.webm$/, '.webp');
    ok(fs.existsSync(dst) && fs.existsSync(src) && /vp9/.test(probe) && /256x320/.test(probe) && kb < 150, `vrai ffmpeg : WebM VP9 256×320 (${kb} Ko < 150), original gardé`);
    ok(fs.existsSync(still) && fs.statSync(still).size > 0, `vrai ffmpeg : image WebP à côté (${fs.existsSync(still) ? Math.round(fs.statSync(still).size / 1024) + ' Ko' : 'absente'})`);
  } else {
    console.log('  --   vrai ffmpeg absent : conversion réelle non testée');
  }
  PV.convert = realConvert;

  await sleep(400);
  const prefs = JSON.parse(fs.readFileSync(path.join(APPDATA, 'YexoFX', 'panel.json'), 'utf8'));
  ok(prefs.cust.killhit.f === 14 && prefs.cust.killhit.c && prefs.myCurves.length === 1 && prefs.autoplay === true && prefs.curve.name === 'Perso 1', 'préférences sauvegardées dans panel.json');
  ok(prefs.motion === 'off' && prefs.density === 'comfort' && prefs.railWide === true && prefs.recent.includes('velocity'), 'apparence et récents sauvegardés');

  console.log('\n4c. Styles, filtres, compatibilité, pile, packs, collections, A/B, historique, auto-test');
  w.YX.mockState.delay = 0;
  const byId = (id) => w.YX.catalog.byId.get(id);
  const tilesP = () => $$('#view .tile.card').map((t) => byId(t.dataset.id));
  click($('#cats button[data-cat="impacts"]'));
  click($('#view .style-chips [data-style="phonk"]'));
  let tp = tilesP();
  ok(tp.length >= 5 && tp.every((p) => p.styles.includes('phonk')) && $$('#view .style-chips button')[1].dataset.style === 'phonk', `style Phonk : ${tp.length} impacts, tous Phonk, puce du style en tête de la barre`);
  click($('#cats button[data-cat="shake"]'));
  tp = tilesP();
  ok(tp.length >= 3 && tp.every((p) => p.styles.includes('phonk') && p.cat === 'shake'), `le style suit dans Shake (${tp.length})`);
  click($('#view .style-chips [data-style=""]'));
  ok($('#view .style-chips [data-style=""]').getAttribute('aria-pressed') === 'true' && tilesP().length === w.YX.catalog.P.filter((p) => p.cat === 'shake').length, 'style retiré (« Tous les styles »)');
  click($('#view [data-act="filters"]'));
  click($('#sheet [data-ftog="perf:leger"]'));
  click($('#sheet [data-sort="az"]'));
  click($('#sheet [data-act="close"]'));
  tp = tilesP();
  const names = tp.map((p) => p.name);
  ok(tp.length > 3 && tp.every((p) => p.perf === 'leger') && /1 filtre/.test($('#view .filt').textContent), `filtre perf légère : ${tp.length} shakes, bouton « 1 filtre »`);
  ok(names.join('|') === names.slice().sort((x, y) => x.localeCompare(y, 'fr')).join('|'), 'tri A-Z');
  click($('#view [data-act="filters"]'));
  click($('#sheet [data-sort="pop"]'));
  click($('#sheet [data-act="filters-clear"]'));
  ok($('#sheet').hidden && !/filtre/.test($('#view .filt').textContent), 'filtres retirés');
  // sélection simulée actuelle : un clip seul -> les presets texte sont grisés avec la raison
  click($('#cats button[data-cat="text"]'));
  const inc = $$('#view .tile.card.incompat');
  ok(inc.length > 10 && inc.every((t) => byId(t.dataset.id).needs.sel === 'text') && /texte requis/.test(inc[0].textContent), `compatibilité : ${inc.length} presets texte grisés « texte requis » (clip sélectionné)`);
  // pile
  click($('#cats button[data-cat="styles"]'));
  const s1 = $('#view .tile.card').dataset.id;
  click($('#view .tile.card [data-act="stack-add"]'));
  click($('#cats button[data-cat="shake"]'));
  const s2 = $('#view .tile.card').dataset.id;
  click($('#view .tile.card [data-act="stack-add"]'));
  ok($('#cats .rail-btn[data-cat="stack"] .cnt').textContent === '2', 'pile : 2 presets (compteur du rail)');
  click($('#cats button[data-cat="stack"]'));
  ok($$('#view .st-item').length === 2, 'vue Pile & perso : 2 lignes');
  click($('#view [data-act="stack-apply"]'));
  await sleep(80);
  const st1 = calls.filter((c) => c.cmd === 'applyStack').pop();
  ok(st1 && st1.a.items.length === 2 && st1.a.items[0].id === s1 && st1.a.items[1].id === s2 && st1.a.items.every((it) => it.def && it.params), 'pile appliquée en un appel (ordre gardé, recettes + paramètres)');
  $('#stackName').value = 'Mon combo test';
  click($('#view [data-act="stack-save"]'));
  ok(w.YX.app.state.userPresets.length === 1 && /Mon combo test/.test($('#view').textContent), 'preset perso enregistré');
  w.YX.app.importUser(JSON.stringify([{ yfx: 'user-preset', name: 'Importé', stack: [{ id: 'killhit' }, { id: 'inconnu-xyz' }] }]));
  ok(w.YX.app.state.userPresets.length === 2 && /1 preset\(s\) inconnu/.test($('#toast').textContent), 'import JSON : 1 preset perso ajouté, preset inconnu signalé');
  click($$('#view [data-act="user-apply"]')[1]);
  await sleep(80);
  ok(calls.filter((c) => c.cmd === 'applyStack').pop().a.name === 'Importé', 'preset perso importé appliqué');
  // packs : texte + clip sélectionnés
  click($('#ctx'));
  click($('#ctx'));
  await sleep(120);
  click($('#cats button[data-cat="packs"]'));
  ok($$('#view .pack-card').length === w.YX.catalog.PACKS.length && w.YX.catalog.PACKS.length === 22, '22 packs de style affichés');
  click($('#view [data-act="pack-apply"]'));
  await sleep(80);
  const pk = calls.filter((c) => c.cmd === 'applyPack').pop();
  ok(pk && pk.a.look && pk.a.cut && pk.a.beat && pk.a.look.recipe && /Pack/.test($('#toast').textContent), 'pack appliqué : look + coupe + beat en un appel');
  // SFX : variante du preset, sinon d'un de ses styles, sinon le son de base du type
  fs.mkdirSync(path.join(ASSETS, 'sfx', 'impact'), { recursive: true });
  ['impact', 'impact_phonk', 'impact_raw'].forEach((n) => fs.writeFileSync(path.join(ASSETS, 'sfx', 'impact', n + '.wav'), wav()));
  w.YX.app.state.sfx = w.YX.store.listSfx();
  const sfxAfter = async (id) => {
    const n0 = calls.length;
    click($('#cats button[data-cat="' + byId(id).cat + '"]'));
    click($(`#view .tile[data-id="${id}"] .hit`));
    await sleep(120);
    const c = calls.slice(n0).find((x) => x.cmd === 'sfx');
    return c ? path.basename(c.a.path) : '(aucun)';
  };
  const v1 = await sfxAfter('imp-red-add'), v2 = await sfxAfter('imp-white-punch'), v3 = await sfxAfter('imp-black-cut');
  ok(v1 === 'impact_phonk.wav' && v2 === 'impact_raw.wav' && v3 === 'impact.wav', `SFX auto : variante du preset (${v1}), d'un de ses styles (${v2}), sinon le son de base (${v3})`);
  // collections, comparer A/B
  click($('#cats button[data-cat="impacts"]'));
  click($('#view .tile[data-id="killhit"] [data-act="more"]'));
  ok(d.activeElement && d.activeElement.dataset.act === 'apply-detail', 'fiche : le focus est sur Appliquer (Entrée applique)');
  click($('#sheet [data-act="coll-add"]'));
  $('#collName').value = 'Intro Valo';
  click($('#sheet [data-act="coll-create"]'));
  ok(w.YX.app.state.colls.length === 1 && w.YX.app.state.colls[0].ids[0] === 'killhit', 'collection « Intro Valo » créée avec Kill Hit');
  click($('#sheet [data-act="detail-of"]'));
  click($('#sheet [data-act="compare"]'));
  ok($$('#sheet .ab-cell').length === 2 && $('#abPick'), 'comparer A/B : deux aperçus + choix de B');
  const opt = $$('#abPick option')[2];
  $('#abPick').value = opt.value;
  $('#abPick').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok($('#sheet h3').textContent.includes(byId(opt.value).name), 'B changé : ' + $('#sheet h3').textContent);
  click($('#sheet [data-act="ab-apply"]'));
  await sleep(80);
  ok(calls.filter((c) => c.cmd === 'apply').pop().a.id === 'killhit', 'Appliquer A depuis la comparaison');
  click($('#cats button[data-cat="coll"]'));
  click($('#view .lnk-row'));
  ok($$('#view .tile.card').length === 1 && /Intro Valo/.test($('#crumb').textContent), 'collection ouverte : 1 carte');
  $('#collRename').value = 'Intros';
  click($('#view [data-act="coll-rename"]'));
  ok(/Intros/.test($('#crumb').textContent), 'collection renommée');
  // raccourci F sur la carte survolée
  click($('#cats button[data-cat="impacts"]'));
  const wasFav = w.YX.app.state.favs.has('flash');
  $('#view .tile.card[data-id="flash"] .hit').dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
  key('f');
  ok(w.YX.app.state.favs.has('flash') !== wasFav, 'touche F : favori basculé sur la carte survolée');
  // historique
  click($('#btnHistory'));
  ok($$('#sheet .st-item').length >= 4, `historique : ${$$('#sheet .st-item').length} applications`);
  click($('#sheet [data-act="undo"]'));
  await sleep(80);
  ok(calls.some((c) => c.cmd === 'undo') && $('#sheet').hidden, 'historique : annuler envoie Edit > Undo au moteur');
  // auto-test complet
  click($('#btnSettings'));
  click($('#view [data-act="rx-test-ask"]'));
  w.YX.mockState.rxFail = 'imp-manga-frame';
  const nRx0 = calls.length;
  click($('#sheet [data-act="rx-test-run"]'));
  for (let i = 0; i < 1200 && !/terminé|arrêté/.test(($('#pvTitle') || {}).textContent || ''); i++) await sleep(25);
  const rxc = calls.slice(nRx0);
  const nTest = w.YX.catalog.P.filter((p) => !p.tool).length;
  ok(rxc[0].cmd === 'rxTestBegin' && rxc.filter((c) => c.cmd === 'rxTest').length === nTest && rxc.filter((c) => /^rx/.test(c.cmd)).pop().cmd === 'rxTestEnd', `auto-test complet : ${nTest} presets testés un par un`);
  ok(/1 échec/.test($('#pvNow').textContent) && $('#pvErrs').textContent.includes(byId('imp-manga-frame').name), 'auto-test : échec listé (' + $('#pvNow').textContent + ')');
  click($('#sheet [data-act="close"]'));
  click($('#view [data-act="probe"]'));
  await sleep(150);
  ok(calls.some((c) => c.cmd === 'probe'), 'sonde des effets lancée');
  w.YX.mockState.delay = undefined;

  console.log('\n5. Désactivation, rechargement');
  click($('#btnSettings'));
  click($('#view [data-act="relock"]'));
  ok(!$('#gate').hidden && !fs.existsSync(path.join(APPDATA, 'YexoFX', 'licence.key')), 'désactivation : clé supprimée, écran de licence');
  const errs1 = errors.slice();
  w.close();
  ({ w, d, errors } = await load());
  const $2 = (s) => d.querySelector(s);
  ok(!$2('#gate').hidden, 'au redémarrage sans clé : écran de licence');
  ok(/Perso 1/.test($2('#curveV').textContent) && $2('#btnAuto').getAttribute('aria-pressed') === 'true', 'préférences relues au redémarrage');
  ok(d.documentElement.getAttribute('data-motion') === 'off' && $2('#panel').classList.contains('wide'), 'apparence relue au redémarrage');
  const allErrors = errs1.concat(errors);
  ok(allErrors.length === 0, 'aucune erreur JS' + (allErrors.length ? ' :\n      ' + Array.from(new Set(allErrors)).slice(0, 8).join('\n      ') : ''));
  w.close();

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(failures ? `\nECHEC : ${failures} test(s) en échec\n` : '\nOK : panel validé (jsdom)\n');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('CRASH : ' + e.stack); process.exit(1); });
