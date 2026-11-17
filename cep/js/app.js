/* YexoFX v1.0 : logique du panel. 592 presets pilotés par le catalogue JSON (js/catalog.data.js).
   Rail (catégories + bibliothèque), sélecteur de style global, filtres et tri, grille virtualisée (seules les cartes
   visibles existent), recherche floue Ctrl+K, fiche (comparer A/B, appliquer au beat), pile et presets perso
   (import / export JSON), collections, historique avec annulation, packs de style, compatibilité avec la sélection,
   éditeur de courbe, audio, réglages, licence. Les actions dans AE passent par YX.bridge -> moteur ExtendScript. */
(function () {
  'use strict';
  const YX = window.YX;
  const C = YX.catalog;
  const { CATS, EFFECT_CATS, STYLES, STYLE, P, ROLES, PERF, NEEDS, PACKS, CURVE_LIB } = C;
  const { curveD, elasticF, esc } = YX.previews;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fr = (n, d) => n.toFixed(d === undefined ? 2 : d).replace('.', ',');
  const byId = (id) => C.byId.get(id);
  const P_FX = P.filter((p) => !p.tool); // presets (sans les outils Beat sync, Markers, Easing)

  // ---------------------------------------------------------------- icônes
  const ICON = {
    impacts: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    text: '<path d="M5 6h14M12 6v13"/>',
    shake: '<path d="M2 12c2-5 4 5 6 0s4 5 6 0 4 5 6 0"/>',
    twitch: '<path d="M2 12h4l2-6 3 12 3-9 2 3h6"/>',
    speed: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4.5-5.5"/>',
    trans: '<rect x="3" y="4" width="12" height="12" rx="2.5"/><rect x="9" y="8" width="12" height="12" rx="2.5"/>',
    fx: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4"/>',
    styles: '<path d="M12 3.5c3.8 4.6 5.8 7.7 5.8 10.3a5.8 5.8 0 0 1-11.6 0c0-2.6 2-5.7 5.8-10.3z"/>',
    hud: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M8 12h8M12 8v8"/>',
    cam3d: '<path d="M3.5 8.5 12 4l8.5 4.5v7L12 20l-8.5-4.5z"/><path d="m3.5 8.5 8.5 4.5 8.5-4.5M12 13v7"/>',
    packs: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    stack: '<path d="m12 3.5 8.5 4.5L12 12.5 3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',
    coll: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    audio: '<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>',
    fav: '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    stop: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"/>',
    curve: '<path d="M4 20C10 20 9 4 20 4"/><circle cx="4" cy="20" r="1.6"/><circle cx="20" cy="4" r="1.6"/>',
    more: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 7v6M12 16.5v.5"/>',
    back: '<path d="m14 6-6 6 6 6"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/>',
    rail: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/>',
    folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    history: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/><path d="M12 8v4l2.5 2"/>',
    ab: '<rect x="3.5" y="5" width="7.5" height="14" rx="1.5"/><rect x="13" y="5" width="7.5" height="14" rx="1.5"/>',
    beat: '<path d="M3 12h3l2-5 3 10 3-12 2 7h5"/>',
    up: '<path d="m6 14 6-6 6 6"/>',
    down: '<path d="m6 10 6 6 6-6"/>',
    save: '<path d="M5 4.5h11l3 3V19a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5z"/><path d="M8 4.5v5h7v-5M8 19.5v-6h8v6"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4.5 15v4.5h15V15"/>',
  };
  const FILLED = { play: 1, stop: 1, more: 1 };
  const ico = (n, cls) => `<svg class="ico${FILLED[n] ? ' fill' : ''}${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ICON.fx}</svg>`;
  const Y_PATH = 'M11.5 10.5 18 18.6l6.5-8.1M18 18.6v7.4';
  const logo = () => `<svg class="logo" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="11" fill="var(--accent)"/><g fill="none" stroke="var(--on-accent)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path class="echo e2" d="${Y_PATH}" transform="translate(-3.2 0)" opacity=".16"/><path class="echo e1" d="${Y_PATH}" transform="translate(-1.4 0)" opacity=".34"/><path d="${Y_PATH}" transform="translate(1.6 0)"/></g></svg>`;
  const CAT_DESC = {
    impacts: 'le moment du kill', text: 'titres, kinetic, sous-titres, compteurs', styles: 'looks et étalonnages complets', shake: 'secousses de caméra',
    twitch: 'sauts image par image', speed: 'rampes, gels, bégaiements', trans: 'centrées sur la coupe', fx: 'glow, aura, lignes, glitch, écrans',
    hud: 'killfeed, viseurs, cadres, grain', cam3d: 'caméra 3D et profondeur', packs: 'un style complet en un clic', stack: 'combine des presets, garde-les',
    coll: 'tes sélections de presets', fav: 'tes presets épinglés', audio: 'ta bibliothèque de sons',
  };
  const LIB_IDS = new Set(C.LIB.map((c) => c.id));

  // ---------------------------------------------------------------- état (+ préférences sauvegardées)
  const libCurve = (id) => CURVE_LIB.find((c) => c.id === id);
  const easeCss = (c) => 'cubic-bezier(' + c.b.map((v) => +(+v).toFixed(3)).join(', ') + ')';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saved = YX.store.load() || {};
  const cleanCurve = (c) => (c && Array.isArray(c.b) && c.b.length === 4 ? { id: String(c.id || 'perso'), name: String(c.name || 'Perso'), b: c.b.map(Number), special: !!c.special } : null);
  const MOTIONS = ['normal', 'reduced', 'off'], DENSITIES = ['compact', 'comfort'], SORTS = ['pop', 'recent', 'az', 'fav'];
  const ROUTES = new Set(CATS.map((c) => c.id));
  const validRoute = (r) => typeof r === 'string' && (ROUTES.has(r) || r === 'home' || /^coll:/.test(r) || /^style:/.test(r));
  const state = {
    licensed: false, licName: '', engine: 'loading', engineErr: '', info: null, ready: new Set(), prims: new Set(), env: null, ctx: null,
    cat: validRoute(saved.cat) && saved.cat !== 'settings' ? saved.cat : 'home',
    recent: Array.isArray(saved.recent) ? saved.recent.filter((id) => byId(id)).slice(0, 12) : [],
    motion: MOTIONS.includes(saved.motion) ? saved.motion : (reduced ? 'reduced' : 'normal'),
    density: DENSITIES.includes(saved.density) ? saved.density : 'compact',
    railWide: saved.railWide === true,
    dir: saved.dir || 'in', by: saved.by || 'car',
    style: saved.style && STYLE[saved.style] ? saved.style : '',
    sort: SORTS.includes(saved.sort) ? saved.sort : 'pop',
    filters: { roles: new Set(), perf: new Set(), needs: new Set() },
    intensity: typeof saved.intensity === 'number' ? saved.intensity : 100,
    curve: cleanCurve(saved.curve) || libCurve('back'),
    cust: saved.cust && typeof saved.cust === 'object' ? saved.cust : {},
    myCurves: Array.isArray(saved.myCurves) ? saved.myCurves.map(cleanCurve).filter(Boolean) : [],
    favs: new Set(Array.isArray(saved.favs) ? saved.favs.filter((id) => byId(id)) : ['killhit', 'impact', 'pop', 'flash']),
    autoplay: typeof saved.autoplay === 'boolean' ? saved.autoplay : false,
    sfxAuto: typeof saved.sfxAuto === 'boolean' ? saved.sfxAuto : true,
    stack: Array.isArray(saved.stack) ? saved.stack.filter((it) => it && byId(it.id)) : [],
    userPresets: Array.isArray(saved.userPresets) ? saved.userPresets.filter((u) => u && u.yfx === 'user-preset' && Array.isArray(u.stack)) : [],
    colls: Array.isArray(saved.colls) ? saved.colls.filter((c) => c && c.id && Array.isArray(c.ids)) : [],
    usage: saved.usage && typeof saved.usage === 'object' ? saved.usage : {},
    history: [],
    q: '', sfxCat: 'tout', sfx: [],
  };
  const persist = () => YX.store.save({
    cat: state.cat, dir: state.dir, by: state.by, intensity: state.intensity, curve: state.curve, style: state.style, sort: state.sort,
    cust: state.cust, myCurves: state.myCurves, favs: Array.from(state.favs), autoplay: state.autoplay, sfxAuto: state.sfxAuto,
    recent: state.recent, motion: state.motion, density: state.density, railWide: state.railWide,
    stack: state.stack, userPresets: state.userPresets, colls: state.colls, usage: state.usage,
  });
  const cust = (id) => state.cust[id] || (state.cust[id] = {});
  const framesOf = (p) => (p.f === 'loop' ? 'loop' : (state.cust[p.id] && state.cust[p.id].f) || p.f);
  const curveOf = (p) => (state.cust[p.id] && cleanCurve(state.cust[p.id].c)) || null;
  // courbe effective : perso > courbe du preset > courbe par défaut du panel
  const effCurve = (p) => curveOf(p) || (p && p.defaults && p.defaults.curve && libCurve(p.defaults.curve)) || state.curve;
  const intensityOf = (p) => (p && state.cust[p.id] && typeof state.cust[p.id].k === 'number' ? state.cust[p.id].k : state.intensity);
  const loopOf = (p) => { const f = framesOf(p); return f === 'loop' ? 2.4 : 0.9 + f * 0.065; };
  const tileVars = (p) => { const c = effCurve(p); return `--loop:${loopOf(p).toFixed(2)}s;--ease:${easeCss(c)};`; };
  // prêt : preset natif connu du moteur, ou recette dont toutes les primitives existent dans ce moteur
  const isReady = (p) => (p.impl === 'native' ? state.ready.has(p.id) : p.recipe.every((s) => state.prims.has(s.p)));

  // ---------------------------------------------------------------- compatibilité avec la sélection (avant de cliquer)
  const KIND_CLIP = { footage: 1, 'précomp': 1, solide: 1 };
  const compat = (p) => {
    const c = state.ctx;
    if (state.engine !== 'ok' || !c) return null;
    if (!c.comp) return { short: 'comp', long: c.project ? 'Aucune comp active : ouvre ta comp et clique dans sa timeline.' : 'Aucun projet ouvert.' };
    const sel = c.sel || [], kinds = sel.map((l) => l.kind), vis = sel.filter((l) => l.kind !== 'audio');
    const n = p.needs || {};
    if (n.sel === 'text' && !kinds.includes('texte')) return { short: 'texte requis', long: 'Sélectionne un calque texte (T) dans la timeline.' };
    if (n.sel === 'av' && !kinds.some((k) => KIND_CLIP[k])) return { short: 'clip requis', long: 'Sélectionne ton clip (footage ou précomp) dans la timeline.' };
    if (n.sel === 'layer' && !sel.length) return { short: 'calque requis', long: 'Sélectionne au moins un calque dans la timeline.' };
    if (n.sel === 'audio' && !kinds.includes('audio')) return { short: 'audio requis', long: 'Sélectionne ta musique (calque audio).' };
    if (n.sel === 'two' && vis.length !== 2) return { short: '2 clips', long: 'Sélectionne exactement 2 clips : le plan sortant puis le plan entrant.' };
    if (n.layers3d && vis.length < n.layers3d) return { short: n.layers3d + ' calques', long: `Sélectionne au moins ${n.layers3d} calques à mettre en profondeur (premier plan, arrière-plan…).` };
    const third = (state.env && state.env.thirdParty) || [];
    const miss = (n.plugins || []).filter((pl) => !third.includes(pl));
    if (miss.length) return { short: 'plugin', long: `Il faut ${miss.join(', ')} : il n'est pas installé dans ton AE.` };
    return null;
  };

  // ---------------------------------------------------------------- toast
  let toastTimer = null;
  const toast = (kind, t1, t2, action) => {
    const el = $('#toast');
    el.className = 'toast' + (kind === 'err' ? ' err' : '');
    const icon = kind === 'err' ? 'alert' : kind === 'soon' ? 'clock' : 'check';
    el.innerHTML = `<span class="ti">${ico(icon)}</span><div class="tx"><div class="t1">${esc(t1)}</div>${t2 ? `<div class="t2">${esc(t2)}</div>` : ''}</div>` + (action ? `<button class="mini" type="button" id="toastAct">${esc(action.label)}</button>` : '');
    if (action) $('#toastAct').addEventListener('click', action.run);
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), action ? 6500 : (kind === 'err' ? 7000 : 3800));
  };

  // ---------------------------------------------------------------- contexte AE (comp, sélection)
  let ctxBusy = false;
  let longRun = null; // génération de previews / auto-test en cours : AE est occupé
  const renderCtx = () => {
    const c = state.ctx, el = $('#ctx');
    if (state.engine !== 'ok') { el.textContent = state.engine === 'loading' ? 'connexion à After Effects…' : 'moteur non chargé'; return; }
    if (!c || !c.comp) { el.textContent = c && !c.project ? 'aucun projet ouvert' : 'aucune comp active : clique dans ta timeline'; return; }
    const n = c.sel.length;
    const desc = c.sel.slice(0, 2).map((l) => `${esc(l.name)} <i>${esc(l.kind)}</i>`).join(', ') + (n > 2 ? ` +${n - 2}` : '');
    el.innerHTML = `<b>${esc(c.comp.name)}</b><span class="sep">·</span>${esc(c.comp.tc)}<span class="sep">·</span>${n ? n + ' calque' + (n > 1 ? 's' : '') + ' : ' + desc : 'aucun calque sélectionné'}`;
    el.title = n ? c.sel.map((l) => `${l.name} (${l.kind}${l.mk ? ', ' + l.mk + ' marker' + (l.mk > 1 ? 's' : '') : ''})`).join('\n') : 'Comp active (clique pour rafraîchir)';
  };
  let lastCtxKey = '';
  const refreshContext = async () => {
    if (ctxBusy || state.engine !== 'ok' || longRun) return;
    ctxBusy = true;
    try { state.ctx = await YX.bridge.call('context'); } catch (e) { if (e.engine) { state.engine = 'error'; state.engineErr = e.message; renderStatus(); } }
    ctxBusy = false;
    renderCtx();
    const key = JSON.stringify(state.ctx && state.ctx.comp ? [state.ctx.comp.name, state.ctx.comp.w, state.ctx.comp.fps, state.ctx.comp.layers, state.ctx.comp.items, state.ctx.sel] : state.ctx);
    if (key !== lastCtxKey) {
      lastCtxKey = key;
      if (onHome()) updateHome();
      paintGrid(true); // badges de compatibilité des cartes visibles
    }
  };
  setInterval(() => { if (!document.hidden && state.licensed) refreshContext(); }, 1500);

  // ---------------------------------------------------------------- application d'un preset
  // Ce que le moteur reçoit : la recette (les presets natifs v0.6 n'envoient que leur id).
  const defOf = (p) => (p.impl === 'native' ? { id: p.id, impl: 'native' } : {
    id: p.id, name: p.name, nameEn: p.nameEn, host: p.host, drive: p.drive, recipe: p.recipe, needs: p.needs, defaults: p.defaults, impl: 'recipe',
  });
  const paramsFor = (p) => {
    const c = p ? effCurve(p) : state.curve;
    const f = p ? framesOf(p) : 0;
    const by = p && p.defaults && p.defaults.by && !state.cust.byTouched ? p.defaults.by : state.by;
    return { frames: f === 'loop' ? 0 : f, intensity: intensityOf(p) / 100, curve: { b: c.b, special: !!c.special, name: c.name }, dir: state.dir, by };
  };
  // Son de la bibliothèque pour un type de SFX (dossier sfx/<type>/ d'abord, sinon nom qui le contient).
  // Variante : celle du preset, puis le style actif, puis les styles du preset (impact/impact_phonk.wav…), sinon <type>.wav.
  const sfxOf = (t, variants) => {
    if (!t || !state.sfx.length) return null;
    t = String(t).toLowerCase();
    const exact = state.sfx.filter((s) => s.cat.toLowerCase() === t);
    const pool = exact.length ? exact : state.sfx.filter((s) => s.cat.toLowerCase().includes(t) || s.id.toLowerCase().includes(t));
    if (!pool.length) return null;
    for (const v of variants) {
      const hit = v && pool.find((s) => s.id.toLowerCase() === t + '_' + String(v).toLowerCase());
      if (hit) return hit;
    }
    return pool.find((s) => s.id.toLowerCase() === t) || pool[0];
  };
  const sfxFor = (p) => (p && p.sfx ? sfxOf(p.sfx.type, [p.sfx.variant, state.style].concat(p.styles || [])) : null);
  const placeSfx = async (s, mode) => {
    try { const r = await YX.bridge.call('sfx', { path: s.file, mode: mode || 'cti' }); toast('ok', r.msg, 'rangé dans le dossier YFX_SFX du projet'); }
    catch (e) { toast('err', e.user ? e.message : 'Import du son impossible', e.user ? '' : e.message); }
  };
  const remember = (p, msg) => {
    state.recent = [p.id].concat(state.recent.filter((x) => x !== p.id)).slice(0, 12);
    state.usage[p.id] = (state.usage[p.id] || 0) + 1;
    state.history.unshift({ id: p.id, name: p.name, msg, at: new Date() });
    state.history = state.history.slice(0, 40);
    persist();
  };
  const engineErr = (p, e) => {
    if (e.user) toast('err', e.message, "Rien n'a été modifié.");
    else toast('err', 'Erreur pendant ' + p.name, e.message + ' · un seul Ctrl+Z annule ce qui a été fait.');
  };
  const apply = async (p, tile, opts) => {
    if (p.id === 'ease') { openCurve('keys'); return; }
    if (!isReady(p)) { toast('soon', `${p.name} n'est pas dans ce moteur`, 'Recharge le moteur après une mise à jour (Réglages > Recharger le moteur).'); return; }
    if (state.engine !== 'ok') { toast('err', 'Moteur non chargé', state.engineErr || 'Réglages > Recharger le moteur'); return; }
    const k = compat(p);
    if (k) { toast('err', `${p.name} : ${k.short}`, k.long); return; }
    if (opts && opts.beat) {
      const sel = (state.ctx && state.ctx.sel) || [];
      if (!sel.some((l) => l.kind === 'audio' && l.mk > 0)) { toast('err', 'Appliquer au beat', 'Sélectionne aussi ta musique avec ses markers de beat (Vitesse > Beat sync pour les poser).'); return; }
    }
    if (tile) tile.classList.add('applying');
    try {
      const r = await YX.bridge.call('apply', { id: p.id, def: defOf(p), params: paramsFor(p) });
      if (tile) { tile.classList.remove('applying'); tile.classList.add('done'); setTimeout(() => tile.classList.remove('done'), 900); }
      remember(p, r.msg);
      if (onHome()) updateHome();
      let extra = 'Ctrl+Z annule';
      const s = state.sfxAuto && ['impacts', 'shake', 'trans'].includes(p.cat) ? sfxFor(p) : null;
      if (s) {
        try { await YX.bridge.call('sfx', { path: s.file, mode: 'cti' }); extra = `+ ${s.id} placé · ` + extra; } catch (e) { extra = `${s.id} non placé (${e.message}) · ` + extra; }
      }
      const offer = !s ? sfxFor(p) : null;
      toast('ok', r.msg, extra, offer ? { label: '+ ' + offer.id, run: () => placeSfx(offer) } : null);
    } catch (e) {
      if (tile) tile.classList.remove('applying');
      engineErr(p, e);
    }
    refreshContext();
  };

  // ---------------------------------------------------------------- listes affichées (catégorie / style / recherche + filtres + tri)
  const activeFilterCount = () => state.filters.roles.size + state.filters.perf.size + state.filters.needs.size;
  // relevance : résultats d'une recherche, déjà classés par pertinence (gardé tant que le tri est « Populaires »)
  const listFor = (base, relevance) => {
    const f = { style: state.style, roles: state.filters.roles, perf: state.filters.perf, needs: state.filters.needs };
    let list = YX.search.filter(base, f);
    if (!(relevance && state.sort === 'pop')) list = YX.search.sort(list, state.sort, { usage: state.usage, favs: state.favs });
    // les presets prêts d'abord
    return list.filter(isReady).concat(list.filter((p) => !isReady(p)));
  };

  // ---------------------------------------------------------------- grille virtualisée
  // Seules les rangées visibles (+ 2 de marge) sont dans le DOM. Hors mise en page (jsdom), tout est rendu.
  let VG = null;
  const GAP = 8, PADX = 12, MINW = 124;
  const mountGrid = (list, showCat) => {
    VG = { list, showCat, cols: 2, rowH: 0, rows: 0, start: -1, end: -1, top: 0 };
    layoutGrid();
  };
  const layoutGrid = () => {
    const el = $('#vgrid');
    if (!el || !VG) return;
    const W = el.clientWidth;
    if (!W) { VG.cols = 0; paintGrid(true); return; }
    const inner = W - PADX * 2;
    VG.cols = Math.max(2, Math.floor((inner + GAP) / (MINW + GAP)));
    const tileW = (inner - GAP * (VG.cols - 1)) / VG.cols;
    VG.rowH = tileW * 1.25 + GAP;
    VG.rows = Math.ceil(VG.list.length / VG.cols);
    el.style.height = Math.ceil(VG.rows * VG.rowH + 12) + 'px';
    const sc = $('#scroll');
    VG.top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
    paintGrid(true);
  };
  const paintGrid = (force) => {
    const el = $('#vgrid');
    if (!el || !VG) return;
    const cls = `grid vg-inner${state.autoplay ? '' : ' hover-only'}${state.dir === 'out' ? ' out' : ''}`;
    if (!VG.cols) { // pas de mise en page : tout rendre
      el.innerHTML = `<div class="${cls}">${VG.list.map((p) => tileHTML(p, VG.showCat)).join('')}</div>`;
      syncVideos();
      return;
    }
    const sc = $('#scroll'), viewTop = sc.scrollTop - VG.top;
    const first = Math.max(0, Math.floor(viewTop / VG.rowH) - 2);
    const last = Math.min(VG.rows, Math.ceil((viewTop + sc.clientHeight) / VG.rowH) + 2);
    if (!force && first === VG.start && last === VG.end) return;
    VG.start = first;
    VG.end = last;
    const slice = VG.list.slice(first * VG.cols, last * VG.cols);
    el.innerHTML = `<div class="${cls}" style="transform:translateY(${Math.round(first * VG.rowH)}px);grid-template-columns:repeat(${VG.cols},minmax(0,1fr))">${slice.map((p) => tileHTML(p, VG.showCat)).join('')}</div>`;
    syncVideos();
  };
  let scrollRaf = 0;
  $('#scroll').addEventListener('scroll', () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; paintGrid(false); }); }, { passive: true });
  window.addEventListener('resize', () => { layoutGrid(); });

  // ---------------------------------------------------------------- cartes
  const durHTML = (p) => {
    const f = framesOf(p);
    if (f === 'loop') return '';
    const custom = state.cust[p.id] && state.cust[p.id].f;
    return `<div class="durctl${custom ? ' custom' : ''}"><button type="button" data-act="dminus" aria-label="Raccourcir ${esc(p.name)}">−</button><span>${f} f</span><button type="button" data-act="dplus" aria-label="Allonger ${esc(p.name)}">+</button></div>`;
  };
  const catLabel = (id) => (CATS.find((c) => c.id === id) || { label: id }).label;
  const tileHTML = (p, showCat) => {
    const k = compat(p), ready = isReady(p), inStack = state.stack.some((it) => it.id === p.id);
    const badge = !ready ? '<span class="soon">bientôt</span>' : k ? `<span class="soon need" title="${esc(k.long)}">${ico('alert')}${esc(k.short)}</span>` : p.perf === 'lourd' ? '<span class="soon heavy" title="Rendu lourd : une alternative légère est proposée dans la fiche">lourd</span>' : '';
    return `
    <article class="tile card${ready ? '' : ' not-ready'}${k ? ' incompat' : ''}" data-id="${p.id}" style="${tileVars(p)}">
      <div class="pv">${YX.previews.inner(p, effCurve(p), ico('check'))}</div>
      <div class="cap"><div class="nm">${esc(p.name)}</div><div class="sb">${esc(showCat ? catLabel(p.cat).toLowerCase() + ' · ' + p.sb : p.sb)}</div></div>
      ${durHTML(p)}
      ${curveOf(p) ? '<span class="mark-c">courbe perso</span>' : ''}
      ${badge}
      <button class="hit" type="button" data-act="apply" aria-label="Appliquer ${esc(p.name)}${k ? ' (' + esc(k.short) + ')' : ''}"></button>
      <div class="tools${state.favs.has(p.id) ? ' has-fav' : ''}">
        <button class="tb more" type="button" data-act="more" aria-label="Fiche de ${esc(p.name)}">${ico('more')}</button>
        <button class="tb add${inStack ? ' on' : ''}" type="button" data-act="stack-add" aria-pressed="${inStack}" aria-label="Ajouter ${esc(p.name)} à la pile">${ico('plus')}</button>
        <button class="tb star" type="button" data-act="fav" aria-pressed="${state.favs.has(p.id)}" aria-label="Favori">${ico('fav')}</button>
      </div>
    </article>`;
  };

  // ---------------------------------------------------------------- en-têtes, filtres
  const chips = (key, opts, current) => `<div class="chips" role="group">${opts.map(([v, l]) => `<button type="button" data-${key}="${esc(v)}" aria-pressed="${(current !== undefined ? current : state[key]) === v}">${esc(l)}</button>`).join('')}</div>`;
  const catHead = (title, cmd, right) => `<div class="cat-head"><h2 class="sr">${esc(title)}</h2><span class="cmd">${esc(cmd)}</span><span class="count">${esc(right)}</span></div>`;
  const SORT_LABEL = { pop: 'Populaires', recent: 'Récents', az: 'A-Z', fav: 'Favoris d\'abord' };
  // barre de style (global) + bouton filtres / tri
  const styleBar = (noFilters) => {
    const n = activeFilterCount();
    const sw = (s) => `<i class="sw-dot" style="background:${esc(s.palette[2] || s.palette[0])}"></i>`;
    const order = state.style ? [STYLE[state.style]].concat(STYLES.filter((s) => s.id !== state.style)) : STYLES;
    return `<div class="style-bar">
      <div class="style-chips" role="group" aria-label="Style d'edit">
        <button type="button" data-style="" aria-pressed="${!state.style}">Tous les styles</button>
        ${order.map((s) => `<button type="button" data-style="${s.id}" aria-pressed="${state.style === s.id}" title="${esc(s.name)}">${sw(s)}${esc(s.short)}</button>`).join('')}
      </div>
      ${noFilters ? '' : `<button class="mini filt${n ? ' on' : ''}" type="button" data-act="filters" title="Filtres et tri">${ico('filter')}<span>${n ? n + ' filtre' + (n > 1 ? 's' : '') : SORT_LABEL[state.sort]}</span></button>`}
    </div>`;
  };
  const emptyHTML = (msg, hint) => `<div class="empty">${esc(msg)}${hint ? `<span class="cmd">${esc(hint)}</span>` : ''}${state.style || activeFilterCount() ? '<div class="row-btns" style="justify-content:center;margin-top:10px"><button class="mini" type="button" data-act="filters-clear">Retirer le style et les filtres</button></div>' : ''}</div>`;

  // ---------------------------------------------------------------- rail, fil d'Ariane, navigation
  const favCount = () => P.filter((p) => state.favs.has(p.id)).length;
  const railInner = (icon, label, extra) => `${ico(icon)}<span class="lbl">${esc(label)}</span>${extra || ''}`;
  const routeBase = () => (state.cat.indexOf(':') > 0 ? (state.cat.startsWith('coll:') ? 'coll' : 'style') : state.cat);
  const renderCats = () => {
    let html = '', group = null;
    const cur = !state.q ? routeBase() : '';
    CATS.forEach((c) => {
      const g = LIB_IDS.has(c.id) ? 'Bibliothèque' : 'Effets';
      if (g !== group) { html += `<div class="rail-sep" role="presentation"><span>${g}</span></div>`; group = g; }
      const cnt = c.id === 'fav' && favCount() ? favCount() : c.id === 'stack' && state.stack.length ? state.stack.length : 0;
      html += `<button class="rail-btn" type="button" data-cat="${c.id}" aria-pressed="${cur === c.id}" title="${esc(c.label)}" aria-label="${esc(c.label)}">${railInner(c.id, c.label, cnt ? `<span class="cnt">${cnt}</span>` : '')}</button>`;
    });
    $('#cats').innerHTML = html;
    $('#btnHome').setAttribute('aria-pressed', String(cur === 'home'));
    $('#btnSettings').setAttribute('aria-pressed', String(cur === 'settings'));
  };
  const onHome = () => !state.q && state.cat === 'home' && !!$('#view .home');
  const crumbHTML = () => {
    const chev = ico('chev', 'chev');
    if (state.q) return `<span class="up">Recherche</span>${chev}<span class="cur">« ${esc(state.q)} »</span><button class="ibtn xs" type="button" data-act="q-clear" aria-label="Effacer la recherche" title="Effacer la recherche">${ico('x')}</button>`;
    if (state.cat === 'home') return '<span class="cur">Accueil</span>';
    if (state.cat === 'settings') return '<span class="cur">Réglages</span>';
    if (state.cat.startsWith('style:')) { const s = STYLE[state.cat.slice(6)]; return `<span class="up">Styles</span>${chev}<span class="cur">${esc(s ? s.name : '?')}</span>`; }
    if (state.cat.startsWith('coll:')) { const c = state.colls.find((x) => 'coll:' + x.id === state.cat); return `<span class="up">Collections</span>${chev}<span class="cur">${esc(c ? c.name : '?')}</span>`; }
    const c = CATS.find((x) => x.id === state.cat);
    return `<span class="up">${LIB_IDS.has(c.id) ? 'Bibliothèque' : 'Effets'}</span>${chev}<span class="cur">${esc(c.label)}</span>`;
  };
  const go = (route) => {
    state.cat = route;
    state.q = '';
    persist();
    renderView();
    $('#scroll').scrollTop = 0;
    layoutGrid();
  };

  // ---------------------------------------------------------------- accueil
  const QUICK = ['killhit', 'imp-manga-frame', 'velocity', 'trn-zoom-twist', 'beat', 'ease'];
  const SUGGEST = {
    footage: { t: 'Clip sélectionné', ids: ['velocity', 'spd-ramp-drop', 'freezehit', 'spd-stutter'] },
    'précomp': { t: 'Précomp sélectionnée', ids: ['velocity', 'killhit', 'spd-freeze-flash', 'cam-fake-depth'] },
    texte: { t: 'Texte sélectionné', ids: ['pop', 'txt-subtitles', 'txt-chrome-title', 'stomp'] },
    audio: { t: 'Son sélectionné', ids: ['beat', 'marker'] },
    ajustement: { t: "Calque d'ajustement", ids: ['sty-teal-orange', 'fx-crt', 'grain', 'sty-quality-deep'] },
    forme: { t: 'Forme sélectionnée', ids: ['impact', 'tw-scale', 'imp-white-punch', 'shk-zoom-3d'] },
  };
  const presetIcon = (p) => (p.id === 'ease' ? 'curve' : p.cat);
  const qaHTML = (p, sug) => { const k = compat(p); return `<button class="qa${sug ? ' sug' : ''}${k ? ' incompat' : ''}" type="button" data-act="qa" data-id="${p.id}" title="${esc(k ? k.long : p.desc || '')}"><span class="qi">${ico(presetIcon(p))}</span><span class="qt"><b>${esc(p.name)}</b><span>${esc(k ? k.short : p.sb)}</span></span></button>`; };
  const byIds = (ids) => ids.map(byId).filter(Boolean);
  const compCardHTML = () => {
    const c = state.ctx;
    const headL = (r) => `<div class="sec-label label acc">Comp active${r || ''}</div>`;
    if (state.engine !== 'ok') return `<div class="comp-card">${headL()}<h3 class="none">${state.engine === 'loading' ? 'Connexion à After Effects…' : 'Moteur non chargé'}</h3><div class="meta">${state.engine === 'loading' ? 'Le moteur YexoFX se charge.' : 'Réglages › Recharger le moteur'}</div></div>`;
    const refresh = `<button class="ibtn" type="button" data-act="ctx-refresh" aria-label="Rafraîchir" title="Rafraîchir">${ico('refresh')}</button>`;
    if (!c || !c.comp) return `<div class="comp-card">${headL(refresh)}<h3 class="none">${c && !c.project ? 'Aucun projet ouvert' : 'Aucune comp active'}</h3><div class="hint" style="margin-top:3px">Clique dans ta timeline : YexoFX suit la comp et la sélection.</div></div>`;
    const k = c.comp, n = c.sel.length;
    const kinds = Array.from(new Set(c.sel.map((l) => l.kind)));
    const sep = '<span class="sep">·</span>';
    return `<div class="comp-card">${headL(refresh)}
      <h3 title="${esc(k.name)}">${esc(k.name)}</h3>
      <div class="meta">${k.w} × ${k.h}${sep}${fr(k.fps, k.fps % 1 ? 2 : 0)} fps${k.dur ? sep + esc(k.dur) : ''}</div>
      <div class="badges">${n ? `<span class="badge on">${n} calque${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}</span>` + kinds.map((x) => `<span class="badge">${esc(x)}</span>`).join('') : '<span class="badge">aucune sélection</span>'}</div>
      ${typeof k.layers === 'number' ? `<div class="stats"><div><b>${k.layers}</b><span>calques</span></div><div><b>${n}</b><span>sélection</span></div><div><b>${typeof k.items === 'number' ? k.items : '–'}</b><span>éléments du projet</span></div></div>` : ''}
    </div>`;
  };
  const suggestHTML = () => {
    const sel = (state.ctx && state.ctx.sel) || [];
    const s = sel.length ? SUGGEST[sel[0].kind] : null;
    const label = (r) => `<div class="sec-label label">Pour ta sélection${r ? `<span class="r">${esc(r)}</span>` : ''}</div>`;
    if (!s) return label() + `<div class="empty-row"><span class="qi">${ico('layers')}</span><span>${sel.length ? 'Aucune suggestion pour ce type de calque.' : 'Sélectionne un calque : YexoFX te propose les bons presets.'}</span></div>`;
    return label(s.t) + `<div class="qa-grid">${byIds(s.ids).map((p) => qaHTML(p, true)).join('')}</div>`;
  };
  const listOrEmpty = (list, emptyTitle, emptyText, icon) => (list.length ? `<div class="qa-grid">${list.map((p) => qaHTML(p)).join('')}</div>` : `<div class="empty-row"><span class="qi">${ico(icon)}</span><span><b>${esc(emptyTitle)}</b>${esc(emptyText)}</span></div>`);
  const styleMosaic = () => `<div class="style-mosaic">${STYLES.map((s) => `<button type="button" class="st-tile" data-act="go" data-route="style:${s.id}" title="${esc(s.desc)}"><span class="sw-row">${s.palette.map((c) => `<i style="background:${esc(c)}"></i>`).join('')}</span><b>${esc(s.short)}</b></button>`).join('')}</div>`;
  const homeHTML = () => {
    const favs = P.filter((p) => state.favs.has(p.id));
    return `<div class="home">
      <div id="homeCard">${compCardHTML()}</div>
      <div><div class="sec-label label">Actions rapides</div><div class="qa-grid">${byIds(QUICK).map((p) => qaHTML(p)).join('')}</div></div>
      <div id="homeSug">${suggestHTML()}</div>
      <div><div class="sec-label label">Styles d'edit<span class="r"><button class="lnk" type="button" data-act="go" data-route="packs">packs de style</button></span></div>${styleMosaic()}</div>
      <div id="homeRecent"><div class="sec-label label">Récents</div>${listOrEmpty(byIds(state.recent.slice(0, 6)), 'Rien pour l\'instant.', ' Les presets que tu appliques arrivent ici.', 'clock')}</div>
      <div><div class="sec-label label">Favoris${favs.length > 6 ? `<span class="r"><button class="lnk" type="button" data-act="go" data-route="fav">tout voir (${favs.length})</button></span>` : ''}</div>${listOrEmpty(favs.slice(0, 6), 'Aucun favori.', ' Survole une carte et clique ★ (ou touche F).', 'fav')}</div>
    </div>`;
  };
  const updateHome = () => {
    if (!onHome()) return;
    $('#homeCard').innerHTML = compCardHTML();
    $('#homeSug').innerHTML = suggestHTML();
    $('#homeRecent').innerHTML = `<div class="sec-label label">Récents</div>${listOrEmpty(byIds(state.recent.slice(0, 6)), 'Rien pour l\'instant.', ' Les presets que tu appliques arrivent ici.', 'clock')}`;
  };

  // ---------------------------------------------------------------- packs de style
  const packHTML = (k) => {
    const s = STYLE[k.style], slots = [['look', k.look], ['coupe', k.cut], ['beat', k.beat]].map(([l, id]) => [l, byId(id)]).filter((x) => x[1]);
    return `<article class="pack-card" data-pack="${k.id}">
      <div class="mood">${slots.map(([l, p]) => `<div class="mood-cell tile" data-id="${p.id}" style="${tileVars(p)}"><div class="pv">${YX.previews.inner(p, effCurve(p), ico('check'))}</div><span class="mood-l">${esc(l)} · ${esc(p.name)}</span></div>`).join('')}</div>
      <div class="pack-body">
        <div class="pack-top"><span class="sw-row">${s.palette.map((c) => `<i style="background:${esc(c)}"></i>`).join('')}</span><span class="label">${esc(s.name)}</span></div>
        <h3>${esc(k.name)}</h3>
        <p class="desc">${esc(k.desc)}</p>
        <div class="meta">${s.bpm[0]}–${s.bpm[1]} BPM · courbe ${esc((libCurve(s.curve) || { name: s.curve }).name)} · sons : ${esc((s.sfx || []).join(', '))}</div>
        <div class="row-btns"><button class="btn primary sm" type="button" data-act="pack-apply" data-pack="${k.id}">Appliquer le pack</button><button class="btn ghost sm" type="button" data-act="go" data-route="style:${s.id}">Voir le style</button></div>
      </div>
    </article>`;
  };
  const applyPack = async (k) => {
    if (state.engine !== 'ok') { toast('err', 'Moteur non chargé', state.engineErr || ''); return; }
    const sel = (state.ctx && state.ctx.sel) || [];
    if (sel.filter((l) => l.kind !== 'audio').length < 2) { toast('err', 'Pack ' + k.name, 'Sélectionne au moins 2 clips qui se suivent (et ta musique avec ses markers de beat si tu en as).'); return; }
    const L = byId(k.look), Cu = byId(k.cut), B = byId(k.beat);
    if ([L, Cu, B].some((p) => !p || !isReady(p))) { toast('soon', 'Pack incomplet dans ce moteur', 'Recharge le moteur après une mise à jour.'); return; }
    try {
      const sc = k.sfx ? sfxOf(k.sfx.cut, [k.style]) : null, sb = k.sfx ? sfxOf(k.sfx.beat, [k.style]) : null;
      const sfx = state.sfxAuto && (sc || sb) ? { cut: sc ? sc.file : null, beat: sb ? sb.file : null } : null;
      const r = await YX.bridge.call('applyPack', { name: k.name, look: defOf(L), cut: defOf(Cu), beat: defOf(B), sfx, params: { intensity: state.intensity / 100, curve: libCurve(STYLE[k.style].curve) || state.curve } });
      state.history.unshift({ id: k.id, name: 'Pack ' + k.name, msg: r.msg, at: new Date() });
      toast('ok', r.msg, 'Un seul Ctrl+Z annule tout le pack');
    } catch (e) { engineErr({ name: 'le pack ' + k.name }, e); }
    refreshContext();
  };

  // ---------------------------------------------------------------- pile, presets perso, collections
  const stackItemHTML = (it, i) => {
    const p = byId(it.id);
    return `<div class="st-item" data-i="${i}"><span class="qi">${ico(presetIcon(p))}</span><span class="qt"><b>${esc(p.name)}</b><span>${esc(catLabel(p.cat).toLowerCase())} · ${esc(p.sb)}</span></span>
      <button class="ibtn xs" type="button" data-act="stack-up" aria-label="Monter">${ico('up')}</button><button class="ibtn xs" type="button" data-act="stack-down" aria-label="Descendre">${ico('down')}</button><button class="ibtn xs" type="button" data-act="stack-del" aria-label="Retirer">${ico('x')}</button></div>`;
  };
  const userPresetHTML = (u, i) => `<div class="st-item" data-u="${i}"><span class="qi">${ico('stack')}</span><span class="qt"><b>${esc(u.name)}</b><span>${u.stack.length} preset(s) : ${esc(u.stack.map((s) => (byId(s.id) || { name: s.id }).name).join(' + '))}</span></span>
    <button class="mini" type="button" data-act="user-apply">Appliquer</button><button class="ibtn xs" type="button" data-act="user-export" aria-label="Exporter">${ico('save')}</button><button class="ibtn xs" type="button" data-act="user-del" aria-label="Supprimer">${ico('x')}</button></div>`;
  const stackViewHTML = () => `${catHead('Pile & perso', CAT_DESC.stack, state.stack.length + ' dans la pile')}
    <div class="settings">
      <div><div class="sec-label label">Pile en cours</div>
        ${state.stack.length ? `<div class="set-card">${state.stack.map(stackItemHTML).join('')}
          <div class="row-btns"><button class="btn primary sm" type="button" data-act="stack-apply">Appliquer la pile</button><button class="btn ghost sm" type="button" data-act="stack-clear">Vider</button></div>
          <div class="row-btns"><input class="txt-in" id="stackName" type="text" maxlength="40" placeholder="Nom (ex. Mon combo phonk)" aria-label="Nom du preset perso"><button class="btn ghost sm" type="button" data-act="stack-save">${ico('save')}Garder comme preset perso</button></div>
          <div class="hint">Tout est appliqué dans un seul undo group, dans cet ordre, avec la sélection actuelle.</div></div>`
        : `<div class="empty-row"><span class="qi">${ico('plus')}</span><span><b>Pile vide.</b> Clique + sur une carte pour combiner plusieurs presets (ex. un look + un shake + un impact).</span></div>`}
      </div>
      <div><div class="sec-label label">Mes presets perso<span class="r"><button class="lnk" type="button" data-act="user-import">importer un .json</button>${state.userPresets.length ? ' · <button class="lnk" type="button" data-act="user-export-all">tout exporter</button>' : ''}</span></div>
        ${state.userPresets.length ? `<div class="set-card">${state.userPresets.map(userPresetHTML).join('')}</div>` : `<div class="empty-row"><span class="qi">${ico('save')}</span><span><b>Aucun preset perso.</b> Enregistre une pile pour la retrouver ici, l'exporter et la partager.</span></div>`}
      </div>
    </div>`;
  const collViewHTML = () => `${catHead('Collections', CAT_DESC.coll, state.colls.length + '')}
    <div class="settings"><div class="set-card">
      ${state.colls.length ? state.colls.map((c) => `<button class="st-item lnk-row" type="button" data-act="go" data-route="coll:${c.id}"><span class="qi">${ico('coll')}</span><span class="qt"><b>${esc(c.name)}</b><span>${c.ids.length} preset(s)</span></span>${ico('chev', 'chev')}</button>`).join('') : `<div class="empty-row"><span class="qi">${ico('coll')}</span><span><b>Aucune collection.</b> Range tes presets par projet ou par vibe : « Edit Valo de juin », « Intros »…</span></div>`}
      <div class="row-btns"><button class="btn ghost sm" type="button" data-act="coll-new">${ico('plus')}Nouvelle collection</button></div>
    </div></div>`;
  const addToStack = (p) => {
    if (state.stack.some((it) => it.id === p.id)) { state.stack = state.stack.filter((it) => it.id !== p.id); toast('ok', `${p.name} retiré de la pile`, ''); }
    else { state.stack.push({ id: p.id }); toast('ok', `${p.name} ajouté à la pile`, `${state.stack.length} preset(s) · Bibliothèque > Pile & perso`, { label: 'Voir la pile', run: () => go('stack') }); }
    persist();
    renderCats();
    paintGrid(true);
  };
  const runStack = async (items, name) => {
    if (state.engine !== 'ok') { toast('err', 'Moteur non chargé', ''); return; }
    const ps = items.map((it) => byId(it.id)).filter(Boolean);
    for (const p of ps) { const k = compat(p); if (k) { toast('err', `${p.name} : ${k.short}`, k.long); return; } }
    try {
      const r = await YX.bridge.call('applyStack', { name, items: ps.map((p, i) => ({ id: p.id, def: defOf(p), params: Object.assign(paramsFor(p), items[i].params || {}) })) });
      ps.forEach((p) => { state.usage[p.id] = (state.usage[p.id] || 0) + 1; });
      state.history.unshift({ id: 'stack', name, msg: r.msg, at: new Date() });
      persist();
      toast('ok', r.msg, 'Un seul Ctrl+Z annule toute la pile');
    } catch (e) { engineErr({ name }, e); }
    refreshContext();
  };
  // fichiers (Node dans CEP, sinon téléchargement / sélecteur du navigateur)
  const saveJson = (name, obj) => {
    const txt = JSON.stringify(obj, null, 2);
    const fsApi = window.cep && window.cep.fs;
    if (fsApi && fsApi.showSaveDialogEx && YX.store.hasNode) {
      const r = fsApi.showSaveDialogEx('Exporter', '', ['json'], name);
      if (r && r.data) { try { window.require('fs').writeFileSync(r.data, txt, 'utf8'); toast('ok', 'Exporté', r.data); } catch (e) { toast('err', 'Export impossible', e.message); } }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const importUser = (txt) => {
    let o;
    try { o = JSON.parse(txt); } catch (e) { toast('err', 'Fichier illisible', 'Ce n\'est pas un JSON valide.'); return; }
    const list = (Array.isArray(o) ? o : [o]).filter((u) => u && u.yfx === 'user-preset' && Array.isArray(u.stack));
    if (!list.length) { toast('err', 'Aucun preset perso dans ce fichier', 'Format attendu : { "yfx": "user-preset", "stack": [...] }'); return; }
    let added = 0, missing = 0;
    list.forEach((u) => {
      const stack = u.stack.filter((s) => s && byId(s.id)).map((s) => ({ id: s.id, params: s.params || {} }));
      missing += u.stack.length - stack.length;
      if (!stack.length) return;
      state.userPresets.push({ yfx: 'user-preset', v: 1, id: 'user-' + Date.now().toString(36) + added, name: String(u.name || 'Preset importé').slice(0, 40), stack });
      added++;
    });
    persist();
    if (state.cat === 'stack') renderView();
    toast(added ? 'ok' : 'err', `${added} preset(s) perso importé(s)`, missing ? `${missing} preset(s) inconnu(s) ignoré(s)` : '');
  };
  const pickImport = () => {
    const fsApi = window.cep && window.cep.fs;
    if (fsApi && fsApi.showOpenDialogEx && YX.store.hasNode) {
      const r = fsApi.showOpenDialogEx(false, false, 'Importer des presets perso', '', ['json']);
      const f = r && r.data && r.data[0];
      if (f) { try { importUser(window.require('fs').readFileSync(f, 'utf8')); } catch (e) { toast('err', 'Lecture impossible', e.message); } }
      return;
    }
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) f.text().then(importUser); });
    inp.click();
  };

  // ---------------------------------------------------------------- vues
  const sizeLabel = (b) => (b > 1048576 ? fr(b / 1048576, 1) + ' Mo' : Math.max(1, Math.round(b / 1024)) + ' Ko');
  const sfxRowHTML = (s, label) => `
    <div class="sfx" data-sfx="${esc(s.id)}">
      <button class="play" type="button" data-act="play" aria-pressed="false" aria-label="Écouter ${esc(s.id)}">${ico('play')}</button>
      <div class="top"><span class="nm">${esc(s.id)}</span><span class="sb">${label ? esc(label) : esc(s.cat) + ' · ' + sizeLabel(s.size)}</span></div>
      <div class="bot"><canvas aria-hidden="true"></canvas>${label ? '' : '<button class="mini" type="button" data-act="cti">Au CTI</button><button class="mini" type="button" data-act="markers">Markers</button>'}</div>
    </div>`;

  let lastRoute = null;
  const renderView = () => {
    const view = $('#view');
    stopSfx();
    VG = null;
    let html = '', grid = null, showCat = false;
    const r = state.cat;
    if (state.q) {
      const ps = listFor(YX.search.query(state.q), true);
      const ss = state.sfx.filter((s) => YX.search.norm([s.id, s.cat, 'audio son sfx'].join(' ')).includes(YX.search.norm(state.q)));
      html += catHead('Recherche', `« ${state.q} »`, `${ps.length} preset${ps.length > 1 ? 's' : ''}`) + styleBar();
      if (ps.length) { grid = ps; showCat = true; }
      else html += emptyHTML(`Aucun preset pour « ${state.q} ».`, 'essaie : tremblement, ralenti, glitch, néon, whoosh');
      if (ss.length) html += `<div class="sec-label label" style="padding:10px 12px 0">Sons</div><div class="sfx-list">${ss.map((s) => sfxRowHTML(s)).join('')}</div>`;
    } else if (r === 'home') {
      html = homeHTML();
    } else if (r === 'settings') {
      html = settingsHTML();
    } else if (r === 'packs') {
      const packs = PACKS.filter((k) => !state.style || k.style === state.style);
      html = catHead('Packs de style', CAT_DESC.packs, packs.length + (state.style ? ' / ' + PACKS.length : '')) + styleBar(true) +
        `<div class="hint" style="padding:0 12px 8px">Sélectionne tes clips (et ta musique avec ses markers de beat), puis un pack : look sur toute la comp, une transition à chaque coupe, un impact sur chaque beat. Un seul Ctrl+Z annule tout.</div>` +
        `<div class="packs">${packs.map(packHTML).join('')}</div>`;
    } else if (r === 'stack') {
      html = stackViewHTML();
    } else if (r === 'coll') {
      html = collViewHTML();
    } else if (r.startsWith('coll:')) {
      const c = state.colls.find((x) => 'coll:' + x.id === r);
      if (!c) { state.cat = 'coll'; return renderView(); }
      const list = listFor(byIds(c.ids));
      html = catHead(c.name, 'collection', `${list.length}`) + `<div class="cat-sub"><input class="txt-in" id="collRename" type="text" maxlength="40" value="${esc(c.name)}" aria-label="Nom de la collection"><button class="mini" type="button" data-act="coll-rename">Renommer</button><button class="mini" type="button" data-act="coll-del">Supprimer</button></div>`;
      if (list.length) { grid = list; showCat = true; } else html += emptyHTML('Collection vide.', 'ouvre la fiche d\'un preset et clique « + Collection »');
    } else if (r.startsWith('style:')) {
      const s = STYLE[r.slice(6)];
      const list = YX.search.sort(P.filter((p) => p.styles.includes(s.id)), state.sort, { usage: state.usage, favs: state.favs });
      const pack = PACKS.find((k) => k.style === s.id);
      html = catHead(s.name, s.desc, `${list.length}`) +
        `<div class="style-card"><span class="sw-row">${s.palette.map((c) => `<i style="background:${esc(c)}"></i>`).join('')}</span><div class="meta">${s.bpm[0]}–${s.bpm[1]} BPM · courbe ${esc((libCurve(s.curve) || { name: s.curve }).name)} · intensité type ${Math.round(s.intensity * 100)} % · sons : ${esc((s.sfx || []).join(', '))}</div>${pack ? `<button class="mini" type="button" data-act="go" data-route="packs">Pack ${esc(pack.name)}</button>` : ''}</div>`;
      grid = list.filter(isReady).concat(list.filter((p) => !isReady(p)));
      showCat = true;
    } else if (r === 'audio') {
      const cats = ['tout'].concat(Array.from(new Set(state.sfx.map((s) => s.cat))));
      if (!cats.includes(state.sfxCat)) state.sfxCat = 'tout';
      const list = state.sfx.filter((s) => state.sfxCat === 'tout' || s.cat === state.sfxCat);
      html += catHead('Audio', CAT_DESC.audio, `${list.length} sons`);
      if (state.sfx.length) {
        html += `<div class="cat-sub">${chips('sfxCat', cats.map((c) => [c, c]))}</div>`;
        html += `<div class="sfx-list">${list.map((s) => sfxRowHTML(s)).join('')}</div>`;
      } else {
        const root = YX.store.sfxRoot();
        html += `<div class="empty">Aucun son dans ta bibliothèque pour l'instant.<span class="cmd">dépose tes sons dans sfx\\&lt;catégorie&gt;\\</span>` +
          (root ? `<div class="path" style="margin-top:10px">${esc(root)}</div><div class="row-btns" style="justify-content:center;margin-top:10px"><button class="mini" type="button" data-act="open-sfx">Ouvrir le dossier</button><button class="mini" type="button" data-act="rescan">Rafraîchir</button></div>` : '') + '</div>';
      }
    } else if (r === 'fav') {
      const list = listFor(P.filter((p) => state.favs.has(p.id)));
      html += catHead('Favoris', CAT_DESC.fav, `${list.length}`) + styleBar();
      if (list.length) { grid = list; showCat = true; } else html += emptyHTML('Aucun favori.', 'survole un preset et clique ★, ou touche F');
    } else {
      const c = CATS.find((x) => x.id === r) || EFFECT_CATS[0];
      const list = listFor(P.filter((p) => p.cat === c.id));
      html += catHead(c.label, CAT_DESC[c.id] || '', `${list.length}`) + styleBar();
      if (c.id === 'text') html += `<div class="cat-sub">${chips('dir', [['in', 'Entrée'], ['out', 'Sortie'], ['both', 'In + Out']])}${chips('by', [['car', 'lettre'], ['mot', 'mot'], ['ligne', 'ligne']])}</div>`;
      if (list.length) grid = list; else html += emptyHTML(`Aucun preset ${c.label} pour ce style.`, 'change de style ou retire les filtres');
    }
    if (grid) html += '<div class="vgrid" id="vgrid"></div>';
    view.innerHTML = html;
    $$('.sfx canvas', view).forEach((cv) => drawWave(cv, findSfx(cv.closest('.sfx').dataset.sfx)));
    if (grid) mountGrid(grid, showCat);
    syncVideos();
    renderCats();
    $('#crumb').innerHTML = crumbHTML();
    $('#dock').hidden = !state.q && (r === 'settings' || r === 'stack' || r === 'coll' || r === 'packs');
    const route = state.q ? 'q' : r;
    if (route !== lastRoute) { lastRoute = route; view.classList.remove('vin'); void view.offsetWidth; view.classList.add('vin'); }
  };

  const applyVars = () => {
    const panel = $('#panel');
    panel.style.setProperty('--k', (state.intensity / 100).toFixed(2));
    panel.style.setProperty('--ease', easeCss(state.curve));
    panel.style.setProperty('--sc', state.by === 'car' ? '55ms' : '0ms');
    panel.style.setProperty('--sw', state.by === 'mot' ? '200ms' : '0ms');
    $('#intensityV').textContent = state.intensity + ' %';
    $('#intensity').value = String(state.intensity);
    $('#intensity').style.setProperty('--p', (state.intensity / 2) + '%');
    $('#curveV').textContent = state.curve.name;
    $('#dockCurve').setAttribute('d', curveD(state.curve, 40, 26, 3, -0.3, 1.5));
  };
  const renderStatus = () => {
    const st = $('#status');
    st.className = 'st-dot ' + (state.engine === 'ok' && state.licensed ? 'ok' : state.engine === 'error' ? 'err' : 'wait');
    const nReady = P_FX.filter(isReady).length;
    st.title = (state.licensed ? 'Licence active' + (state.licName ? ' · ' + state.licName : '') : 'Licence non activée') + '\n' +
      (state.engine === 'ok' ? `Moteur v${state.info.version} · AE ${String(state.info.ae).split('x')[0]} · ${nReady} / ${P_FX.length} presets prêts` : state.engine === 'loading' ? 'Moteur : chargement…' : 'Moteur non chargé');
    const b = $('#banner');
    if (state.engine === 'error' && state.licensed) {
      b.hidden = false;
      b.innerHTML = `<span class="grow">Le moteur YexoFX ne s'est pas chargé dans After Effects. ${esc(state.engineErr || '')}</span><button class="mini" type="button" data-act="reload-engine">Recharger</button>`;
    } else {
      b.hidden = true;
    }
    renderCtx();
  };

  // Vidéos de preview : au survol seulement par défaut (préchargement à la demande), ou lecture auto si choisi.
  const syncVideos = () => {
    $$('#view video.pvv').forEach((v) => { if (state.autoplay) { v.preload = 'auto'; v.play().catch(() => {}); } else if (!v.paused) { v.pause(); v.currentTime = 0; } });
  };
  $('#view').addEventListener('mouseover', (e) => { if (state.autoplay) return; const t = e.target.closest('.tile'); const v = t && t.querySelector('video.pvv'); if (v && v.paused) { v.preload = 'auto'; v.play().catch(() => {}); } });
  $('#view').addEventListener('mouseout', (e) => { if (state.autoplay) return; const t = e.target.closest('.tile'); if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return; const v = t.querySelector('video.pvv'); if (v) { v.pause(); v.currentTime = 0; } });

  const refreshTile = (p) => {
    $$(`#view .tile[data-id="${p.id}"]`).forEach((t) => {
      t.setAttribute('style', tileVars(p));
      const d = t.querySelector('.durctl');
      if (d && p.f !== 'loop') {
        d.querySelector('span').textContent = framesOf(p) + ' f';
        d.classList.toggle('custom', !!(state.cust[p.id] && state.cust[p.id].f));
      }
      let m = t.querySelector('.mark-c');
      if (curveOf(p) && !m) { m = document.createElement('span'); m.className = 'mark-c'; m.textContent = 'courbe perso'; t.appendChild(m); }
      if (!curveOf(p) && m) m.remove();
    });
  };
  const setFrames = (p, v) => {
    if (p.f === 'loop') return;
    const f = Math.max(2, Math.min(120, Math.round(v)));
    cust(p.id).f = f === p.f ? undefined : f;
    persist();
    refreshTile(p);
    if (!$('#sheet').hidden && sheetCtx.kind === 'detail' && sheetCtx.id === p.id) syncDetail(p);
  };

  // ---------------------------------------------------------------- audio (fichiers de la bibliothèque)
  const findSfx = (id) => state.sfx.find((s) => s.id === id);
  const peaksCache = new Map();
  let actx = null, playing = null;
  const peaksOf = async (s) => {
    if (peaksCache.has(s.id)) return peaksCache.get(s.id);
    let peaks = null;
    try {
      const buf = YX.store.readFile(s.file);
      if (buf) {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const audio = await actx.decodeAudioData(ab);
        const data = audio.getChannelData(0), n = 200, per = Math.max(1, Math.floor(data.length / n));
        peaks = new Float32Array(n);
        for (let b = 0; b < n; b++) { let m = 0; for (let i = b * per; i < (b + 1) * per && i < data.length; i++) m = Math.max(m, Math.abs(data[i])); peaks[b] = m; }
      }
    } catch (e) { peaks = null; }
    peaksCache.set(s.id, peaks);
    return peaks;
  };
  const drawWave = async (canvas, s, prog) => {
    if (!canvas || !s) return;
    const peaks = await peaksOf(s);
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(40, canvas.clientWidth), h = canvas.clientHeight || 26;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const c = canvas.getContext('2d');
    if (!c) return;
    c.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const on = css.getPropertyValue('--accent').trim(), off = css.getPropertyValue('--surface-3').trim();
    const bars = Math.floor(w / 3);
    for (let b = 0; b < bars; b++) {
      const m = peaks ? peaks[Math.floor((b / bars) * peaks.length)] : 0.15;
      const bh = Math.max(1.5, m * (h - 2));
      c.fillStyle = (prog !== undefined && b / bars <= prog) ? on : off;
      c.fillRect(b * 3, (h - bh) / 2, 2, bh);
    }
  };
  const stopSfx = () => {
    if (!playing) return;
    try { playing.audio.pause(); } catch (e) { /* déjà arrêté */ }
    const { btn, s, canvas } = playing;
    playing = null;
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.innerHTML = ico('play'); }
    if (canvas) drawWave(canvas, s);
  };
  const playSfx = (s, btn, canvas) => {
    if (!s) return;
    if (playing && playing.s.id === s.id) { stopSfx(); return; }
    stopSfx();
    const audio = new Audio(s.url);
    playing = { s, audio, btn, canvas };
    if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.innerHTML = ico('stop'); }
    audio.addEventListener('ended', () => { if (playing && playing.audio === audio) stopSfx(); });
    audio.play().catch(() => { stopSfx(); toast('err', 'Lecture impossible', s.file); });
    const stepFn = () => { if (!playing || playing.audio !== audio) return; if (canvas && audio.duration) drawWave(canvas, s, audio.currentTime / audio.duration); requestAnimationFrame(stepFn); };
    requestAnimationFrame(stepFn);
  };

  // ---------------------------------------------------------------- feuilles
  let sheetCtx = { kind: null };
  const openSheet = (html, ctx) => {
    stopSfx();
    sheetCtx = ctx || { kind: null };
    const sh = $('#sheet');
    sh.innerHTML = `<div class="sheet-card" role="dialog" aria-modal="true">${html}</div>`;
    sh.hidden = false;
    const first = sh.querySelector('button');
    if (first) first.focus();
  };
  const closeSheet = () => { stopSfx(); $('#sheet').hidden = true; $('#sheet').innerHTML = ''; sheetCtx = { kind: null }; };
  const head = (label, title) => `<div class="sheet-head"><div class="grow"><div class="label">${esc(label)}</div><h3>${esc(title)}</h3></div><button class="ibtn" type="button" data-act="close" aria-label="Fermer">${ico('x')}</button></div>`;

  // Fiche d'un preset
  const openDetail = (p) => {
    const sfx = sfxFor(p);
    const loop = p.f === 'loop';
    const k = compat(p);
    const alt = p.alt ? byId(p.alt) : null;
    const meta = [
      ['Styles', p.styles.map((s) => STYLE[s] ? STYLE[s].short : s).join(', ')],
      ['Rôle', ROLES[p.role] || p.role],
      ['Perf', PERF[p.perf] || p.perf],
      ['Il faut', NEEDS[(p.needs && p.needs.sel) || 'comp'] + (p.needs && p.needs.layers3d ? ` (${p.needs.layers3d} calques)` : '') + (p.needs && p.needs.markers ? ' · markers conseillés' : '')],
    ];
    if (p.needs && p.needs.plugins && p.needs.plugins.length) meta.push(['Plugin', p.needs.plugins.join(', ')]);
    openSheet(`
      ${head(catLabel(p.cat) + (isReady(p) ? '' : ' · pas dans ce moteur'), p.name)}
      <div class="grid${state.dir === 'out' ? ' out' : ''}" style="padding:0;grid-template-columns:1fr"><div class="tile" data-id="${p.id}" id="detailTile" style="padding:0;border:0;background:none;${tileVars(p)}"><div class="pv big">${YX.previews.inner(p, effCurve(p), ico('check'))}</div></div></div>
      ${YX.previews.isIndicative(p) ? '<div class="hint">Aperçu indicatif : la vraie vidéo se génère dans Réglages > Previews vidéo.</div>' : ''}
      <p class="desc">${esc(p.desc || '')}</p>
      <div class="meta-grid">${meta.map(([a, b]) => `<span class="label">${esc(a)}</span><span>${esc(b)}</span>`).join('')}</div>
      ${k ? `<div class="warn-row">${ico('alert')}<span><b>${esc(k.short)}</b> : ${esc(k.long)}</span></div>` : ''}
      ${alt ? `<div class="hint">Rendu lourd. Alternative légère : <button class="lnk" type="button" data-act="detail-of" data-id="${alt.id}">${esc(alt.name)}</button></div>` : ''}
      <div><div class="label" style="margin-bottom:6px">Recette</div><ol class="recipe-list">${p.rx.map((r) => `<li>${esc(r)}</li>`).join('')}</ol></div>
      <div class="box">
        <div class="box-row"><span class="label grow">Durée</span>${loop ? '<span class="hint">effet continu : il dure autant que le calque</span>' : '<span class="stepper"><button type="button" data-act="d-minus" aria-label="Raccourcir">−</button><output id="dOut"></output><button type="button" data-act="d-plus" aria-label="Allonger">+</button></span>'}</div>
        ${loop ? '' : `<div class="box-row">${chips('dlen', [['0.5', 'court'], ['1', 'normal'], ['2', 'long']], '')}<span class="hint grow" id="dHint" style="text-align:right"></span></div>`}
        <div class="box-row"><span class="label grow">Intensité</span><input class="range" id="dInt" type="range" min="0" max="200" step="5" aria-label="Intensité de ce preset"><output id="dIntV"></output></div>
      </div>
      <div class="box">
        <div class="box-row"><span class="label grow">Courbe</span><svg viewBox="0 0 40 26" width="40" height="26" aria-hidden="true" style="overflow:visible"><path id="dCurve" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/></svg><span id="dCurveName" style="font:500 12px var(--font-mono)"></span></div>
        <div class="box-row"><button class="btn ghost sm" type="button" data-act="d-curve">${ico('curve')}Éditer la courbe</button><button class="btn ghost sm" type="button" data-act="d-curve-reset" id="dReset">Courbe du preset</button></div>
      </div>
      ${p.cat === 'text' ? `<div class="filters" style="padding:0">${chips('dir', [['in', 'Entrée'], ['out', 'Sortie'], ['both', 'In + Out']])}</div>` : ''}
      ${sfx ? sfxRowHTML(sfx, 'SFX suggéré') : ''}
      <div class="row-btns">
        <button class="btn primary" type="button" data-act="apply-detail" data-id="${p.id}"${isReady(p) && !k ? '' : ' disabled'}>${!isReady(p) ? 'Pas dans ce moteur' : k ? esc(k.short) : 'Appliquer'}</button>
        ${p.drive === 'marker' && p.host !== 'two' && p.host !== 'clip' ? `<button class="btn ghost" type="button" data-act="apply-beat" data-id="${p.id}"${isReady(p) ? '' : ' disabled'}>${ico('beat')}Appliquer au beat</button>` : ''}
        <button class="btn ghost" type="button" data-act="compare" data-id="${p.id}">${ico('ab')}Comparer A/B</button>
      </div>
      <div class="row-btns">
        <button class="btn ghost sm" type="button" data-act="fav-detail" data-id="${p.id}">${state.favs.has(p.id) ? '★ Retirer des favoris' : '☆ Favori'}</button>
        <button class="btn ghost sm" type="button" data-act="stack-detail" data-id="${p.id}">${ico('plus')}${state.stack.some((it) => it.id === p.id) ? 'Retirer de la pile' : 'Pile'}</button>
        <button class="btn ghost sm" type="button" data-act="coll-add" data-id="${p.id}">${ico('coll')}Collection</button>
      </div>
      ${canPv(p) ? `<button class="btn ghost sm" type="button" data-act="pv-one">${ico('play')}${YX.store.previewUrl(p.id) ? 'Regénérer la vidéo de preview' : 'Générer la vidéo de preview'}</button>` : ''}
      <div class="hint">Après coup, tout se règle dans Effect Controls : réglages YFX_${esc((p.nameEn || p.name).replace(/[^A-Za-z0-9]/g, ''))}_* (durée, intensité, courbe…). Raccourcis : Entrée applique, F met en favori.</div>`, { kind: 'detail', id: p.id });
    syncDetail(p);
    // focus sur Appliquer : Entrée applique directement
    const ab = $('#sheet [data-act="apply-detail"]');
    if (ab && !ab.disabled) ab.focus();
    const cv = $('#sheet canvas');
    if (cv && sfx) drawWave(cv, sfx);
    const di = $('#dInt');
    if (di) di.addEventListener('input', () => { cust(p.id).k = Number(di.value); persist(); syncDetail(p); });
  };
  const syncDetail = (p) => {
    const sh = $('#sheet');
    const dt = $('#detailTile', sh);
    if (dt) dt.setAttribute('style', `padding:0;border:0;background:none;${tileVars(p)}`);
    const f = framesOf(p);
    if (f !== 'loop' && $('#dOut', sh)) {
      $('#dOut', sh).textContent = f + ' f';
      const fps = (state.ctx && state.ctx.comp && state.ctx.comp.fps) || 60;
      $('#dHint', sh).textContent = `${fr(f / fps)} s à ${fr(fps, fps % 1 ? 2 : 0)} fps · défaut ${p.f} f`;
      $$('[data-dlen]', sh).forEach((b) => b.setAttribute('aria-pressed', String(Math.round(p.f * Number(b.dataset.dlen)) === f)));
    }
    const di = $('#dInt', sh);
    if (di) { di.value = String(intensityOf(p)); di.style.setProperty('--p', (intensityOf(p) / 2) + '%'); $('#dIntV', sh).textContent = intensityOf(p) + ' %' + (state.cust[p.id] && typeof state.cust[p.id].k === 'number' ? '' : ' (global)'); }
    const c = effCurve(p);
    $('#dCurve', sh).setAttribute('d', curveD(c, 40, 26, 4, -0.3, 1.5));
    $('#dCurveName', sh).textContent = c.name + (curveOf(p) ? ' (perso)' : p.defaults && p.defaults.curve ? ' (du preset)' : ' (globale)');
    $('#dReset', sh).hidden = !curveOf(p);
  };

  // Comparer A/B : deux aperçus côte à côte, B parmi les presets proches (même catégorie, un style en commun)
  const similar = (p) => {
    const same = P.filter((x) => x.id !== p.id && x.cat === p.cat && x.styles.some((s) => p.styles.includes(s)));
    return (same.length ? same : P.filter((x) => x.id !== p.id && x.cat === p.cat)).slice(0, 24);
  };
  const openCompare = (a, bId) => {
    const sims = similar(a);
    const b = (bId && byId(bId)) || sims[0];
    if (!b) { toast('soon', 'Rien à comparer', ''); return; }
    const cell = (p, l) => `<div class="ab-cell"><div class="label">${l}</div><div class="tile" data-id="${p.id}" style="padding:0;border:0;background:none;${tileVars(p)}"><div class="pv big">${YX.previews.inner(p, effCurve(p), ico('check'))}</div></div><b>${esc(p.name)}</b><span class="hint">${esc(p.sb)}</span><button class="btn ${l === 'A' ? 'primary' : 'ghost'} sm" type="button" data-act="ab-apply" data-id="${p.id}">Appliquer ${l}</button></div>`;
    openSheet(`
      ${head('comparer', `${a.name} / ${b.name}`)}
      <div class="ab">${cell(a, 'A')}${cell(b, 'B')}</div>
      <label class="ab-pick"><span class="label">B</span><select id="abPick">${sims.map((x) => `<option value="${x.id}"${x.id === b.id ? ' selected' : ''}>${esc(x.name)} · ${esc(x.sb)}</option>`).join('')}</select></label>
      <div class="hint">Les deux aperçus jouent en même temps. Choisis B parmi les presets proches (même catégorie, un style en commun).</div>
      <button class="btn ghost sm" type="button" data-act="detail-of" data-id="${a.id}">${ico('back')}Retour à la fiche</button>`, { kind: 'compare', id: a.id });
    $$('#sheet video.pvv').forEach((v) => { v.preload = 'auto'; v.play().catch(() => {}); });
    $('#abPick').addEventListener('change', (e) => openCompare(a, e.target.value));
  };

  // Filtres et tri
  const openFilters = () => {
    const tog = (key, opts) => `<div class="chips wrap" role="group">${opts.map(([v, l]) => `<button type="button" data-ftog="${key}:${esc(v)}" aria-pressed="${state.filters[key].has(v)}">${esc(l)}</button>`).join('')}</div>`;
    openSheet(`
      ${head('filtres', 'Filtrer et trier')}
      <div><div class="label" style="margin-bottom:6px">Rôle dans l'edit</div>${tog('roles', Object.entries(ROLES))}</div>
      <div><div class="label" style="margin-bottom:6px">Performances</div>${tog('perf', Object.entries(PERF))}</div>
      <div><div class="label" style="margin-bottom:6px">Ce qu'il faut sélectionner</div>${tog('needs', [['comp', 'rien'], ['any', 'rien ou calques'], ['text', 'texte'], ['av', 'clip'], ['two', '2 clips'], ['layer', 'un calque']])}</div>
      <div><div class="label" style="margin-bottom:6px">Trier par</div>${chips('sort', Object.entries(SORT_LABEL))}</div>
      <div class="row-btns"><button class="btn primary" type="button" data-act="close">Voir les presets</button><button class="btn ghost" type="button" data-act="filters-clear">Tout retirer</button></div>`, { kind: 'filters' });
  };

  // Ajouter à une collection
  const openCollAdd = (p) => {
    openSheet(`
      ${head('collections', p.name)}
      ${state.colls.length ? `<div class="set-card">${state.colls.map((c) => `<label class="set-row"><span class="t1">${esc(c.name)}</span><input type="checkbox" data-coll="${c.id}" ${c.ids.includes(p.id) ? 'checked' : ''}></label>`).join('')}</div>` : '<div class="hint">Aucune collection pour l\'instant.</div>'}
      <div class="row-btns"><input class="txt-in" id="collName" type="text" placeholder="Nouvelle collection…" aria-label="Nom de la nouvelle collection"><button class="btn ghost sm" type="button" data-act="coll-create" data-id="${p.id}">${ico('plus')}Créer</button></div>
      <button class="btn ghost sm" type="button" data-act="detail-of" data-id="${p.id}">${ico('back')}Retour à la fiche</button>`, { kind: 'colladd', id: p.id });
    $$('#sheet [data-coll]').forEach((cb) => cb.addEventListener('change', () => {
      const c = state.colls.find((x) => x.id === cb.dataset.coll);
      if (!c) return;
      c.ids = cb.checked ? Array.from(new Set(c.ids.concat(p.id))) : c.ids.filter((x) => x !== p.id);
      persist();
      toast('ok', cb.checked ? `Ajouté à « ${c.name} »` : `Retiré de « ${c.name} »`, p.name);
    }));
  };
  const newColl = (name, firstId) => {
    const nm = String(name || '').trim().slice(0, 40) || 'Collection ' + (state.colls.length + 1);
    const c = { id: Date.now().toString(36), name: nm, ids: firstId ? [firstId] : [] };
    state.colls.push(c);
    persist();
    return c;
  };

  // Historique (session) avec annulation de la dernière action
  const openHistory = () => {
    const h = state.history;
    openSheet(`
      ${head('historique', 'Applications de cette session')}
      ${h.length ? `<div class="set-card">${h.map((x, i) => `<div class="st-item" data-h="${i}"><span class="qi">${ico(i === 0 ? 'history' : 'clock')}</span><span class="qt"><b>${esc(x.name)}</b><span>${x.at.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · ${esc(x.msg || '')}</span></span>${byId(x.id) ? '<button class="mini" type="button" data-act="hist-again">Réappliquer</button>' : ''}</div>`).join('')}</div>
        <div class="row-btns"><button class="btn ghost" type="button" data-act="undo">${ico('back')}Annuler la dernière (Ctrl+Z)</button></div>
        <div class="hint">« Annuler » fait un Edit > Undo dans AE : ça annule la dernière action d'AE, donc la dernière application seulement si tu n'as rien fait d'autre depuis.</div>`
        : '<div class="empty-row"><span class="qi">' + ico('history') + '</span><span><b>Rien pour l\'instant.</b> Chaque preset appliqué arrive ici, avec la réponse du moteur.</span></div>'}`, { kind: 'history' });
  };

  // ---------------------------------------------------------------- page Réglages
  const setSec = (label, body) => `<div><div class="sec-label label">${esc(label)}</div>${body}</div>`;
  const setRow = (t1, t2, right) => `<div class="set-row"><div style="min-width:0"><div class="t1">${t1}</div>${t2 ? `<div class="t2">${t2}</div>` : ''}</div>${right}</div>`;
  const sw = (act, on, label) => `<button class="sw" type="button" role="switch" data-act="${act}" aria-checked="${on}" aria-label="${esc(label)}"></button>`;
  const settingsHTML = () => {
    const env = state.env || {};
    const nCust = Object.keys(state.cust).filter((k) => state.cust[k] && (state.cust[k].f || state.cust[k].c || typeof state.cust[k].k === 'number')).length;
    const nReady = P_FX.filter(isReady).length;
    const missingPrims = Array.from(new Set(P.flatMap((p) => (p.impl === 'native' ? [] : p.recipe.map((s) => s.p))))).filter((x) => !state.prims.has(x));
    return `<div class="settings">
      ${setSec('Catalogue', `<div class="set-card">
        ${setRow(`${nReady} / ${P_FX.length} presets prêts`, `${P.length - P_FX.length} outils · ${EFFECT_CATS.length} catégories · ${STYLES.length} styles · ${PACKS.length} packs · ${state.prims.size} primitives dans le moteur`, '')}
        ${missingPrims.length ? setRow('Primitives absentes du moteur', esc(missingPrims.join(', ')), '<button class="mini" type="button" data-act="reload-engine">Recharger</button>') : ''}
      </div>`)}
      ${setSec('Général', `<div class="set-card">
        ${setRow('Lecture auto des previews', 'sinon : au survol seulement (recommandé avec beaucoup de cartes)', sw('sw-auto', state.autoplay, 'Lecture auto'))}
        ${setRow('SFX auto avec impacts et transitions', 'place le son suggéré s\'il est dans ta bibliothèque', sw('sw-sfx', state.sfxAuto, 'SFX auto'))}
        ${setRow('Durées, courbes et intensités perso', `${nCust} preset(s) modifié(s)`, '<button class="mini" type="button" data-act="reset-cust">Tout remettre par défaut</button>')}
      </div>`)}
      ${setSec('Apparence', `<div class="set-card">
        ${setRow('Animations de l\'interface', 'réduites : plus courtes · coupées : aucune', chips('motion', [['normal', 'Normales'], ['reduced', 'Réduites'], ['off', 'Coupées']]))}
        ${setRow('Densité', 'confortable : texte un peu plus grand', chips('density', [['compact', 'Compacte'], ['comfort', 'Confortable']]))}
        ${setRow('Libellés du rail', 'noms des catégories à côté des icônes', sw('sw-rail', state.railWide, 'Libellés du rail'))}
      </div>`)}
      ${pvSection()}
      ${setSec('Bibliothèque', `<div class="set-card">
        ${setRow('Dossier assets', `<span class="path">${esc(env.assets || 'introuvable')}</span>`, '<div class="row-btns"><button class="mini" type="button" data-act="assets-pick">Changer</button><button class="mini" type="button" data-act="assets-open">Ouvrir</button></div>')}
      </div>`)}
      ${setSec('Licence', `<div class="set-card">
        ${setRow(esc(state.licName || '—'), `PC ${esc(YX.licence.machineId() || '?')}`, '<button class="mini" type="button" data-act="relock">Désactiver ce PC</button>')}
      </div>`)}
      ${setSec('Calques', `<div class="set-card"><div class="tools-grid">
        <button class="btn ghost sm" type="button" data-act="tool" data-id="tools_select_yfx">Sélectionner les YFX</button>
        <button class="btn ghost sm" type="button" data-act="tool" data-id="tools_clean">Nettoyer YFX du calque</button>
      </div></div>`)}
      ${setSec('Diagnostic', `<div class="set-card"><div class="tools-grid">
        <button class="btn primary sm" type="button" data-act="rx-test-ask">Auto-test complet</button>
        <button class="btn ghost sm" type="button" data-act="probe">Sonde des effets</button>
        <button class="btn ghost sm" type="button" data-act="autotest-ask">Auto-test v0.6</button>
        <button class="btn ghost sm" type="button" data-act="dump">Dump calque</button>
        <button class="btn ghost sm" type="button" data-act="effects">Liste des effets</button>
        <button class="btn ghost sm" type="button" data-act="log">Ouvrir le log</button>
        <button class="btn ghost sm" type="button" data-act="reload-engine">Recharger le moteur</button>
        <button class="btn ghost sm" type="button" data-act="reload-panel">Recharger le panel</button>
      </div></div>`)}
      <div class="hint">Panel v1.0 · moteur ${esc(state.info ? state.info.version + ' (build ' + state.info.build + ')' : 'non chargé')} · AE ${esc(state.info ? state.info.ae : '?')} · expressions ${esc(state.info ? state.info.engine : '?')}${env.thirdParty && env.thirdParty.length ? ' · tiers : ' + esc(env.thirdParty.join(', ')) : ''}</div>
    </div>`;
  };
  const openSettings = () => go('settings');
  const refreshSettings = () => { if (!state.q && state.cat === 'settings') { const top = $('#scroll').scrollTop; renderView(); $('#scroll').scrollTop = top; } };
  const applyUi = () => {
    const root = document.documentElement;
    root.setAttribute('data-motion', state.motion);
    root.setAttribute('data-density', state.density);
    $('#panel').classList.toggle('wide', state.railWide);
    const b = $('#btnRail');
    const lbl = state.railWide ? 'Masquer les libellés' : 'Afficher les libellés';
    b.innerHTML = railInner('rail', state.railWide ? 'Réduire' : 'Libellés');
    b.title = lbl;
    b.setAttribute('aria-label', lbl);
  };

  // ---------------------------------------------------------------- tâches longues (previews, auto-test) : fenêtre de progression
  const progressSheet = (label, title, info) => openSheet(`
    <div class="sheet-head"><div class="grow"><div class="label">${esc(label)}</div><h3 id="pvTitle">${esc(title)}</h3></div></div>
    <div class="pv-prog">
      <div class="pv-bar"><i id="pvBar"></i></div>
      <div class="pv-now"><span class="grow" id="pvNow">Préparation…</span><span id="pvCount"></span></div>
      <div class="hint" id="pvInfo">${esc(info)}</div>
      <ul class="pv-errs" id="pvErrs"></ul>
    </div>
    <div class="row-btns" id="pvBtns"><button class="btn ghost" type="button" data-act="long-stop">Arrêter après celui-ci</button></div>`, { kind: 'long' });

  // ---------------------------------------------------------------- vidéos de preview (rendues dans AE)
  const canPv = (p) => YX.pvgen.available && state.engine === 'ok' && isReady(p) && !p.tool && p.preview && p.preview.kind !== 'none';
  const pvList = () => YX.pvgen.eligible(P, isReady);
  const pvMissing = () => pvList().filter((p) => !YX.store.previewUrl(p.id));
  const fmtDur = (ms) => (ms < 60000 ? Math.max(1, Math.round(ms / 1000)) + ' s' : ms < 3600000 ? Math.round(ms / 60000) + ' min' : fr(ms / 3600000, 1) + ' h');
  const pvSection = () => {
    if (!YX.pvgen.available || state.engine !== 'ok') return '';
    const list = pvList(), miss = pvMissing().length, ff = YX.pvgen.ffmpeg(), mine = ff ? YX.pvgen.userVideos() : [];
    return setSec('Previews vidéo', `<div class="set-card">
      ${setRow(`${list.length - miss} / ${list.length} presets ont leur vidéo`, ff ? `compression ffmpeg · WebM VP9 ${YX.pvgen.size[0]}×${YX.pvgen.size[1]} + image WebP` : 'ffmpeg introuvable : rendus gardés en MP4, plus lourds', '<button class="mini" type="button" data-act="pv-open">Ouvrir</button>')}
      <div class="tools-grid">
        <button class="btn ${miss ? 'primary' : 'ghost'} sm" type="button" data-act="pv-ask" data-scope="missing"${miss ? '' : ' disabled'}>${miss ? `Générer les manquantes (${miss})` : 'Aucune manquante'}</button>
        <button class="btn ghost sm" type="button" data-act="pv-ask" data-scope="all">Tout regénérer</button>
        ${mine.length ? `<button class="btn ghost sm" type="button" data-act="pv-convert">Convertir tes vidéos (${mine.length})</button>` : ''}
      </div>
      <div class="hint">Par lots : la génération reprend là où elle s'est arrêtée (seules les manquantes sont refaites).</div></div>`);
  };
  const openPvConfirm = async (list, title) => {
    if (!list.length) { toast('ok', 'Toutes les previews sont déjà là', ''); return; }
    let info;
    try { info = await YX.bridge.call('pvInfo'); } catch (e) { toast('err', 'Previews', e.message); return; }
    const ff = YX.pvgen.ffmpeg(), n = list.length;
    const lots = [25, 50, 100].filter((x) => x < n);
    openSheet(`
      ${head('previews vidéo', title || `Générer ${n} preview${n > 1 ? 's' : ''} ?`)}
      <p class="desc">Pour chaque preset, AE crée une comp de démo, applique le preset, la rend puis la supprime. Compte environ <b>${fmtDur(n * 6000)}</b> pour tout : AE est bloqué pendant chaque rendu, tu peux arrêter entre deux et reprendre plus tard.</p>
      <div class="box">
        <div class="box-row"><span class="label grow">Lot</span>${chips('pvlot', lots.map((x) => [String(x), String(x)]).concat([['all', `tout (${n})`]]), sheetCtx.pvlot || (lots[1] ? String(lots[1]) : 'all'))}</div>
        <div class="box-row"><span class="label grow">Source</span><span class="hint">${info.source ? esc(info.source) : 'scène de démo YexoFX'}</span></div>
        <div class="hint">${info.source ? 'Le moment du CTI devient le kill de chaque preview (plan suivant : 1,5 s plus loin).' : 'Pour utiliser ton clip : sélectionne-le dans ta comp, place le CTI sur le kill, puis relance.'}</div>
        <div class="box-row"><span class="label grow">Compression</span><span class="hint">${ff ? `WebM ${YX.pvgen.size[0]}×${YX.pvgen.size[1]} + WebP avec ffmpeg` : 'aucune : ffmpeg introuvable'}</span></div>
        ${info.queued ? `<div class="hint">Tes ${info.queued} rendu(s) en file d'attente sont mis de côté pendant la génération, puis remis.</div>` : ''}
      </div>
      <div class="row-btns"><button class="btn primary" type="button" data-act="pv-run">Lancer</button><button class="btn ghost" type="button" data-act="close">Annuler</button></div>`, { kind: 'pv-confirm', list: list.map((p) => p.id), pvlot: lots[1] ? String(lots[1]) : 'all' });
  };
  const runPreviews = async (ids) => {
    const list = ids.map(byId).filter(Boolean);
    $$('video.pvv').forEach((v) => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ } });
    progressSheet('previews vidéo', 'Génération en cours…', 'AE peut ne plus répondre pendant chaque rendu : c\'est normal.');
    longRun = { kind: 'pv' };
    const upd = (ph, st) => {
      if (!$('#pvBar')) return;
      $('#pvBar').style.width = (st.n ? Math.round((st.done / st.n) * 100) : 100) + '%';
      $('#pvCount').textContent = `${st.done} / ${st.n}`;
      if (st.cur) $('#pvNow').textContent = 'Rendu : ' + st.cur.name;
      else if (ph !== 'begin') $('#pvNow').textContent = 'Compression des dernières vidéos…';
      const avg = st.rendered ? st.renderMs / st.rendered : 0, left = st.n - st.done;
      $('#pvInfo').textContent = 'Source : ' + (st.source || 'scène de démo') + (avg && left > 0 && !st.stop ? ` · reste ≈ ${fmtDur(avg * left)}` : '') + (st.stop ? ' · arrêt demandé' : '');
      $('#pvErrs').innerHTML = st.errors.map((e) => `<li><b>${esc(e.name)}</b>${esc(e.msg)}</li>`).join('');
    };
    let st = null, err = null;
    try { st = await YX.pvgen.run(list, upd, defOf); } catch (e) { err = e; }
    longRun = null;
    renderView();
    refreshContext();
    if (!$('#pvTitle')) return;
    if (err) {
      $('#pvTitle').textContent = 'Génération impossible';
      $('#pvNow').textContent = err.message;
      toast('err', 'Previews : génération impossible', err.message);
    } else {
      const nErr = st.errors.length;
      $('#pvTitle').textContent = st.stop ? 'Génération arrêtée' : 'Previews prêtes';
      if (!st.stop) $('#pvBar').style.width = '100%';
      $('#pvNow').textContent = `${st.ok} vidéo${st.ok > 1 ? 's' : ''} générée${st.ok > 1 ? 's' : ''}` + (nErr ? ` · ${nErr} erreur${nErr > 1 ? 's' : ''}` : '');
      $('#pvInfo').textContent = nErr ? 'Les presets en erreur gardent leur aperçu indicatif. Envoie-moi la liste ci-dessous.' : 'Elles sont déjà dans les cartes. Relance pour le lot suivant.';
      toast(nErr ? 'err' : 'ok', `${st.ok} preview${st.ok > 1 ? 's' : ''} générée${st.ok > 1 ? 's' : ''}`, nErr ? `${nErr} erreur(s) : voir la fenêtre` : (YX.store.previewDir(true) || ''));
    }
    $('#pvBtns').innerHTML = '<button class="btn primary" type="button" data-act="close">Fermer</button>';
  };
  const convertMine = async () => {
    const mine = YX.pvgen.userVideos();
    if (!mine.length) return;
    closeSheet();
    $$('video.pvv').forEach((v) => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ } });
    toast('soon', `Conversion de ${mine.length} vidéo(s)…`, `WebM ${YX.pvgen.size[0]}×${YX.pvgen.size[1]}, tes originaux sont gardés`);
    const st = await YX.pvgen.convertUser(mine);
    renderView();
    toast(st.errors.length ? 'err' : 'ok', `${st.ok} vidéo(s) convertie(s)`, st.errors.map((e) => e.name + ' : ' + e.msg).join(' · '));
  };

  // ---------------------------------------------------------------- auto-test complet (chaque preset, piloté par le panel)
  const openRxTestConfirm = () => {
    const n = P.filter((p) => isReady(p) && !p.tool).length;
    openSheet(`
      ${head('diagnostic', 'Lancer l\'auto-test complet ?')}
      <p class="desc">Il crée une comp <b>YFX_TEST</b> dans le projet courant et applique les <b>${n} presets</b> un par un sur des copies (texte, clips, solide), puis vérifie toutes les expressions. Compte quelques minutes. Lance-le dans un <b>projet vide</b>, puis envoie-moi le rapport (il s'ouvre à la fin).</p>
      <div class="row-btns"><button class="btn primary" type="button" data-act="rx-test-run">Lancer</button><button class="btn ghost" type="button" data-act="close">Annuler</button></div>`, { kind: 'confirm' });
  };
  const runRxTest = async () => {
    const list = P.filter((p) => isReady(p) && !p.tool);
    progressSheet('auto-test complet', 'Auto-test en cours…', 'AE peut figer un instant à chaque preset.');
    longRun = { kind: 'rx', stop: false };
    const fails = [];
    let done = 0;
    try {
      await YX.bridge.call('rxTestBegin');
      for (const p of list) {
        if (longRun.stop) break;
        if ($('#pvNow')) $('#pvNow').textContent = 'Test : ' + p.name;
        let r;
        try { r = await YX.bridge.call('rxTest', { def: Object.assign(defOf(p), { name: p.name, tool: !!p.tool, host: p.host, needs: p.needs }), params: paramsFor(p) }); } catch (e) { r = { ok: false, errs: [e.message] }; if (e.engine) longRun.stop = true; }
        if (r && r.ok === false) fails.push({ name: p.name, msg: (r.errs || []).slice(0, 2).join(' · ') });
        done++;
        if ($('#pvBar')) { $('#pvBar').style.width = Math.round((done / list.length) * 100) + '%'; $('#pvCount').textContent = `${done} / ${list.length}`; $('#pvErrs').innerHTML = fails.slice(-20).map((e) => `<li><b>${esc(e.name)}</b>${esc(e.msg)}</li>`).join(''); }
      }
      const end = await YX.bridge.call('rxTestEnd');
      if ($('#pvTitle')) {
        $('#pvTitle').textContent = longRun.stop ? 'Auto-test arrêté' : 'Auto-test terminé';
        $('#pvNow').textContent = `${done - fails.length} OK · ${fails.length} échec(s)`;
        $('#pvInfo').textContent = end && end.path ? 'Rapport : ' + end.path : 'Rapport écrit dans %APPDATA%\\YexoFX.';
      }
      toast(fails.length ? 'err' : 'ok', `Auto-test : ${done - fails.length} OK, ${fails.length} échec(s)`, end && end.path ? end.path : '');
    } catch (e) {
      toast('err', 'Auto-test impossible', e.message);
    }
    longRun = null;
    if ($('#pvBtns')) $('#pvBtns').innerHTML = '<button class="btn primary" type="button" data-act="close">Fermer</button>';
    refreshContext();
  };
  const openAutotestConfirm = () => {
    openSheet(`
      ${head('diagnostic', 'Lancer l\'auto-test v0.6 ?')}
      <p class="desc">Teste le moteur et les 73 presets v0.6 dans une comp <b>YFX_TEST</b>. Pour tout le catalogue, utilise plutôt l'auto-test complet.</p>
      <div class="row-btns"><button class="btn primary" type="button" data-act="autotest-run">Lancer</button><button class="btn ghost" type="button" data-act="close">Annuler</button></div>`, { kind: 'confirm' });
  };

  // ---------------------------------------------------------------- éditeur de courbe (façon Flow)
  const GX0 = 34, GX1 = 196, GY0 = 196, GY1 = 24, VMIN = -0.6, VMAX = 1.6;
  const gx = (t) => GX0 + t * (GX1 - GX0);
  const gy = (v) => GY0 - ((v - VMIN) / (VMAX - VMIN)) * (GY0 - GY1);
  const ce = { b: [0.34, 1.56, 0.64, 1], name: 'Back', special: false, target: 'global', baseId: 'back', dirty: false };
  const openCurve = (target) => {
    const p = byId(target);
    const start = p ? effCurve(p) : state.curve;
    Object.assign(ce, { b: start.b.slice(), name: start.name, special: !!start.special, target, baseId: start.id, dirty: false });
    const title = target === 'global' ? 'Courbe par défaut' : target === 'keys' ? 'Courbe pour tes keyframes' : `Courbe de ${p.name}`;
    const useLabel = target === 'global' ? 'Utiliser par défaut' : target === 'keys' ? 'Appliquer aux keyframes sélectionnées' : `Utiliser pour ${p.name}`;
    openSheet(`
      ${head('éditeur de courbe', title)}
      <svg class="ce-graph" id="ceSvg" viewBox="0 0 220 220" role="img" aria-label="Courbe d'easing éditable">
        <rect class="zone" x="${GX0}" y="${GY1}" width="${GX1 - GX0}" height="${gy(1) - GY1}"/>
        <rect class="zone" x="${GX0}" y="${gy(0)}" width="${GX1 - GX0}" height="${GY0 - gy(0)}"/>
        ${[0.25, 0.5, 0.75].map((t) => `<line class="g" x1="${gx(t)}" y1="${GY1}" x2="${gx(t)}" y2="${GY0}"/>`).join('')}
        <line class="g strong" x1="${GX0}" y1="${gy(0)}" x2="${GX1}" y2="${gy(0)}"/><line class="g strong" x1="${GX0}" y1="${gy(1)}" x2="${GX1}" y2="${gy(1)}"/>
        <line class="g strong" x1="${GX0}" y1="${GY1}" x2="${GX0}" y2="${GY0}"/><line class="g strong" x1="${GX1}" y1="${GY1}" x2="${GX1}" y2="${GY0}"/>
        <path class="ref" d="M${gx(0)} ${gy(0)} L${gx(1)} ${gy(1)}"/>
        <text x="${GX0 - 6}" y="${gy(1) + 3}" text-anchor="end">1</text><text x="${GX0 - 6}" y="${gy(0) + 3}" text-anchor="end">0</text>
        <text x="${GX0 + 4}" y="${GY1 + 10}">DÉPASSEMENT</text><text x="${GX1 - 4}" y="${GY0 + 14}" text-anchor="end">TEMPS →</text>
        <line class="arm" id="ceA1"/><line class="arm" id="ceA2"/>
        <path class="crv" id="ceCrv"/>
        <circle class="end" cx="${gx(0)}" cy="${gy(0)}" r="3.5"/><circle class="end" cx="${gx(1)}" cy="${gy(1)}" r="3.5"/>
        <g id="ceH1"><circle class="hdl-hit" r="14"/><circle class="hdl" r="6.5" tabindex="0" data-h="1" aria-label="Poignée 1 : flèches pour déplacer"/></g>
        <g id="ceH2"><circle class="hdl-hit" r="14"/><circle class="hdl" r="6.5" tabindex="0" data-h="2" aria-label="Poignée 2 : flèches pour déplacer"/></g>
      </svg>
      <div class="hint" id="ceNote" style="text-align:center"></div>
      <div class="ce-read"><code id="ceCode"></code><button class="mini" type="button" data-act="ce-copy">Copier</button></div>
      <div class="ce-demos" id="ceDemos"><div class="ce-track"><i class="ce-ball"></i></div><div class="ce-sq"><i></i></div></div>
      <div><div class="label" style="margin-bottom:6px">Bibliothèque</div><div class="ce-lib" id="ceLib"></div></div>
      <div class="row-btns"><button class="btn primary" type="button" data-act="ce-use">${esc(useLabel)}</button><button class="btn ghost" type="button" data-act="ce-save">Enregistrer</button></div>
      ${p ? `<button class="btn ghost sm" type="button" data-act="detail-of" data-id="${p.id}">${ico('back')}Retour à la fiche</button>` : ''}
      <div class="hint">${target === 'keys' ? 'Sélectionne au moins 2 keyframes qui se suivent dans la timeline, puis applique : la courbe est convertie en vitesse + influence, comme Flow.' : 'Même format que cubic-bezier.com et Flow. La courbe est appliquée à l\'expression du preset (réglages CourbeP1 / P2 sur le calque).'}</div>`, { kind: 'curve', target });
    renderCeLib();
    drawCe();
    bindCeDrag();
  };
  const renderCeLib = () => {
    const all = CURVE_LIB.concat(state.myCurves);
    $('#ceLib').innerHTML = all.map((c) => `<button type="button" data-cid="${esc(c.id)}" aria-pressed="${!ce.dirty && ce.baseId === c.id}"><svg viewBox="0 0 44 28" aria-hidden="true"><path d="${curveD(c, 44, 28, 4, -0.6, 1.6)}"/></svg><span>${esc(c.name)}</span></button>`).join('');
  };
  const drawCe = () => {
    const [x1, y1, x2, y2] = ce.b;
    if (!$('#ceSvg')) return;
    let d = `M${gx(0)} ${gy(0)} C${gx(x1)} ${gy(y1)} ${gx(x2)} ${gy(y2)} ${gx(1)} ${gy(1)}`;
    if (ce.special) { d = ''; for (let i = 0; i <= 60; i++) { const t = i / 60; d += (i ? 'L' : 'M') + gx(t).toFixed(1) + ' ' + gy(elasticF(t)).toFixed(1); } }
    $('#ceCrv').setAttribute('d', d);
    const setL = (id, ax, ay, bx, by) => { const l = $(id); l.setAttribute('x1', ax); l.setAttribute('y1', ay); l.setAttribute('x2', bx); l.setAttribute('y2', by); };
    setL('#ceA1', gx(0), gy(0), gx(x1), gy(y1));
    setL('#ceA2', gx(1), gy(1), gx(x2), gy(y2));
    $('#ceH1').setAttribute('transform', `translate(${gx(x1)} ${gy(y1)})`);
    $('#ceH2').setAttribute('transform', `translate(${gx(x2)} ${gy(y2)})`);
    [$('#ceH1'), $('#ceH2'), $('#ceA1'), $('#ceA2')].forEach((el) => { el.style.display = ce.special ? 'none' : ''; });
    $('#ceCode').textContent = ce.special ? "elastic (expression) · rebond calculé, pas de poignées" : easeCss({ b: ce.b });
    $('#ceNote').textContent = ce.special ? 'Elastic ne tient pas dans une bézier : courbe spéciale, non éditable.' : (ce.dirty ? 'Courbe modifiée · tire les poignées, ou flèches au clavier (Maj : ×5)' : `${ce.name} · tire les poignées pour l'ajuster`);
    $('#ceDemos').style.setProperty('--ce', easeCss({ b: ce.b }));
  };
  const markDirty = () => { if (!ce.dirty) { ce.dirty = true; ce.name = 'Perso'; ce.special = false; renderCeLib(); } };
  const bindCeDrag = () => {
    const sv = $('#ceSvg');
    let drag = 0;
    const toVal = (e) => {
      const pt = sv.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(sv.getScreenCTM().inverse());
      const t = Math.max(0, Math.min(1, (q.x - GX0) / (GX1 - GX0)));
      const v = Math.max(VMIN, Math.min(VMAX, VMIN + ((GY0 - q.y) / (GY0 - GY1)) * (VMAX - VMIN)));
      return [Math.round(t * 100) / 100, Math.round(v * 100) / 100];
    };
    sv.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('#ceH1, #ceH2');
      if (!g || ce.special) return;
      drag = g.id === 'ceH1' ? 1 : 2;
      sv.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    sv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const [t, v] = toVal(e);
      if (drag === 1) { ce.b[0] = t; ce.b[1] = v; } else { ce.b[2] = t; ce.b[3] = v; }
      markDirty();
      drawCe();
    });
    const end = () => { drag = 0; };
    sv.addEventListener('pointerup', end);
    sv.addEventListener('pointercancel', end);
    sv.addEventListener('keydown', (e) => {
      const h = e.target.dataset && e.target.dataset.h;
      if (!h || ce.special) return;
      const stp = e.shiftKey ? 0.05 : 0.01;
      const i = h === '1' ? 0 : 2;
      const moves = { ArrowLeft: [-stp, 0], ArrowRight: [stp, 0], ArrowUp: [0, stp], ArrowDown: [0, -stp] }[e.key];
      if (!moves) return;
      e.preventDefault();
      ce.b[i] = Math.max(0, Math.min(1, Math.round((ce.b[i] + moves[0]) * 100) / 100));
      ce.b[i + 1] = Math.max(VMIN, Math.min(VMAX, Math.round((ce.b[i + 1] + moves[1]) * 100) / 100));
      markDirty();
      drawCe();
    });
  };
  const ceCurveObj = () => (ce.dirty ? { id: 'perso', name: 'Perso', b: ce.b.slice() } : (CURVE_LIB.concat(state.myCurves).find((c) => c.id === ce.baseId) || { id: 'perso', name: ce.name, b: ce.b.slice() }));

  // Copie (le presse-papiers moderne est souvent bloqué dans CEP : repli sur execCommand).
  const copyText = (txt) => {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  };

  // ---------------------------------------------------------------- outils (moteur)
  const runTool = async (cmd, okTitle) => {
    try {
      const r = await YX.bridge.call(cmd);
      toast('ok', okTitle, r && r.path ? r.path : (r && r.text ? 'écriture de fichiers désactivée : voir le README' : ''));
      return r;
    } catch (e) { toast('err', e.user ? e.message : 'Échec : ' + okTitle, e.user ? '' : e.message); return null; }
  };
  const pickAssets = () => {
    const fsApi = window.cep && window.cep.fs;
    if (!fsApi || !fsApi.showOpenDialogEx) { toast('err', 'Sélecteur de dossier indisponible', 'Uniquement dans After Effects.'); return; }
    const r = fsApi.showOpenDialogEx(false, true, 'Choisis ton dossier YexoFX_assets', state.env && state.env.assets ? state.env.assets : '');
    const dir = r && r.data && r.data[0];
    if (!dir) return;
    YX.bridge.call('setAssets', { path: dir }).then((res) => {
      state.env = Object.assign({}, state.env, { assets: res.assets });
      YX.store.setAssets(res.assets);
      state.sfx = YX.store.listSfx();
      refreshSettings();
      toast('ok', 'Dossier assets mis à jour', res.assets || dir);
    }).catch((e) => toast('err', 'Dossier non enregistré', e.message));
  };

  // ---------------------------------------------------------------- événements
  $('#cats').addEventListener('click', (e) => { const b = e.target.closest('button[data-cat]'); if (b) go(b.dataset.cat); });
  $('#btnHome').addEventListener('click', () => go('home'));
  $('#btnRail').addEventListener('click', () => { state.railWide = !state.railWide; persist(); applyUi(); refreshSettings(); setTimeout(layoutGrid, 220); });
  $('#btnHistory').addEventListener('click', openHistory);

  // ---------------------------------------------------------------- palette de commandes (Ctrl+K) : recherche floue
  let palItems = [], palSel = 0;
  const palGo = [{ icon: 'home', label: 'Accueil', route: 'home' }].concat(CATS.map((c) => ({ icon: c.id, label: c.label, route: c.id })), [{ icon: 'gear', label: 'Réglages', route: 'settings' }]);
  const palActions = () => [
    { icon: 'curve', label: 'Courbe par défaut', sub: 'éditeur de courbe', run: () => openCurve('global') },
    { icon: 'curve', label: 'Courbe de tes keyframes', sub: 'appliquer aux keys sélectionnées', run: () => openCurve('keys') },
    { icon: 'history', label: 'Historique', sub: 'applications de la session, annuler', run: () => openHistory() },
    { icon: 'filter', label: 'Filtres et tri', sub: 'rôle, perf, sélection, tri', run: () => openFilters() },
    { icon: 'play', label: state.autoplay ? 'Previews au survol seulement' : 'Previews en lecture auto', sub: 'lecture des cartes', run: () => toggleAuto() },
    { icon: 'rail', label: state.railWide ? 'Masquer les libellés du rail' : 'Afficher les libellés du rail', sub: 'apparence', run: () => { state.railWide = !state.railWide; persist(); applyUi(); } },
    { icon: 'refresh', label: 'Recharger le moteur', sub: 'diagnostic', run: () => initEngine(true) },
  ];
  const palGroups = (q) => {
    const n = YX.search.norm(q);
    const hit = (s) => n.split(' ').every((t) => YX.search.norm(s).includes(t));
    const presetItem = (p) => ({ icon: presetIcon(p), label: p.name, sub: catLabel(p.cat) + ' · ' + p.sb, hk: compat(p) ? compat(p).short : 'appliquer', run: () => apply(p, $(`#view .tile[data-id="${p.id}"]`)) });
    const goItem = (g) => ({ icon: g.icon, label: g.label, sub: 'aller à', hk: 'ouvrir', run: () => go(g.route) });
    const actItem = (a) => Object.assign({ hk: 'lancer' }, a);
    if (!n) {
      return [
        { t: 'Récents', items: byIds(state.recent.slice(0, 4)).map(presetItem) },
        { t: 'Aller à', items: palGo.map(goItem) },
        { t: 'Actions', items: palActions().map(actItem) },
      ];
    }
    // la palette cherche dans tout le catalogue (sans le style ni les filtres de la grille)
    const all = YX.search.query(q), ps = all.filter(isReady).concat(all.filter((p) => !isReady(p)));
    const styl = STYLES.filter((s) => hit(s.name + ' ' + s.id));
    return [
      { t: 'Presets', items: ps.slice(0, 30).map(presetItem) },
      { t: 'Styles', items: styl.map((s) => ({ icon: 'styles', label: s.name, sub: 'tous les presets de ce style', hk: 'ouvrir', run: () => go('style:' + s.id) })) },
      { t: 'Packs', items: PACKS.filter((k) => hit(k.name + ' ' + k.style)).map((k) => ({ icon: 'packs', label: 'Pack ' + k.name, sub: STYLE[k.style].name, hk: 'voir', run: () => { state.style = k.style; go('packs'); } })) },
      { t: 'Sons', items: state.sfx.filter((s) => hit([s.id, s.cat, 'audio son sfx'].join(' '))).slice(0, 12).map((s) => ({ icon: 'audio', label: s.id, sub: s.cat + ' · posé au CTI', hk: 'poser', run: () => placeSfx(s, 'cti') })) },
      { t: 'Aller à', items: palGo.filter((g) => hit(g.label)).map(goItem) },
      { t: 'Actions', items: palActions().filter((a) => hit(a.label + ' ' + a.sub)).map(actItem) },
    ];
  };
  const renderPal = () => {
    const q = $('#q').value.trim();
    const groups = palGroups(q).filter((g) => g.items.length);
    palItems = [];
    let html = '';
    groups.forEach((g) => {
      html += `<div class="pal-grp label">${esc(g.t)}</div>`;
      g.items.forEach((it) => {
        const i = palItems.push(it) - 1;
        html += `<button class="pal-it" type="button" role="option" data-i="${i}" aria-selected="${i === palSel}"><span class="qi">${ico(it.icon)}</span><span class="tx"><b>${esc(it.label)}</b><span>${esc(it.sub || '')}</span></span><span class="hk">${esc(it.hk || '')} ↵</span></button>`;
      });
    });
    $('#palList').innerHTML = html || `<div class="pal-none">Rien pour « ${esc(q)} ».<br>Essaie : tremblement, ralenti, néon, glitch</div>`;
  };
  const palMove = (d) => {
    if (!palItems.length) return;
    palSel = (palSel + d + palItems.length) % palItems.length;
    $$('#palList .pal-it').forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.i) === palSel)));
    const cur = $(`#palList .pal-it[data-i="${palSel}"]`);
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  };
  const palOpen = () => !$('#pal').hidden;
  const openPal = () => {
    if (!state.licensed || !$('#sheet').hidden) return;
    $('#pal').hidden = false;
    $('#q').value = '';
    palSel = 0;
    renderPal();
    setTimeout(() => $('#q').focus(), 0);
  };
  const closePal = () => { $('#pal').hidden = true; };
  const runPal = (i) => { const it = palItems[i]; if (!it) return; closePal(); it.run(); };
  const showSearch = (q) => { closePal(); state.q = q; renderView(); $('#scroll').scrollTop = 0; layoutGrid(); };
  $('#q').addEventListener('input', () => { palSel = 0; renderPal(); });
  $('#q').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); const q = $('#q').value.trim(); if (e.shiftKey && q) showSearch(q); else runPal(palSel); }
  });
  $('#palList').addEventListener('click', (e) => { const b = e.target.closest('.pal-it'); if (b) runPal(Number(b.dataset.i)); });
  $('#palList').addEventListener('mousemove', (e) => { const b = e.target.closest('.pal-it'); if (b && Number(b.dataset.i) !== palSel) { palSel = Number(b.dataset.i); palMove(0); } });
  $('#pal').addEventListener('click', (e) => { if (e.target === $('#pal')) closePal(); });
  $('#btnSearch').addEventListener('click', openPal);

  // Raccourcis : / ou Ctrl+K recherche, Échap ferme, Entrée applique (carte qui a le focus), F met en favori (carte survolée ou focus).
  let hoverTile = null;
  $('#view').addEventListener('mouseover', (e) => { hoverTile = e.target.closest('.tile.card'); });
  $('#view').addEventListener('mouseleave', () => { hoverTile = null; });
  const toggleFav = (id) => { if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id); persist(); };
  document.addEventListener('keydown', (e) => {
    const ae = document.activeElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.id !== 'q';
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (palOpen()) closePal(); else openPal(); return; }
    if (e.key === '/' && state.licensed && !typing && !palOpen()) { e.preventDefault(); openPal(); return; }
    if (e.key === 'Escape') {
      if (palOpen()) { closePal(); return; }
      if (!$('#sheet').hidden && !longRun) closeSheet();
      return;
    }
    if (typing || palOpen()) return;
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
      const t = (ae && ae.closest && ae.closest('.tile.card')) || hoverTile;
      const p = t ? byId(t.dataset.id) : (sheetCtx.kind === 'detail' ? byId(sheetCtx.id) : null);
      if (!p) return;
      e.preventDefault();
      toggleFav(p.id);
      toast('ok', state.favs.has(p.id) ? `${p.name} épinglé aux favoris` : `${p.name} retiré des favoris`, '');
      renderCats();
      if (state.cat === 'fav' && !state.q) renderView(); else paintGrid(true);
      return;
    }
    if (e.key === 'Enter' && sheetCtx.kind === 'detail' && !(ae && ae.closest && ae.closest('#sheet button'))) {
      const p = byId(sheetCtx.id);
      if (p) { e.preventDefault(); closeSheet(); apply(p, null); }
    }
  });
  // Dans AE, demande à recevoir Ctrl+K, /, Échap, Entrée et F quand le panel a le focus.
  try {
    if (window.__adobe_cep__ && window.__adobe_cep__.registerKeyEventsInterest) {
      window.__adobe_cep__.registerKeyEventsInterest(JSON.stringify([{ keyCode: 75, ctrlKey: true }, { keyCode: 191 }, { keyCode: 27 }, { keyCode: 13 }, { keyCode: 70 }]));
    }
  } catch (e) { /* hors AE */ }

  $('#panel').addEventListener('click', (e) => {
    const el = e.target.closest('[data-act], [data-dir], [data-by], [data-sfxcat], [data-style], [data-dlen], [data-cid], [data-motion], [data-density], [data-sort], [data-ftog], [data-pvlot]');
    if (!el || el.disabled || el.closest('#pal')) return;
    const inSheet = !!el.closest('#sheet');
    if (el.dataset.motion || el.dataset.density) {
      if (el.dataset.motion) state.motion = el.dataset.motion; else state.density = el.dataset.density;
      persist();
      applyUi();
      const key = el.dataset.motion ? 'motion' : 'density';
      $$(`[data-${key}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[key] === state[key])));
      layoutGrid();
      return;
    }
    if (el.dataset.style !== undefined) {
      state.style = el.dataset.style;
      persist();
      renderView();
      const cur = $(`.style-chips [data-style="${state.style}"]`);
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
      return;
    }
    if (el.dataset.ftog) {
      const [k, v] = el.dataset.ftog.split(':');
      if (state.filters[k].has(v)) state.filters[k].delete(v); else state.filters[k].add(v);
      el.setAttribute('aria-pressed', String(state.filters[k].has(v)));
      renderView();
      return;
    }
    if (el.dataset.sort) { state.sort = el.dataset.sort; persist(); $$('[data-sort]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort))); renderView(); return; }
    if (el.dataset.pvlot) { sheetCtx.pvlot = el.dataset.pvlot; $$('[data-pvlot]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pvlot === sheetCtx.pvlot))); return; }
    if (el.dataset.dir) {
      state.dir = el.dataset.dir;
      persist();
      renderView();
      if (inSheet) { $$('#sheet [data-dir]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dir === state.dir))); $$('#sheet .grid').forEach((g) => g.classList.toggle('out', state.dir === 'out')); }
      return;
    }
    if (el.dataset.by) { state.by = el.dataset.by; state.cust.byTouched = 1; persist(); applyVars(); $$('[data-by]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.by === state.by))); return; }
    if (el.dataset.sfxcat) { state.sfxCat = el.dataset.sfxcat; renderView(); return; }
    if (el.dataset.dlen) { const p = byId(sheetCtx.id); setFrames(p, p.f * Number(el.dataset.dlen)); return; }
    if (el.dataset.cid) {
      const c = CURVE_LIB.concat(state.myCurves).find((x) => x.id === el.dataset.cid);
      Object.assign(ce, { b: c.b.slice(), name: c.name, special: !!c.special, baseId: c.id, dirty: false });
      renderCeLib();
      drawCe();
      return;
    }
    const act = el.dataset.act;
    const tile = el.closest('.tile.card');
    const p = tile ? byId(tile.dataset.id) : null;
    const row = el.closest('.sfx');
    const sp = sheetCtx.id ? byId(sheetCtx.id) : null;
    const pack = el.dataset.pack ? PACKS.find((k) => k.id === el.dataset.pack) : null;
    switch (act) {
      case 'apply': if (p && !inSheet) apply(p, tile); break;
      case 'qa': { const qp = byId(el.dataset.id); if (qp) apply(qp, el); break; }
      case 'go': go(el.dataset.route); break;
      case 'q-clear': state.q = ''; renderView(); break;
      case 'ctx-refresh': lastCtxKey = ''; refreshContext(); break;
      case 'sw-rail': state.railWide = !state.railWide; persist(); applyUi(); el.setAttribute('aria-checked', String(state.railWide)); break;
      case 'fav':
        if (!p) break;
        toggleFav(p.id);
        el.setAttribute('aria-pressed', String(state.favs.has(p.id)));
        el.parentElement.classList.toggle('has-fav', state.favs.has(p.id));
        toast('ok', state.favs.has(p.id) ? `${p.name} épinglé aux favoris` : `${p.name} retiré des favoris`, '');
        if (state.cat === 'fav' && !state.q) renderView(); else renderCats();
        break;
      case 'stack-add': if (p) addToStack(p); break;
      case 'dminus': case 'dplus': if (p) setFrames(p, framesOf(p) + (act === 'dplus' ? 1 : -1) * (e.shiftKey ? 5 : 1)); break;
      case 'more': if (p) openDetail(p); break;
      case 'detail-of': { const q = byId(el.dataset.id); if (q) openDetail(q); break; }
      case 'close': if (!longRun) { closeSheet(); if (sheetCtx.kind === null) renderView(); } break;
      case 'filters': openFilters(); break;
      case 'filters-clear': state.style = ''; state.filters = { roles: new Set(), perf: new Set(), needs: new Set() }; persist(); if (!$('#sheet').hidden) closeSheet(); renderView(); break;
      case 'compare': { const a = byId(el.dataset.id); if (a) openCompare(a); break; }
      case 'ab-apply': { const q = byId(el.dataset.id); closeSheet(); if (q) apply(q, null); break; }
      case 'apply-detail': { const pp = byId(el.dataset.id); closeSheet(); apply(pp, $(`#view .tile[data-id="${pp.id}"]`)); break; }
      case 'apply-beat': { const pp = byId(el.dataset.id); closeSheet(); apply(pp, null, { beat: true }); break; }
      case 'fav-detail': { const id = el.dataset.id; toggleFav(id); el.textContent = state.favs.has(id) ? '★ Retirer des favoris' : '☆ Favori'; renderCats(); paintGrid(true); break; }
      case 'stack-detail': { const pp = byId(el.dataset.id); addToStack(pp); openDetail(pp); break; }
      case 'coll-add': { const pp = byId(el.dataset.id); if (pp) openCollAdd(pp); break; }
      case 'coll-create': { const nm = $('#collName') ? $('#collName').value : ''; const c = newColl(nm, el.dataset.id); toast('ok', `Collection « ${c.name} » créée`, (byId(el.dataset.id) || {}).name || ''); openCollAdd(byId(el.dataset.id)); break; }
      case 'coll-new': { const c = newColl('Collection ' + (state.colls.length + 1)); go('coll:' + c.id); toast('ok', `Collection « ${c.name} » créée`, 'Ajoute des presets depuis leur fiche (+ Collection).'); break; }
      case 'coll-rename': { const c = state.colls.find((x) => 'coll:' + x.id === state.cat); if (!c) break; const nm = ($('#collRename') ? $('#collRename').value : '').trim().slice(0, 40); if (nm) { c.name = nm; persist(); renderView(); toast('ok', 'Collection renommée', nm); } break; }
      case 'coll-del': { const c = state.colls.find((x) => 'coll:' + x.id === state.cat); if (!c) break; state.colls = state.colls.filter((x) => x !== c); persist(); go('coll'); toast('ok', `Collection « ${c.name} » supprimée`, 'les presets restent dans le catalogue'); break; }
      case 'stack-up': case 'stack-down': case 'stack-del': {
        const i = Number(el.closest('.st-item').dataset.i);
        if (act === 'stack-del') state.stack.splice(i, 1);
        else { const j = act === 'stack-up' ? i - 1 : i + 1; if (j >= 0 && j < state.stack.length) { const t = state.stack[i]; state.stack[i] = state.stack[j]; state.stack[j] = t; } }
        persist(); renderView(); break;
      }
      case 'stack-apply': if (state.stack.length) runStack(state.stack, 'Pile'); break;
      case 'stack-clear': state.stack = []; persist(); renderView(); break;
      case 'stack-save': {
        if (!state.stack.length) break;
        const nm = ($('#stackName') ? $('#stackName').value.trim() : '') || ('Mon combo ' + (state.userPresets.length + 1));
        state.userPresets.push({ yfx: 'user-preset', v: 1, id: 'user-' + Date.now().toString(36), name: nm.trim().slice(0, 40), stack: state.stack.map((it) => ({ id: it.id, params: { frames: framesOf(byId(it.id)) === 'loop' ? 0 : framesOf(byId(it.id)), intensity: intensityOf(byId(it.id)) / 100 } })) });
        persist(); renderView(); toast('ok', `Preset perso « ${nm} » enregistré`, 'exportable en .json'); break;
      }
      case 'user-apply': { const u = state.userPresets[Number(el.closest('.st-item').dataset.u)]; if (u) runStack(u.stack, u.name); break; }
      case 'user-del': { const i = Number(el.closest('.st-item').dataset.u); const u = state.userPresets[i]; state.userPresets.splice(i, 1); persist(); renderView(); if (u) toast('ok', `« ${u.name} » supprimé`, ''); break; }
      case 'user-export': { const u = state.userPresets[Number(el.closest('.st-item').dataset.u)]; if (u) saveJson(u.name.replace(/[^\w-]+/g, '_') + '.yfx.json', u); break; }
      case 'user-export-all': saveJson('yexofx_presets_perso.json', state.userPresets); break;
      case 'user-import': pickImport(); break;
      case 'pack-apply': if (pack) applyPack(pack); break;
      case 'undo': YX.bridge.call('undo').then((r) => { closeSheet(); toast('ok', r.msg, ''); refreshContext(); }).catch((err) => toast('err', 'Annulation impossible', err.message)); break;
      case 'hist-again': { const h = state.history[Number(el.closest('.st-item').dataset.h)]; const q = h && byId(h.id); if (q) { closeSheet(); apply(q, null); } break; }
      case 'pv-ask': openPvConfirm(el.dataset.scope === 'all' ? pvList() : pvMissing()); break;
      case 'pv-one': if (sp) openPvConfirm([sp], `Preview de ${sp.name}`); break;
      case 'pv-run': if (!longRun && sheetCtx.list) { const lot = sheetCtx.pvlot === 'all' || !sheetCtx.pvlot ? sheetCtx.list.length : Number(sheetCtx.pvlot); runPreviews(sheetCtx.list.slice(0, lot)); } break;
      case 'long-stop': if (YX.pvgen.current) YX.pvgen.current.stop = true; if (longRun) longRun.stop = true; el.disabled = true; el.textContent = 'Arrêt après celui en cours…'; break;
      case 'pv-open': { const d = YX.store.previewDir(); if (d) YX.store.open(d); break; }
      case 'pv-convert': convertMine(); break;
      case 'd-minus': case 'd-plus': if (sp) setFrames(sp, framesOf(sp) + (act === 'd-plus' ? 1 : -1) * (e.shiftKey ? 5 : 1)); break;
      case 'd-curve': if (sp) openCurve(sp.id); break;
      case 'd-curve-reset': if (sp) { cust(sp.id).c = undefined; persist(); refreshTile(sp); syncDetail(sp); } break;
      case 'play': if (row) playSfx(findSfx(row.dataset.sfx), el, row.querySelector('canvas')); break;
      case 'cti': if (row) placeSfx(findSfx(row.dataset.sfx), 'cti'); break;
      case 'markers': if (row) placeSfx(findSfx(row.dataset.sfx), 'markers'); break;
      case 'open-sfx': { const r = YX.store.sfxRoot(); if (r) YX.store.open(r); break; }
      case 'rescan': state.sfx = YX.store.listSfx(); renderView(); toast('ok', state.sfx.length + ' son(s) trouvé(s)', YX.store.sfxRoot() || ''); break;
      case 'sw-auto': state.autoplay = !state.autoplay; persist(); el.setAttribute('aria-checked', String(state.autoplay)); syncAuto(); break;
      case 'sw-sfx': state.sfxAuto = !state.sfxAuto; persist(); el.setAttribute('aria-checked', String(state.sfxAuto)); break;
      case 'reset-cust': state.cust = {}; persist(); refreshSettings(); toast('ok', 'Durées, courbes et intensités remises par défaut', 'tous les presets'); break;
      case 'relock': closeSheet(); YX.licence.deactivate(); lock(); break;
      case 'assets-pick': pickAssets(); break;
      case 'assets-open': if (state.env && state.env.assets) YX.store.open(state.env.assets); break;
      case 'tool': { const id = el.dataset.id; YX.bridge.call('apply', { id, params: {} }).then((r) => toast('ok', r.msg, '')).catch((err) => toast('err', err.message, '')); break; }
      case 'rx-test-ask': openRxTestConfirm(); break;
      case 'rx-test-run': runRxTest(); break;
      case 'probe': toast('soon', 'Sonde des effets…', 'AE peut figer quelques secondes'); setTimeout(() => runTool('probe', 'Sonde écrite et ouverte : envoie-moi le fichier'), 50); break;
      case 'autotest-ask': openAutotestConfirm(); break;
      case 'autotest-run': closeSheet(); toast('soon', 'Auto-test en cours…', 'AE peut figer quelques secondes'); setTimeout(() => runTool('autotest', 'Auto-test terminé : rapport ouvert').then((r) => { if (r && typeof r.ok === 'number') toast(r.ko ? 'err' : 'ok', `Auto-test : ${r.ok} OK, ${r.ko} échec(s), ${r.skip} ignoré(s)`, r.path || ''); }), 50); break;
      case 'dump': runTool('dump', 'Dump écrit et ouvert'); break;
      case 'effects': runTool('effects', 'Liste des effets écrite et ouverte'); break;
      case 'log': runTool('openLog', 'Log ouvert'); break;
      case 'reload-engine': closeSheet(); initEngine(true); break;
      case 'reload-panel': window.location.reload(); break;
      case 'ce-copy': { const txt = $('#ceCode').textContent; toast('ok', copyText(txt) ? 'Copié' : 'Copie bloquée : sélectionne le texte', txt); break; }
      case 'ce-save': {
        const n = state.myCurves.length + 1;
        const c = { id: 'my' + Date.now().toString(36), name: 'Perso ' + n, b: ce.b.slice() };
        state.myCurves.push(c);
        persist();
        Object.assign(ce, { name: c.name, baseId: c.id, dirty: false, special: false });
        renderCeLib(); drawCe();
        toast('ok', `${c.name} enregistrée`, easeCss(c) + ' · dans « Mes courbes »');
        break;
      }
      case 'ce-use': {
        const c = ceCurveObj();
        if (ce.target === 'global') { state.curve = c; persist(); applyVars(); renderView(); closeSheet(); toast('ok', `Courbe ${c.name} par défaut`, easeCss(c) + ' · pour les presets sans courbe propre'); }
        else if (ce.target === 'keys') {
          YX.bridge.call('apply', { id: 'ease', params: { curve: { b: c.b, special: !!c.special, name: c.name } } })
            .then((r) => { closeSheet(); toast('ok', r.msg, easeCss(c) + ' · Ctrl+Z annule'); })
            .catch((err) => toast('err', err.message, err.user ? 'Sélectionne tes keyframes dans la timeline, puis réessaie.' : ''));
        } else { const pp = byId(ce.target); cust(pp.id).c = c; persist(); refreshTile(pp); openDetail(pp); toast('ok', `Courbe ${c.name} pour ${pp.name}`, easeCss(c)); }
        break;
      }
      default: break;
    }
  });
  $('#sheet').addEventListener('click', (e) => { if (e.target === $('#sheet') && !longRun) closeSheet(); });

  const syncAuto = () => {
    $('#btnAuto').setAttribute('aria-pressed', String(state.autoplay));
    $('#btnAuto').title = state.autoplay ? 'Previews : lecture auto (clique pour : au survol)' : 'Previews : au survol (clique pour : lecture auto)';
    $$('#view .grid').forEach((g) => g.classList.toggle('hover-only', !state.autoplay));
    syncVideos();
  };
  const toggleAuto = () => { state.autoplay = !state.autoplay; persist(); syncAuto(); $$('[data-act="sw-auto"]').forEach((b) => b.setAttribute('aria-checked', String(state.autoplay))); toast('ok', state.autoplay ? 'Previews en lecture auto' : 'Previews au survol seulement', ''); };
  $('#btnAuto').addEventListener('click', toggleAuto);
  $('#btnSettings').addEventListener('click', openSettings);
  $('#btnCurve').addEventListener('click', () => openCurve('global'));
  $('#ctx').addEventListener('click', () => { if (!YX.bridge.inCEP) YX.mockState.sel++; lastCtxKey = ''; refreshContext(); });
  $('#intensity').addEventListener('input', (e) => { state.intensity = Number(e.target.value); applyVars(); });
  $('#intensity').addEventListener('change', persist);

  // ---------------------------------------------------------------- moteur
  const initEngine = async (manual) => {
    state.engine = 'loading';
    renderStatus();
    try {
      await YX.bridge.loadHost();
      state.info = await YX.bridge.call('ping');
      state.ready = new Set(await YX.bridge.call('presets'));
      try { state.prims = new Set(await YX.bridge.call('prims')); } catch (e) { state.prims = new Set(); }
      state.env = await YX.bridge.call('env');
      if (!state.env.assets && YX.store.devAssets()) {
        const r = await YX.bridge.call('setAssets', { path: YX.store.devAssets() });
        state.env.assets = r.assets;
      }
      YX.store.setAssets(state.env.assets);
      state.sfx = YX.store.listSfx();
      state.engine = 'ok';
      if (manual) toast('ok', 'Moteur rechargé', `v${state.info.version} · build ${state.info.build} · ${P_FX.filter(isReady).length} / ${P_FX.length} presets prêts`);
    } catch (e) {
      state.engine = 'error';
      state.engineErr = e.message;
    }
    renderStatus();
    renderView();
    refreshContext();
  };

  // ---------------------------------------------------------------- licence
  const lock = () => {
    state.licensed = false;
    state.licName = '';
    $('#mid').textContent = YX.licence.machineId() || 'indisponible';
    $('#key').value = '';
    $('#keyErr').textContent = '';
    $('#gate').hidden = false;
    $('#gate').classList.remove('leave');
    renderStatus();
  };
  const unlock = (name) => {
    state.licensed = true;
    state.licName = name || '';
    $('#gate').classList.add('leave');
    setTimeout(() => { $('#gate').hidden = true; layoutGrid(); }, 460);
    renderStatus();
    if (state.engine !== 'ok') initEngine();
  };
  $('#midCopy').addEventListener('click', () => {
    const id = $('#mid').textContent;
    toast('ok', copyText(id) ? 'ID machine copié' : 'Copie bloquée : sélectionne l\'ID', id);
  });
  $('#key').addEventListener('input', () => { $('#key').setAttribute('aria-invalid', 'false'); $('#keyErr').textContent = ''; });
  $('#gateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const r = YX.licence.activate($('#key').value);
    if (!r.ok) { $('#key').setAttribute('aria-invalid', 'true'); $('#keyErr').textContent = r.msg; return; }
    unlock(r.name);
    toast('ok', 'Licence activée sur ce PC', (r.name ? r.name + ' · ' : '') + (r.exp ? 'valable jusqu\'au ' + new Date(r.exp * 1000).toLocaleDateString('fr-FR') : 'sans date de fin') + (r.warn ? ' · ' + r.warn : ''));
  });

  // ---------------------------------------------------------------- démarrage
  ['headLogo', 'gateLogo'].forEach((id) => { $('#' + id).outerHTML = logo(); });
  $('#btnAuto').innerHTML = ico('play');
  $('#btnHistory').innerHTML = ico('history');
  $('#btnHome').innerHTML = railInner('home', 'Accueil');
  $('#btnSettings').innerHTML = railInner('gear', 'Réglages');
  $('#searchIco').outerHTML = ico('search');
  $('#palIco').outerHTML = ico('search');
  applyUi();
  applyVars();
  renderView();
  syncAuto();
  YX.previews.startTickers(() => state.autoplay);

  if (!YX.licence.available && !YX.bridge.inCEP) {
    unlock('mode démo (hors AE)');
  } else {
    const lic = YX.licence.check();
    if (lic.ok) unlock(lic.name); else lock();
  }
  YX.app = { state, initEngine, refreshContext, isReady, compat, layoutGrid, importUser, defOf };
})();
