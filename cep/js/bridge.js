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
  const READY = () => YX.catalog.P.map((p) => p.id).concat(['tools_select_yfx', 'tools_clean']);
  YX.mockState = { sel: 0 };
  const MOCK_SELS = [
    [{ name: 'TITRE', kind: 'texte' }, { name: 'Clip_ace.mp4', kind: 'footage' }],
    [{ name: 'Clip_ace.mp4', kind: 'footage' }],
    [],
  ];
  YX.mockHost = async (cmd, a) => {
    await new Promise((r) => setTimeout(r, 30));
    const sel = MOCK_SELS[YX.mockState.sel % MOCK_SELS.length];
    switch (cmd) {
      case 'ping': return { version: '0.6.0', build: 'simulé', ae: 'simulé (hors AE)', engine: 'javascript-1.0', lang: 'fr_FR' };
      case 'presets': return READY();
      case 'context': return { project: true, comp: { name: 'EDIT_VALO_01', fps: 60, w: 1080, h: 1920, time: 4.2, tc: '0:00:04:12', dur: '0:00:12:00', layers: 6, items: 14 }, sel };
      case 'env': return { canWrite: true, assets: null, userDir: '(simulé)', thirdParty: ['Deep Glow'] };
      case 'apply': {
        const p = YX.catalog.P.find((x) => x.id === a.id);
        if ((p && p.cat === 'text') && !sel.some((l) => l.kind === 'texte')) { const e = new Error('Sélectionne au moins un calque texte (T) dans la timeline.'); e.user = true; throw e; }
        if (a.id === 'marker' && !sel.length) { const e = new Error('Sélectionne au moins un calque dans la timeline.'); e.user = true; throw e; }
        return { msg: (p ? p.name : a.id) + ' appliqué (simulation) · ' + (a.params.frames || '?') + ' f · ' + ((a.params.curve && a.params.curve.name) || 'Back') };
      }
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
