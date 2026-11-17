/* YexoFX : pont entre le panel (HTML) et le moteur ExtendScript (cep/host/yexofx_host.jsx).
   Toutes les requêtes passent par YFX.api.call("<json>"). Hors d'After Effects (navigateur, tests),
   un moteur simulé répond à la place. */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};
  const cep = window.__adobe_cep__ || null;

  // Chemin de l'extension (dossier cep/), sans préfixe file://.
  const extensionPath = () => {
    if (!cep) return '';
    let p = '';
    try { p = decodeURI(cep.getSystemPath('extension')); } catch (e) { p = ''; }
    return p.replace(/^file:\/{2,3}/, '').replace(/\\/g, '/');
  };

  const evalScript = (code) => new Promise((resolve) => cep.evalScript(code, resolve));
  const asciiJson = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

  // (Re)charge le moteur depuis le disque : la dernière version buildée est toujours utilisée.
  const loadHost = async () => {
    if (!cep) return 'simulé';
    const path = extensionPath() + '/host/yexofx_host.jsx';
    const out = await evalScript('try { $.evalFile(new File(' + JSON.stringify(path) + ')); "ok"; } catch (e) { "ERR " + e.message + " (ligne " + e.line + ")"; }');
    if (out !== 'ok') throw new Error('Chargement du moteur impossible : ' + out + ' [' + path + ']');
    return path;
  };

  const call = async (cmd, args) => {
    if (!cep) return YX.mockHost(cmd, args || {});
    const req = asciiJson({ cmd, args: args || {} });
    const out = await evalScript('YFX.api.call(' + JSON.stringify(req) + ')');
    if (!out || out === 'EvalScript error.' || out === 'undefined') {
      const e = new Error('Le moteur YexoFX ne répond pas dans After Effects.');
      e.engine = true;
      throw e;
    }
    let r;
    try { r = JSON.parse(out); } catch (e) { throw new Error('Réponse du moteur illisible : ' + String(out).slice(0, 160)); }
    if (!r.ok) { const e = new Error(r.error || 'Erreur inconnue'); e.user = !!r.user; throw e; }
    return r.data;
  };

  // ------------------------------------------------------------ moteur simulé (hors AE)
  // presets natifs v0.6 + outils ; primitives = toutes celles du catalogue (comme un moteur à jour)
  const READY = () => YX.catalog.P.filter((p) => p.impl === 'native').map((p) => p.id).concat(['tools_select_yfx', 'tools_clean']);
  const PRIMS = () => Object.keys(YX.catalog.PRIMS || {});
  YX.mockState = { sel: 0 };
  const MOCK_SELS = [
    [{ name: 'TITRE', kind: 'texte', mk: 3 }, { name: 'Clip_ace.mp4', kind: 'footage', mk: 0 }],
    [{ name: 'Clip_ace.mp4', kind: 'footage', mk: 1 }],
    [],
  ];
  const userErr = (m) => { const e = new Error(m); e.user = true; return e; };
  YX.mockHost = async (cmd, a) => {
    await new Promise((r) => setTimeout(r, YX.mockState.delay === undefined ? 30 : YX.mockState.delay));
    const sel = MOCK_SELS[YX.mockState.sel % MOCK_SELS.length];
    switch (cmd) {
      case 'ping': return { version: '1.0.0', build: 'simulé', ae: 'simulé (hors AE)', engine: 'javascript-1.0', lang: 'fr_FR' };
      case 'presets': return READY();
      case 'prims': return PRIMS();
      case 'context': return { project: true, comp: { name: 'EDIT_VALO_01', fps: 60, w: 1080, h: 1920, time: 4.2, tc: '0:00:04:12', dur: '0:00:12:00', layers: 6, items: 14 }, sel };
      case 'env': return { canWrite: true, assets: null, userDir: '(simulé)', thirdParty: ['Deep Glow'] };
      case 'apply': {
        const p = YX.catalog.byId.get(a.id);
        const need = p && p.needs ? p.needs.sel : 'comp';
        if (need === 'text' && !sel.some((l) => l.kind === 'texte')) throw userErr('Sélectionne au moins un calque texte (T) dans la timeline.');
        if ((need === 'layer' || need === 'av') && !sel.length) throw userErr('Sélectionne au moins un calque dans la timeline.');
        return { msg: (p ? p.name : a.id) + ' appliqué (simulation) · ' + (a.params.frames || '?') + ' f · ' + ((a.params.curve && a.params.curve.name) || 'Back') };
      }
      case 'applyStack': return { msg: (a.name || 'Pile') + ' : ' + (a.items || []).length + ' preset(s) appliqué(s) (simulation)' };
      case 'applyPack': {
        if (sel.filter((l) => l.kind !== 'audio').length < 2) throw userErr('Sélectionne au moins 2 clips qui se suivent (et ta musique avec ses markers de beat si tu en as).');
        return { msg: 'Pack ' + a.name + ' appliqué (simulation)' };
      }
      case 'undo': return { msg: 'Dernière action annulée (simulation)' };
      case 'sfxTimes': return { msg: 'son placé ' + (a.times || []).length + ' fois (simulation)' };
      case 'probe': return { path: '(simulé)', json: '(simulé)', count: 60, missing: [] };
      case 'rxTestBegin': return { ok: true };
      case 'rxTest': return YX.mockState.rxFail === (a.def && a.def.id) ? { id: a.def.id, ok: false, errs: ['erreur simulée'] } : { id: a.def && a.def.id, ok: true, ms: 5 };
      case 'rxTestEnd': return { path: '(simulé)', ok: 0, ko: 0, skip: 0 };
      case 'sfx': return { msg: String(a.path).split(/[\\/]/).pop() + ' placé (simulation)' };
      case 'autotest': return { path: '(simulé)', ok: 20, ko: 0, skip: 3 };
      case 'dump': case 'effects': case 'openLog': return { path: '(simulé)' };
      case 'setAssets': return { assets: a.path };
      case 'pvInfo': return { source: sel.length && sel[0].kind === 'footage' ? sel[0].name + ' à 0:00:04:12' : null, queued: 0, raw: '(simulé)' };
      case 'pvBegin': return { source: null, template: 'H.264 - Match Render Settings - 5 Mbps (simulé)', raw: '(simulé)', queued: 0 };
      case 'pvRender': {
        if (YX.mockState.pvFail && YX.mockState.pvFail === a.id) { const e = new Error('Effet natif introuvable (simulation)'); e.user = true; throw e; }
        return { id: a.id, file: YX.mockState.pvRaw ? YX.mockState.pvRaw(a.id) : '(simulé)/' + a.id + '.mp4', ms: 30, msg: 'ok' };
      }
      case 'pvEnd': return { removed: 0, made: 0 };
      default: throw new Error('Commande inconnue : ' + cmd);
    }
  };

  YX.bridge = { inCEP: !!cep, call, loadHost, extensionPath };
})();
