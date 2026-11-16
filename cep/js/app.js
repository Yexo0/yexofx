/* YexoFX : logique du panel (rail de catégories, cartes vidéo, dock intensité / courbe, durée et
   courbe par preset, éditeur de courbe, audio, réglages, licence). Les actions dans AE passent
   par YX.bridge -> moteur ExtendScript. */
(function () {
  'use strict';
  const YX = window.YX;
  const { CATS, VIBES, P, CURVE_LIB, QUICK_CURVES } = YX.catalog;
  const { curveD, elasticF, esc } = YX.previews;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fr = (n, d) => n.toFixed(d === undefined ? 2 : d).replace('.', ',');
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

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
  };
  const FILLED = { play: 1, stop: 1, more: 1 };
  const ico = (n, cls) => `<svg class="ico${FILLED[n] ? ' fill' : ''}${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
  const Y_PATH = 'M11.5 10.5 18 18.6l6.5-8.1M18 18.6v7.4';
  const logo = () => `<svg class="logo" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="11" fill="var(--accent)"/><g fill="none" stroke="var(--on-accent)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path class="echo e2" d="${Y_PATH}" transform="translate(-3.2 0)" opacity=".16"/><path class="echo e1" d="${Y_PATH}" transform="translate(-1.4 0)" opacity=".34"/><path d="${Y_PATH}" transform="translate(1.6 0)"/></g></svg>`;
  const CAT_DESC = {
    impacts: 'combos pour le moment du kill', text: 'entrées et sorties de texte', shake: 'caméra et secousses',
    twitch: 'sauts aléatoires image par image', speed: 'velocity, freeze, beat sync', trans: 'centrées sur la coupe',
    fx: 'look et textures', styles: 'styles de titres', audio: 'ta bibliothèque de sons', fav: 'tes presets épinglés',
  };

  // ---------------------------------------------------------------- état (+ préférences sauvegardées)
  const libCurve = (id) => CURVE_LIB.find((c) => c.id === id);
  const easeCss = (c) => 'cubic-bezier(' + c.b.map((v) => +(+v).toFixed(3)).join(', ') + ')';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saved = YX.store.load() || {};
  const cleanCurve = (c) => (c && Array.isArray(c.b) && c.b.length === 4 ? { id: String(c.id || 'perso'), name: String(c.name || 'Perso'), b: c.b.map(Number), special: !!c.special } : null);
  const MOTIONS = ['normal', 'reduced', 'off'], DENSITIES = ['compact', 'comfort'];
  const state = {
    licensed: false, licName: '', engine: 'loading', engineErr: '', info: null, ready: new Set(), env: null, ctx: null,
    // vue courante : 'home', 'settings' ou une catégorie du catalogue (Réglages n'est pas restauré au démarrage)
    cat: CATS.some((c) => c.id === saved.cat) ? saved.cat : 'home',
    recent: Array.isArray(saved.recent) ? saved.recent.filter((id) => P.some((p) => p.id === id)).slice(0, 8) : [],
    motion: MOTIONS.includes(saved.motion) ? saved.motion : (reduced ? 'reduced' : 'normal'),
    density: DENSITIES.includes(saved.density) ? saved.density : 'compact',
    railWide: saved.railWide === true,
    dir: saved.dir || 'in', by: saved.by || 'car', vibe: 'tous',
    intensity: typeof saved.intensity === 'number' ? saved.intensity : 100,
    curve: cleanCurve(saved.curve) || libCurve('back'),
    cust: saved.cust && typeof saved.cust === 'object' ? saved.cust : {},
    myCurves: Array.isArray(saved.myCurves) ? saved.myCurves.map(cleanCurve).filter(Boolean) : [],
    favs: new Set(Array.isArray(saved.favs) ? saved.favs : ['killhit', 'impact', 'pop', 'flash']),
    autoplay: typeof saved.autoplay === 'boolean' ? saved.autoplay : !reduced,
    sfxAuto: typeof saved.sfxAuto === 'boolean' ? saved.sfxAuto : true,
    q: '', sfxCat: 'tout', sfx: [],
  };
  const persist = () => YX.store.save({
    cat: state.cat, dir: state.dir, by: state.by, intensity: state.intensity, curve: state.curve,
    cust: state.cust, myCurves: state.myCurves, favs: Array.from(state.favs), autoplay: state.autoplay, sfxAuto: state.sfxAuto,
    recent: state.recent, motion: state.motion, density: state.density, railWide: state.railWide,
  });
  const cust = (id) => state.cust[id] || (state.cust[id] = {});
  const framesOf = (p) => (p.f === 'loop' ? 'loop' : (state.cust[p.id] && state.cust[p.id].f) || p.f);
  const curveOf = (p) => (state.cust[p.id] && cleanCurve(state.cust[p.id].c)) || null;
  const loopOf = (p) => { const f = framesOf(p); return f === 'loop' ? 2.4 : 0.9 + f * 0.065; };
  const tileVars = (p) => { const c = curveOf(p); return `--loop:${loopOf(p).toFixed(2)}s;${c ? '--ease:' + easeCss(c) + ';' : ''}`; };
  const isReady = (p) => state.ready.has(p.id);

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
    toastTimer = setTimeout(() => el.classList.remove('show'), action ? 6000 : (kind === 'err' ? 6000 : 3800));
  };

  // ---------------------------------------------------------------- contexte AE (comp, sélection)
  let ctxBusy = false;
  let pvRun = null; // génération de previews en cours (AE occupé : pas de rafraîchissement du contexte)
  const renderCtx = () => {
    const c = state.ctx, el = $('#ctx');
    if (state.engine !== 'ok') { el.textContent = state.engine === 'loading' ? 'connexion à After Effects…' : 'moteur non chargé'; return; }
    if (!c || !c.comp) { el.textContent = c && !c.project ? 'aucun projet ouvert' : 'aucune comp active : clique dans ta timeline'; return; }
    const n = c.sel.length;
    const names = c.sel.slice(0, 2).map((l) => esc(l.name)).join(', ') + (n > 2 ? ` +${n - 2}` : '');
    el.innerHTML = `<b>${esc(c.comp.name)}</b><span class="sep">·</span>${fr(c.comp.fps, c.comp.fps % 1 ? 2 : 0)} fps<span class="sep">·</span>${esc(c.comp.tc)}<span class="sep">·</span>${n ? n + ' calque' + (n > 1 ? 's' : '') + ' : ' + names : 'aucun calque'}`;
    el.title = n ? c.sel.map((l) => `${l.name} (${l.kind})`).join('\n') : 'Comp active (clique pour rafraîchir)';
  };
  let lastCtxKey = '';
  const refreshContext = async () => {
    if (ctxBusy || state.engine !== 'ok' || pvRun) return;
    ctxBusy = true;
    try { state.ctx = await YX.bridge.call('context'); } catch (e) { if (e.engine) { state.engine = 'error'; state.engineErr = e.message; renderStatus(); } }
    ctxBusy = false;
    renderCtx();
    // l'accueil suit la comp et la sélection (mis à jour seulement si quelque chose a changé)
    const key = JSON.stringify(state.ctx && state.ctx.comp ? [state.ctx.comp.name, state.ctx.comp.w, state.ctx.comp.h, state.ctx.comp.fps, state.ctx.comp.dur, state.ctx.comp.layers, state.ctx.comp.items, state.ctx.sel] : state.ctx);
    if (key !== lastCtxKey) { lastCtxKey = key; if (onHome()) updateHome(); }
  };
  setInterval(() => { if (!document.hidden && state.licensed) refreshContext(); }, 1500);

  // ---------------------------------------------------------------- application d'un preset
  const paramsFor = (p) => {
    const c = (p ? curveOf(p) : null) || state.curve;
    const f = p ? framesOf(p) : 0;
    return { frames: f === 'loop' ? 0 : f, intensity: state.intensity / 100, curve: { b: c.b, special: !!c.special, name: c.name }, dir: state.dir, by: state.by };
  };
  const findSfx = (id) => state.sfx.find((s) => s.id === id);
  const placeSfx = async (s, mode) => {
    try { const r = await YX.bridge.call('sfx', { path: s.file, mode: mode || 'cti' }); toast('ok', r.msg, 'rangé dans le dossier YFX_SFX du projet'); }
    catch (e) { toast('err', e.user ? e.message : 'Import du son impossible', e.user ? '' : e.message); }
  };
  const apply = async (p, tile) => {
    if (p.id === 'ease') { openCurve('keys'); return; }
    if (!isReady(p)) { toast('soon', `${p.name} arrive bientôt`, "Ce preset n'est pas encore dans ce moteur : recharge le moteur après une mise à jour."); return; }
    if (state.engine !== 'ok') { toast('err', 'Moteur non chargé', state.engineErr || 'Réglages > Recharger le moteur'); return; }
    if (tile) tile.classList.add('applying');
    try {
      const r = await YX.bridge.call('apply', { id: p.id, params: paramsFor(p) });
      if (tile) { tile.classList.remove('applying'); tile.classList.add('done'); setTimeout(() => tile.classList.remove('done'), 900); }
      state.recent = [p.id].concat(state.recent.filter((x) => x !== p.id)).slice(0, 8);
      persist();
      if (onHome()) updateHome();
      let extra = 'Ctrl+Z annule';
      const s = p.sfx && state.sfxAuto && ['impacts', 'shake', 'trans'].includes(p.cat) ? findSfx(p.sfx) : null;
      if (s) {
        try { await YX.bridge.call('sfx', { path: s.file, mode: 'cti' }); extra = `+ ${s.id} placé · ` + extra; } catch (e) { extra = `${s.id} non placé (${e.message}) · ` + extra; }
      }
      const offer = p.sfx && !s ? findSfx(p.sfx) : null;
      toast('ok', r.msg, extra, offer ? { label: '+ ' + offer.id, run: () => placeSfx(offer) } : null);
    } catch (e) {
      if (tile) tile.classList.remove('applying');
      if (e.user) toast('err', e.message, "Rien n'a été modifié.");
      else toast('err', 'Erreur pendant ' + p.name, e.message + ' · un seul Ctrl+Z annule ce qui a été fait.');
    }
    refreshContext();
  };

  // ---------------------------------------------------------------- rendu
  const favCount = () => P.filter((p) => state.favs.has(p.id)).length;
  const LIB_CATS = { audio: 1, fav: 1 };
  const railInner = (icon, label, extra) => `${ico(icon)}<span class="lbl">${esc(label)}</span>${extra || ''}`;
  const renderCats = () => {
    let html = '', group = null;
    CATS.forEach((c) => {
      const g = LIB_CATS[c.id] ? 'Bibliothèque' : 'Effets';
      if (g !== group) { html += `<div class="rail-sep" role="presentation"><span>${g}</span></div>`; group = g; }
      const cnt = c.id === 'fav' && favCount() ? `<span class="cnt">${favCount()}</span>` : '';
      html += `<button class="rail-btn" type="button" data-cat="${c.id}" aria-pressed="${!state.q && state.cat === c.id}" title="${esc(c.label)}" aria-label="${esc(c.label)}">${railInner(c.id, c.label, cnt)}</button>`;
    });
    $('#cats').innerHTML = html;
    $('#btnHome').setAttribute('aria-pressed', String(!state.q && state.cat === 'home'));
    $('#btnSettings').setAttribute('aria-pressed', String(!state.q && state.cat === 'settings'));
  };
  const onHome = () => !state.q && state.cat === 'home' && !!$('#view .home');
  const crumbHTML = () => {
    const chev = ico('chev', 'chev');
    if (state.q) return `<span class="up">Recherche</span>${chev}<span class="cur">« ${esc(state.q)} »</span><button class="ibtn xs" type="button" data-act="q-clear" aria-label="Effacer la recherche" title="Effacer la recherche">${ico('x')}</button>`;
    if (state.cat === 'home') return '<span class="cur">Accueil</span>';
    if (state.cat === 'settings') return '<span class="cur">Réglages</span>';
    const c = CATS.find((x) => x.id === state.cat);
    return `<span class="up">${LIB_CATS[c.id] ? 'Bibliothèque' : 'Effets'}</span>${chev}<span class="cur">${esc(c.label)}</span>`;
  };
  // Change de vue (rail, palette, liens de l'accueil).
  const go = (route) => {
    state.cat = route;
    state.vibe = 'tous';
    state.q = '';
    persist();
    renderView();
    $('#scroll').scrollTop = 0;
  };

  // ---------------------------------------------------------------- accueil
  const QUICK = ['killhit', 'impact', 'tw-full', 'velocity', 'beat', 'ease'];
  const SUGGEST = {
    footage: { t: 'Clip sélectionné', ids: ['velocity', 'freezehit', 'slowkill', 'shaketwitch'] },
    'précomp': { t: 'Précomp sélectionnée', ids: ['velocity', 'killhit', 'rgbpunch', 'freezehit'] },
    texte: { t: 'Texte sélectionné', ids: ['pop', 'stomp', 'glitch', 'val'] },
    audio: { t: 'Son sélectionné', ids: ['beat', 'marker'] },
    ajustement: { t: "Calque d'ajustement", ids: ['glow', 'grain', 'vhs', 'punchy'] },
    forme: { t: 'Forme sélectionnée', ids: ['impact', 'tw-scale', 'pop', 'flash'] },
  };
  const presetIcon = (p) => (p.id === 'ease' ? 'curve' : p.cat);
  const qaHTML = (p, sug) => `<button class="qa${sug ? ' sug' : ''}" type="button" data-act="qa" data-id="${p.id}" title="${esc(p.desc)}"><span class="qi">${ico(presetIcon(p))}</span><span class="qt"><b>${esc(p.name)}</b><span>${esc(p.sb)}</span></span></button>`;
  const byIds = (ids) => ids.map((id) => P.find((p) => p.id === id)).filter(Boolean);
  const compCardHTML = () => {
    const c = state.ctx;
    const head = (r) => `<div class="sec-label label acc">Comp active${r || ''}</div>`;
    if (state.engine !== 'ok') return `<div class="comp-card">${head()}<h3 class="none">${state.engine === 'loading' ? 'Connexion à After Effects…' : 'Moteur non chargé'}</h3><div class="meta">${state.engine === 'loading' ? 'Le moteur YexoFX se charge.' : 'Réglages › Recharger le moteur'}</div></div>`;
    const refresh = `<button class="ibtn" type="button" data-act="ctx-refresh" aria-label="Rafraîchir" title="Rafraîchir">${ico('refresh')}</button>`;
    if (!c || !c.comp) return `<div class="comp-card">${head(refresh)}<h3 class="none">${c && !c.project ? 'Aucun projet ouvert' : 'Aucune comp active'}</h3><div class="hint" style="margin-top:3px">Clique dans ta timeline : YexoFX suit la comp et la sélection.</div></div>`;
    const k = c.comp, n = c.sel.length;
    const kinds = Array.from(new Set(c.sel.map((l) => l.kind)));
    const sep = '<span class="sep">·</span>';
    return `<div class="comp-card">${head(refresh)}
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
  const homeHTML = () => {
    const favs = P.filter((p) => state.favs.has(p.id));
    return `<div class="home">
      <div id="homeCard">${compCardHTML()}</div>
      <div><div class="sec-label label">Actions rapides</div><div class="qa-grid">${byIds(QUICK).map((p) => qaHTML(p)).join('')}</div></div>
      <div id="homeSug">${suggestHTML()}</div>
      <div id="homeRecent"><div class="sec-label label">Récents</div>${listOrEmpty(byIds(state.recent.slice(0, 6)), 'Rien pour l\'instant.', ' Les presets que tu appliques arrivent ici.', 'clock')}</div>
      <div><div class="sec-label label">Favoris${favs.length > 6 ? `<span class="r"><button class="lnk" type="button" data-act="go" data-route="fav">tout voir (${favs.length})</button></span>` : ''}</div>${listOrEmpty(favs.slice(0, 6), 'Aucun favori.', ' Clique ★ sur une carte pour l\'épingler ici.', 'fav')}</div>
    </div>`;
  };
  const updateHome = () => {
    if (!onHome()) return;
    $('#homeCard').innerHTML = compCardHTML();
    $('#homeSug').innerHTML = suggestHTML();
    $('#homeRecent').innerHTML = `<div class="sec-label label">Récents</div>${listOrEmpty(byIds(state.recent.slice(0, 6)), 'Rien pour l\'instant.', ' Les presets que tu appliques arrivent ici.', 'clock')}`;
  };
  const durHTML = (p) => {
    const f = framesOf(p);
    if (f === 'loop') return '';
    const custom = state.cust[p.id] && state.cust[p.id].f;
    return `<div class="durctl${custom ? ' custom' : ''}"><button type="button" data-act="dminus" aria-label="Raccourcir ${esc(p.name)}">−</button><span>${f} f</span><button type="button" data-act="dplus" aria-label="Allonger ${esc(p.name)}">+</button></div>`;
  };
  const tileHTML = (p, showCat) => `
    <article class="tile card${isReady(p) ? '' : ' not-ready'}" data-id="${p.id}" style="${tileVars(p)}">
      <div class="pv">${YX.previews.inner(p, state.curve, ico('check'))}</div>
      <div class="cap"><div class="nm">${esc(p.name)}</div><div class="sb">${esc(showCat ? CATS.find((c) => c.id === p.cat).label.toLowerCase() + ' · ' + p.sb : p.sb)}</div></div>
      ${durHTML(p)}
      ${curveOf(p) ? '<span class="mark-c">courbe perso</span>' : ''}
      ${isReady(p) ? '' : '<span class="soon">bientôt</span>'}
      <button class="hit" type="button" data-act="apply" aria-label="Appliquer ${esc(p.name)}"></button>
      <div class="tools${state.favs.has(p.id) ? ' has-fav' : ''}">
        <button class="tb more" type="button" data-act="more" aria-label="Fiche de ${esc(p.name)}">${ico('more')}</button>
        <button class="tb star" type="button" data-act="fav" aria-pressed="${state.favs.has(p.id)}" aria-label="Favori">${ico('fav')}</button>
      </div>
    </article>`;
  const gridHTML = (list, showCat) => `<div class="grid${state.autoplay ? '' : ' hover-only'}${state.dir === 'out' ? ' out' : ''}">${list.map((p) => tileHTML(p, showCat)).join('')}</div>`;
  const sizeLabel = (b) => (b > 1048576 ? fr(b / 1048576, 1) + ' Mo' : Math.max(1, Math.round(b / 1024)) + ' Ko');
  const sfxRowHTML = (s, label) => `
    <div class="sfx" data-sfx="${esc(s.id)}">
      <button class="play" type="button" data-act="play" aria-pressed="false" aria-label="Écouter ${esc(s.id)}">${ico('play')}</button>
      <div class="top"><span class="nm">${esc(s.id)}</span><span class="sb">${label ? esc(label) : esc(s.cat) + ' · ' + sizeLabel(s.size)}</span></div>
      <div class="bot"><canvas aria-hidden="true"></canvas>${label ? '' : '<button class="mini" type="button" data-act="cti">Au CTI</button><button class="mini" type="button" data-act="markers">Markers</button>'}</div>
    </div>`;
  // Le titre visible est dans le fil d'Ariane : le h2 reste pour les lecteurs d'écran.
  const catHead = (title, cmd, right) => `<div class="cat-head"><h2 class="sr">${esc(title)}</h2><span class="cmd">${esc(cmd)}</span><span class="count">${esc(right)}</span></div>`;
  const chips = (key, opts) => `<div class="chips" role="group">${opts.map(([v, l]) => `<button type="button" data-${key}="${esc(v)}" aria-pressed="${state[key] === v}">${esc(l)}</button>`).join('')}</div>`;

  let lastRoute = null;
  const renderView = () => {
    const view = $('#view');
    stopSfx();
    let html = '';
    if (!state.q && state.cat === 'home') {
      html = homeHTML();
    } else if (!state.q && state.cat === 'settings') {
      html = settingsHTML();
    } else if (state.q) {
      const toks = norm(state.q).split(/\s+/).filter(Boolean);
      const hit = (s) => { const n = norm(s); return toks.every((t) => n.includes(t)); };
      const ps = P.filter((p) => hit([p.name, p.sb, p.desc, p.rx.join(' '), VIBES[p.vibe], CATS.find((c) => c.id === p.cat).label].join(' ')));
      const ss = state.sfx.filter((s) => hit([s.id, s.cat, 'audio son sfx'].join(' ')));
      const n = ps.length + ss.length;
      html += catHead('Recherche', `« ${state.q} »`, `${n} résultat${n > 1 ? 's' : ''}`);
      if (ps.length) html += gridHTML(ps, true);
      if (ss.length) html += `<div class="sfx-list">${ss.map((s) => sfxRowHTML(s)).join('')}</div>`;
      if (!n) html += `<div class="empty">Aucun preset ni son pour « ${esc(state.q)} ».<span class="cmd">essaie : twitch, rgb, velocity, whoosh</span></div>`;
    } else if (state.cat === 'audio') {
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
    } else if (state.cat === 'fav') {
      const list = P.filter((p) => state.favs.has(p.id));
      html += catHead('Favoris', CAT_DESC.fav, `${list.length}`);
      html += list.length ? gridHTML(list, true) : '<div class="empty">Aucun favori.<span class="cmd">survole un preset et clique ★ pour l\'épingler ici</span></div>';
    } else {
      const c = CATS.find((x) => x.id === state.cat);
      const all = P.filter((p) => p.cat === state.cat);
      const vibesHere = Object.keys(VIBES).filter((v) => all.some((p) => p.vibe === v));
      if (state.vibe !== 'tous' && !vibesHere.includes(state.vibe)) state.vibe = 'tous';
      const list = all.filter((p) => state.vibe === 'tous' || p.vibe === state.vibe);
      html += catHead(c.label, CAT_DESC[c.id] || '', `${list.length}`);
      let sub = chips('vibe', [['tous', 'tout']].concat(vibesHere.map((v) => [v, VIBES[v]])));
      if (c.id === 'text') sub += chips('dir', [['in', 'Entrée'], ['out', 'Sortie'], ['both', 'In + Out']]) + chips('by', [['car', 'lettre'], ['mot', 'mot'], ['ligne', 'ligne']]);
      html += `<div class="cat-sub">${sub}</div>`;
      html += gridHTML(list.filter(isReady).concat(list.filter((p) => !isReady(p))), false);
    }
    view.innerHTML = html;
    $$('.sfx canvas', view).forEach((cv) => drawWave(cv, findSfx(cv.closest('.sfx').dataset.sfx)));
    syncVideos();
    renderCats();
    $('#crumb').innerHTML = crumbHTML();
    $('#dock').hidden = !state.q && state.cat === 'settings';
    // petite entrée de vue, seulement quand on change de page (pas à chaque rafraîchissement)
    const route = state.q ? 'q' : state.cat;
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
    st.title = (state.licensed ? 'Licence active' + (state.licName ? ' · ' + state.licName : '') : 'Licence non activée') + '\n' +
      (state.engine === 'ok' ? `Moteur v${state.info.version} · AE ${String(state.info.ae).split('x')[0]} · ${state.ready.size} presets` : state.engine === 'loading' ? 'Moteur : chargement…' : 'Moteur non chargé');
    const b = $('#banner');
    if (state.engine === 'error' && state.licensed) {
      b.hidden = false;
      b.innerHTML = `<span class="grow">Le moteur YexoFX ne s'est pas chargé dans After Effects. ${esc(state.engineErr || '')}</span><button class="mini" type="button" data-act="reload-engine">Recharger</button>`;
    } else {
      b.hidden = true;
    }
    renderCtx();
  };

  // Vidéos de preview : lecture auto ou au survol.
  const syncVideos = () => {
    $$('#view video.pvv').forEach((v) => { if (state.autoplay) { v.play().catch(() => {}); } else { v.pause(); v.currentTime = 0; } });
  };
  $('#view').addEventListener('mouseover', (e) => { if (state.autoplay) return; const t = e.target.closest('.tile'); const v = t && t.querySelector('video.pvv'); if (v && v.paused) v.play().catch(() => {}); });
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
    const step = () => { if (!playing || playing.audio !== audio) return; if (canvas && audio.duration) drawWave(canvas, s, audio.currentTime / audio.duration); requestAnimationFrame(step); };
    requestAnimationFrame(step);
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

  const openDetail = (p) => {
    const sfx = p.sfx ? findSfx(p.sfx) : null;
    const cat = CATS.find((c) => c.id === p.cat).label;
    const loop = p.f === 'loop';
    openSheet(`
      ${head(cat + ' · ' + VIBES[p.vibe] + (isReady(p) ? '' : ' · bientôt'), p.name)}
      <div class="grid${state.dir === 'out' ? ' out' : ''}" style="padding:0;grid-template-columns:1fr"><div class="tile" data-id="${p.id}" id="detailTile" style="padding:0;border:0;background:none;${tileVars(p)}"><div class="pv big">${YX.previews.inner(p, state.curve, ico('check'))}</div></div></div>
      <p class="desc">${esc(p.desc)}</p>
      <div><div class="label" style="margin-bottom:6px">Recette</div><div class="recipe">${p.rx.map((r, i) => (i ? '<span class="plus">+</span>' : '') + `<span class="pill">${esc(r)}</span>`).join('')}</div></div>
      <div class="box">
        <div class="box-row"><span class="label grow">Durée</span>${loop ? '<span class="hint">effet continu : il dure autant que le calque</span>' : '<span class="stepper"><button type="button" data-act="d-minus" aria-label="Raccourcir">−</button><output id="dOut"></output><button type="button" data-act="d-plus" aria-label="Allonger">+</button></span>'}</div>
        ${loop ? '' : `<div class="box-row">${chips('dlen', [['0.5', 'court'], ['1', 'normal'], ['2', 'long']])}<span class="hint grow" id="dHint" style="text-align:right"></span></div>`}
      </div>
      <div class="box">
        <div class="box-row"><span class="label grow">Courbe</span><svg viewBox="0 0 40 26" width="40" height="26" aria-hidden="true" style="overflow:visible"><path id="dCurve" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/></svg><span id="dCurveName" style="font:500 12px var(--font-mono)"></span></div>
        <div class="box-row"><button class="btn ghost sm" type="button" data-act="d-curve">${ico('curve')}Éditer la courbe</button><button class="btn ghost sm" type="button" data-act="d-curve-reset" id="dReset">Revenir à la courbe globale</button></div>
      </div>
      ${p.cat === 'text' ? `<div class="filters" style="padding:0">${chips('dir', [['in', 'Entrée'], ['out', 'Sortie'], ['both', 'In + Out']])}</div>` : ''}
      ${sfx ? sfxRowHTML(sfx, 'SFX suggéré') : ''}
      <div class="row-btns"><button class="btn primary" type="button" data-act="apply-detail" data-id="${p.id}"${isReady(p) ? '' : ' disabled'}>${isReady(p) ? 'Appliquer' : 'Bientôt disponible'}</button><button class="btn ghost" type="button" data-act="fav-detail" data-id="${p.id}">${state.favs.has(p.id) ? '★ Retirer' : '☆ Favori'}</button></div>
      ${canPv(p) ? `<button class="btn ghost sm" type="button" data-act="pv-one">${ico('play')}${YX.store.previewUrl(p.id) ? 'Regénérer la vidéo de preview' : 'Générer la vidéo de preview'}</button>` : ''}
      <div class="hint">Après coup, tout se règle dans Effect Controls : contrôles YFX_${esc(p.name.replace(/[^A-Za-z0-9]/g, ''))}_* (durée, intensité, courbe…).</div>`, { kind: 'detail', id: p.id });
    syncDetail(p);
    const cv = $('#sheet canvas');
    if (cv && sfx) drawWave(cv, sfx);
  };
  const syncDetail = (p) => {
    const sh = $('#sheet');
    const dt = $('#detailTile', sh);
    if (dt) dt.setAttribute('style', `padding:0;border:0;background:none;${tileVars(p)}`);
    const f = framesOf(p);
    if (f !== 'loop') {
      $('#dOut', sh).textContent = f + ' f';
      const fps = (state.ctx && state.ctx.comp && state.ctx.comp.fps) || 60;
      $('#dHint', sh).textContent = `${fr(f / fps)} s à ${fr(fps, fps % 1 ? 2 : 0)} fps · défaut ${p.f} f`;
      $$('[data-dlen]', sh).forEach((b) => b.setAttribute('aria-pressed', String(Math.round(p.f * Number(b.dataset.dlen)) === f)));
    }
    const c = curveOf(p) || state.curve;
    $('#dCurve', sh).setAttribute('d', curveD(c, 40, 26, 4, -0.3, 1.5));
    $('#dCurveName', sh).textContent = c.name + (curveOf(p) ? ' (perso)' : ' (globale)');
    $('#dReset', sh).hidden = !curveOf(p);
  };

  // ---------------------------------------------------------------- page Réglages
  const setSec = (label, body) => `<div><div class="sec-label label">${esc(label)}</div>${body}</div>`;
  const setRow = (t1, t2, right) => `<div class="set-row"><div style="min-width:0"><div class="t1">${t1}</div>${t2 ? `<div class="t2">${t2}</div>` : ''}</div>${right}</div>`;
  const sw = (act, on, label) => `<button class="sw" type="button" role="switch" data-act="${act}" aria-checked="${on}" aria-label="${esc(label)}"></button>`;
  const settingsHTML = () => {
    const env = state.env || {};
    const nCust = Object.keys(state.cust).filter((k) => state.cust[k] && (state.cust[k].f || state.cust[k].c)).length;
    return `<div class="settings">
      ${setSec('Général', `<div class="set-card">
        ${setRow('Lecture auto des previews', 'sinon : au survol seulement', sw('sw-auto', state.autoplay, 'Lecture auto'))}
        ${setRow('SFX auto avec impacts et transitions', 'place le son suggéré s\'il est dans ta bibliothèque', sw('sw-sfx', state.sfxAuto, 'SFX auto'))}
        ${setRow('Durées et courbes perso', `${nCust} preset(s) modifié(s)`, '<button class="mini" type="button" data-act="reset-cust">Tout remettre par défaut</button>')}
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
        <button class="btn ghost sm" type="button" data-act="autotest-ask">Auto-test</button>
        <button class="btn ghost sm" type="button" data-act="dump">Dump calque</button>
        <button class="btn ghost sm" type="button" data-act="effects">Liste des effets</button>
        <button class="btn ghost sm" type="button" data-act="log">Ouvrir le log</button>
        <button class="btn ghost sm" type="button" data-act="reload-engine">Recharger le moteur</button>
        <button class="btn ghost sm" type="button" data-act="reload-panel">Recharger le panel</button>
      </div></div>`)}
      <div class="hint">Panel v0.6 · moteur ${esc(state.info ? state.info.version + ' (build ' + state.info.build + ')' : 'non chargé')} · ${state.ready.size} presets · AE ${esc(state.info ? state.info.ae : '?')} · expressions ${esc(state.info ? state.info.engine : '?')}${env.thirdParty && env.thirdParty.length ? ' · tiers : ' + esc(env.thirdParty.join(', ')) : ''}</div>
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
  // ---------------------------------------------------------------- vidéos de preview (rendues dans AE)
  const canPv = (p) => YX.pvgen.available && state.engine === 'ok' && isReady(p) && !p.tool && p.cat !== 'audio';
  const pvList = () => YX.pvgen.eligible(P, state.ready);
  const pvMissing = () => pvList().filter((p) => !YX.store.previewUrl(p.id));
  const fmtDur = (ms) => (ms < 60000 ? Math.max(1, Math.round(ms / 1000)) + ' s' : Math.round(ms / 60000) + ' min');
  const pvSection = () => {
    if (!YX.pvgen.available || state.engine !== 'ok') return '';
    const list = pvList(), miss = pvMissing().length, ff = YX.pvgen.ffmpeg(), mine = ff ? YX.pvgen.userVideos() : [];
    return setSec('Previews vidéo', `<div class="set-card">
      ${setRow(`${list.length - miss} / ${list.length} presets ont leur vidéo`, ff ? 'compression ffmpeg · WebM 432×540' : 'ffmpeg introuvable : rendus gardés en MP4, plus lourds', '<button class="mini" type="button" data-act="pv-open">Ouvrir</button>')}
      <div class="tools-grid">
        <button class="btn ${miss ? 'primary' : 'ghost'} sm" type="button" data-act="pv-ask" data-scope="missing"${miss ? '' : ' disabled'}>${miss ? `Générer ${miss} manquante${miss > 1 ? 's' : ''}` : 'Aucune manquante'}</button>
        <button class="btn ghost sm" type="button" data-act="pv-ask" data-scope="all">Tout regénérer</button>
        ${mine.length ? `<button class="btn ghost sm" type="button" data-act="pv-convert">Convertir tes vidéos (${mine.length})</button>` : ''}
      </div></div>`);
  };
  const openPvConfirm = async (list, title) => {
    if (!list.length) { toast('ok', 'Toutes les previews sont déjà là', ''); return; }
    let info;
    try { info = await YX.bridge.call('pvInfo'); } catch (e) { toast('err', 'Previews', e.message); return; }
    const ff = YX.pvgen.ffmpeg(), n = list.length;
    openSheet(`
      ${head('previews vidéo', title || `Générer ${n} preview${n > 1 ? 's' : ''} ?`)}
      <p class="desc">Pour chaque preset, AE crée une comp de démo, applique le preset, la rend puis la supprime. Compte environ <b>${fmtDur(n * 12000)}</b> : AE est bloqué pendant chaque rendu, tu peux arrêter entre deux.</p>
      <div class="box">
        <div class="box-row"><span class="label grow">Source</span><span class="hint">${info.source ? esc(info.source) : 'scène de démo YexoFX'}</span></div>
        <div class="hint">${info.source ? 'Le moment du CTI devient le kill de chaque preview (plan suivant : 1,5 s plus loin).' : 'Pour utiliser ton clip : sélectionne-le dans ta comp, place le CTI sur le kill, puis relance.'}</div>
        <div class="box-row"><span class="label grow">Compression</span><span class="hint">${ff ? 'WebM 432×540 avec ffmpeg' : 'aucune : ffmpeg introuvable'}</span></div>
        ${info.queued ? `<div class="hint">Tes ${info.queued} rendu(s) en file d'attente sont mis de côté pendant la génération, puis remis.</div>` : ''}
      </div>
      <div class="row-btns"><button class="btn primary" type="button" data-act="pv-run">Lancer</button><button class="btn ghost" type="button" data-act="close">Annuler</button></div>`, { kind: 'pv-confirm', list: list.map((p) => p.id) });
  };
  const runPreviews = async (ids) => {
    const list = ids.map((id) => P.find((p) => p.id === id)).filter(Boolean);
    // libère les vidéos affichées : un fichier en lecture ne peut pas être remplacé sous Windows
    $$('video.pvv').forEach((v) => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ } });
    openSheet(`
      <div class="sheet-head"><div class="grow"><div class="label">previews vidéo</div><h3 id="pvTitle">Génération en cours…</h3></div></div>
      <div class="pv-prog">
        <div class="pv-bar"><i id="pvBar"></i></div>
        <div class="pv-now"><span class="grow" id="pvNow">Préparation de la scène de démo…</span><span id="pvCount">0 / ${list.length}</span></div>
        <div class="hint" id="pvInfo">AE peut ne plus répondre pendant chaque rendu : c'est normal.</div>
        <ul class="pv-errs" id="pvErrs"></ul>
      </div>
      <div class="row-btns" id="pvBtns"><button class="btn ghost" type="button" data-act="pv-stop">Arrêter après celle-ci</button></div>`, { kind: 'pv' });
    pvRun = { ids };
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
    try { st = await YX.pvgen.run(list, upd); } catch (e) { err = e; }
    pvRun = null;
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
      $('#pvInfo').textContent = nErr ? 'Les presets en erreur gardent leur animation de démo. Envoie-moi la liste ci-dessous.' : 'Elles sont déjà dans les cartes.';
      toast(nErr ? 'err' : 'ok', `${st.ok} preview${st.ok > 1 ? 's' : ''} générée${st.ok > 1 ? 's' : ''}`, nErr ? `${nErr} erreur(s) : voir la fenêtre` : (YX.store.previewDir(true) || ''));
    }
    $('#pvBtns').innerHTML = '<button class="btn primary" type="button" data-act="close">Fermer</button>';
  };
  const convertMine = async () => {
    const mine = YX.pvgen.userVideos();
    if (!mine.length) return;
    closeSheet();
    $$('video.pvv').forEach((v) => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ } });
    toast('soon', `Conversion de ${mine.length} vidéo(s)…`, 'WebM 432×540, tes originaux sont gardés');
    const st = await YX.pvgen.convertUser(mine);
    renderView();
    toast(st.errors.length ? 'err' : 'ok', `${st.ok} vidéo(s) convertie(s)`, st.errors.map((e) => e.name + ' : ' + e.msg).join(' · '));
  };

  const openAutotestConfirm = () => {
    openSheet(`
      ${head('diagnostic', 'Lancer l\'auto-test ?')}
      <p class="desc">Il crée une comp <b>YFX_TEST</b> dans le projet courant, teste le moteur et tous les presets, puis ouvre un rapport texte. Lance-le de préférence dans un <b>projet vide</b>, et envoie-moi le rapport.</p>
      <div class="row-btns"><button class="btn primary" type="button" data-act="autotest-run">Lancer l'auto-test</button><button class="btn ghost" type="button" data-act="close">Annuler</button></div>`, { kind: 'confirm' });
  };

  // ---------------------------------------------------------------- éditeur de courbe (façon Flow)
  const GX0 = 34, GX1 = 196, GY0 = 196, GY1 = 24, VMIN = -0.6, VMAX = 1.6;
  const gx = (t) => GX0 + t * (GX1 - GX0);
  const gy = (v) => GY0 - ((v - VMIN) / (VMAX - VMIN)) * (GY0 - GY1);
  const ce = { b: [0.34, 1.56, 0.64, 1], name: 'Back', special: false, target: 'global', baseId: 'back', dirty: false };
  const openCurve = (target) => {
    const p = P.find((x) => x.id === target);
    const start = p ? (curveOf(p) || state.curve) : state.curve;
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
      ${p ? `<button class="btn ghost sm" type="button" data-act="ce-back" data-id="${p.id}">${ico('back')}Retour à la fiche</button>` : ''}
      <div class="hint">${target === 'keys' ? 'Sélectionne au moins 2 keyframes qui se suivent dans la timeline, puis applique : la courbe est convertie en vitesse + influence, comme Flow.' : 'Même format que cubic-bezier.com et Flow. La courbe est appliquée à l\'expression du preset (contrôles CourbeP1 / P2 sur le calque).'}</div>`, { kind: 'curve', target });
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
      const step = e.shiftKey ? 0.05 : 0.01;
      const i = h === '1' ? 0 : 2;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
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
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (b) go(b.dataset.cat);
  });
  $('#btnHome').addEventListener('click', () => go('home'));
  $('#btnRail').addEventListener('click', () => { state.railWide = !state.railWide; persist(); applyUi(); refreshSettings(); });

  // ---------------------------------------------------------------- palette de commandes (Ctrl+K)
  let palItems = [], palSel = 0;
  const palGo = [{ icon: 'home', label: 'Accueil', route: 'home' }].concat(CATS.map((c) => ({ icon: c.id, label: c.label, route: c.id })), [{ icon: 'gear', label: 'Réglages', route: 'settings' }]);
  const palActions = () => [
    { icon: 'curve', label: 'Courbe par défaut', sub: 'éditeur de courbe', run: () => openCurve('global') },
    { icon: 'curve', label: 'Courbe de tes keyframes', sub: 'appliquer aux keys sélectionnées', run: () => openCurve('keys') },
    { icon: 'play', label: state.autoplay ? 'Previews au survol seulement' : 'Previews en lecture auto', sub: 'lecture des cartes', run: () => toggleAuto() },
    { icon: 'rail', label: state.railWide ? 'Masquer les libellés du rail' : 'Afficher les libellés du rail', sub: 'apparence', run: () => { state.railWide = !state.railWide; persist(); applyUi(); } },
    { icon: 'refresh', label: 'Recharger le moteur', sub: 'diagnostic', run: () => initEngine(true) },
  ];
  const palGroups = (q) => {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    const hit = (s) => { const n = norm(s); return toks.every((t) => n.includes(t)); };
    const catLabel = (p) => CATS.find((c) => c.id === p.cat).label;
    const presetItem = (p) => ({ icon: presetIcon(p), label: p.name, sub: catLabel(p) + ' · ' + p.sb, hk: 'appliquer', run: () => apply(p, $(`#view .tile[data-id="${p.id}"]`)) });
    const goItem = (g) => ({ icon: g.icon, label: g.label, sub: 'aller à', hk: 'ouvrir', run: () => go(g.route) });
    const actItem = (a) => Object.assign({ hk: 'lancer' }, a);
    if (!toks.length) {
      return [
        { t: 'Récents', items: byIds(state.recent.slice(0, 4)).map(presetItem) },
        { t: 'Aller à', items: palGo.map(goItem) },
        { t: 'Actions', items: palActions().map(actItem) },
      ];
    }
    // les noms qui commencent par la recherche d'abord, puis les noms qui la contiennent, puis le reste
    const nq = norm(q.trim());
    const rank = (p) => { const n = norm(p.name); return n.startsWith(nq) ? 0 : n.includes(nq) ? 1 : toks.every((t) => n.includes(t)) ? 2 : 3; };
    const ps = P.filter((p) => hit([p.name, p.sb, p.desc, p.rx.join(' '), VIBES[p.vibe], catLabel(p)].join(' ')))
      .map((p, i) => ({ p, r: rank(p), i })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.p);
    return [
      { t: 'Presets', items: ps.slice(0, 30).map(presetItem) },
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
    $('#palList').innerHTML = html || `<div class="pal-none">Rien pour « ${esc(q)} ».<br>Essaie : twitch, rgb, velocity, whoosh</div>`;
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
  const showSearch = (q) => { closePal(); state.q = q; renderView(); $('#scroll').scrollTop = 0; };
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
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.id !== 'q';
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (palOpen()) closePal(); else openPal(); return; }
    if (e.key === '/' && state.licensed && !typing && !palOpen()) { e.preventDefault(); openPal(); return; }
    if (e.key === 'Escape') {
      if (palOpen()) { closePal(); return; }
      if (!$('#sheet').hidden && !pvRun) closeSheet();
    }
  });
  // Dans AE, demande à recevoir Ctrl+K, / et Échap quand le panel a le focus (sinon AE les garde pour lui).
  try {
    if (window.__adobe_cep__ && window.__adobe_cep__.registerKeyEventsInterest) {
      window.__adobe_cep__.registerKeyEventsInterest(JSON.stringify([{ keyCode: 75, ctrlKey: true }, { keyCode: 191 }, { keyCode: 27 }]));
    }
  } catch (e) { /* hors AE */ }

  const toggleFav = (id) => { if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id); persist(); };
  $('#panel').addEventListener('click', (e) => {
    const el = e.target.closest('[data-act], [data-dir], [data-by], [data-sfxcat], [data-vibe], [data-dlen], [data-cid], [data-motion], [data-density]');
    if (!el || el.disabled || el.closest('#pal')) return;
    const inSheet = !!el.closest('#sheet');
    if (el.dataset.motion || el.dataset.density) {
      if (el.dataset.motion) state.motion = el.dataset.motion; else state.density = el.dataset.density;
      persist();
      applyUi();
      const key = el.dataset.motion ? 'motion' : 'density';
      $$(`[data-${key}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[key] === state[key])));
      return;
    }
    if (el.dataset.dir) {
      state.dir = el.dataset.dir;
      persist();
      renderView();
      if (inSheet) { $$('#sheet [data-dir]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dir === state.dir))); $$('#sheet .grid').forEach((g) => g.classList.toggle('out', state.dir === 'out')); }
      return;
    }
    if (el.dataset.by) { state.by = el.dataset.by; persist(); applyVars(); $$('[data-by]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.by === state.by))); return; }
    if (el.dataset.sfxcat) { state.sfxCat = el.dataset.sfxcat; renderView(); return; }
    if (el.dataset.vibe) { state.vibe = el.dataset.vibe; renderView(); return; }
    if (el.dataset.dlen) { const p = P.find((x) => x.id === sheetCtx.id); setFrames(p, p.f * Number(el.dataset.dlen)); return; }
    if (el.dataset.cid) {
      const c = CURVE_LIB.concat(state.myCurves).find((x) => x.id === el.dataset.cid);
      Object.assign(ce, { b: c.b.slice(), name: c.name, special: !!c.special, baseId: c.id, dirty: false });
      renderCeLib();
      drawCe();
      return;
    }
    const act = el.dataset.act;
    const tile = el.closest('.tile');
    const p = tile ? P.find((x) => x.id === tile.dataset.id) : null;
    const row = el.closest('.sfx');
    const sp = sheetCtx.id ? P.find((x) => x.id === sheetCtx.id) : null;
    switch (act) {
      case 'apply': if (p && !inSheet) apply(p, tile); break;
      case 'qa': { const qp = P.find((x) => x.id === el.dataset.id); if (qp) apply(qp, el); break; }
      case 'go': go(el.dataset.route); break;
      case 'q-clear': state.q = ''; renderView(); break;
      case 'ctx-refresh': lastCtxKey = ''; refreshContext(); break;
      case 'sw-rail': state.railWide = !state.railWide; persist(); applyUi(); el.setAttribute('aria-checked', String(state.railWide)); break;
      case 'fav':
        if (!p) break;
        toggleFav(p.id);
        el.setAttribute('aria-pressed', String(state.favs.has(p.id)));
        el.parentElement.classList.toggle('has-fav', state.favs.has(p.id));
        renderCats();
        toast('ok', state.favs.has(p.id) ? `${p.name} épinglé aux favoris` : `${p.name} retiré des favoris`, '');
        if (state.cat === 'fav' && !state.q) renderView(); else renderCats();
        break;
      case 'dminus': case 'dplus':
        if (p) setFrames(p, framesOf(p) + (act === 'dplus' ? 1 : -1) * (e.shiftKey ? 5 : 1));
        break;
      case 'more': if (p) openDetail(p); break;
      case 'close': if (!pvRun) closeSheet(); break;
      case 'pv-ask': openPvConfirm(el.dataset.scope === 'all' ? pvList() : pvMissing()); break;
      case 'pv-one': if (sp) openPvConfirm([sp], `Preview de ${sp.name}`); break;
      case 'pv-run': if (!pvRun && sheetCtx.list) runPreviews(sheetCtx.list); break;
      case 'pv-stop': if (YX.pvgen.current) { YX.pvgen.current.stop = true; el.disabled = true; el.textContent = 'Arrêt après le rendu en cours…'; } break;
      case 'pv-open': { const d = YX.store.previewDir(); if (d) YX.store.open(d); break; }
      case 'pv-convert': convertMine(); break;
      case 'd-minus': case 'd-plus': if (sp) setFrames(sp, framesOf(sp) + (act === 'd-plus' ? 1 : -1) * (e.shiftKey ? 5 : 1)); break;
      case 'd-curve': if (sp) openCurve(sp.id); break;
      case 'd-curve-reset': if (sp) { cust(sp.id).c = undefined; persist(); refreshTile(sp); syncDetail(sp); } break;
      case 'apply-detail': { const pp = P.find((x) => x.id === el.dataset.id); closeSheet(); apply(pp, $(`#view .tile[data-id="${pp.id}"]`)); break; }
      case 'fav-detail': { const id = el.dataset.id; toggleFav(id); el.textContent = state.favs.has(id) ? '★ Retirer' : '☆ Favori'; renderCats(); renderView(); break; }
      case 'play': if (row) playSfx(findSfx(row.dataset.sfx), el, row.querySelector('canvas')); break;
      case 'cti': if (row) placeSfx(findSfx(row.dataset.sfx), 'cti'); break;
      case 'markers': if (row) placeSfx(findSfx(row.dataset.sfx), 'markers'); break;
      case 'open-sfx': { const r = YX.store.sfxRoot(); if (r) YX.store.open(r); break; }
      case 'rescan': state.sfx = YX.store.listSfx(); renderView(); toast('ok', state.sfx.length + ' son(s) trouvé(s)', YX.store.sfxRoot() || ''); break;
      case 'sw-auto': state.autoplay = !state.autoplay; persist(); el.setAttribute('aria-checked', String(state.autoplay)); syncAuto(); break;
      case 'sw-sfx': state.sfxAuto = !state.sfxAuto; persist(); el.setAttribute('aria-checked', String(state.sfxAuto)); break;
      case 'reset-cust': state.cust = {}; persist(); refreshSettings(); toast('ok', 'Durées et courbes remises par défaut', 'tous les presets'); break;
      case 'relock': closeSheet(); YX.licence.deactivate(); lock(); break;
      case 'assets-pick': pickAssets(); break;
      case 'assets-open': if (state.env && state.env.assets) YX.store.open(state.env.assets); break;
      case 'tool': {
        const id = el.dataset.id;
        YX.bridge.call('apply', { id, params: {} }).then((r) => toast('ok', r.msg, '')).catch((err) => toast('err', err.message, ''));
        break;
      }
      case 'autotest-ask': openAutotestConfirm(); break;
      case 'autotest-run': closeSheet(); toast('soon', 'Auto-test en cours…', 'AE peut figer quelques secondes'); setTimeout(() => runTool('autotest', 'Auto-test terminé : rapport ouvert').then((r) => { if (r && typeof r.ok === 'number') toast(r.ko ? 'err' : 'ok', `Auto-test : ${r.ok} OK, ${r.ko} échec(s), ${r.skip} ignoré(s)`, r.path || ''); }), 50); break;
      case 'dump': runTool('dump', 'Dump écrit et ouvert'); break;
      case 'effects': runTool('effects', 'Liste des effets écrite et ouverte'); break;
      case 'log': runTool('openLog', 'Log ouvert'); break;
      case 'reload-engine': closeSheet(); initEngine(true); break;
      case 'reload-panel': window.location.reload(); break;
      case 'ce-copy': {
        const txt = $('#ceCode').textContent;
        toast('ok', copyText(txt) ? 'Copié' : 'Copie bloquée : sélectionne le texte', txt);
        break;
      }
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
        if (ce.target === 'global') { state.curve = c; persist(); applyVars(); renderView(); closeSheet(); toast('ok', `Courbe ${c.name} par défaut`, easeCss(c)); }
        else if (ce.target === 'keys') {
          YX.bridge.call('apply', { id: 'ease', params: { curve: { b: c.b, special: !!c.special, name: c.name } } })
            .then((r) => { closeSheet(); toast('ok', r.msg, easeCss(c) + ' · Ctrl+Z annule'); })
            .catch((err) => toast('err', err.message, err.user ? 'Sélectionne tes keyframes dans la timeline, puis réessaie.' : ''));
        } else { const pp = P.find((x) => x.id === ce.target); cust(pp.id).c = c; persist(); refreshTile(pp); openDetail(pp); toast('ok', `Courbe ${c.name} pour ${pp.name}`, easeCss(c)); }
        break;
      }
      case 'ce-back': { const pp = P.find((x) => x.id === el.dataset.id); openDetail(pp); break; }
      default: break;
    }
  });
  $('#sheet').addEventListener('click', (e) => { if (e.target === $('#sheet') && !pvRun) closeSheet(); });

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
  $('#ctx').addEventListener('click', () => { if (!YX.bridge.inCEP) YX.mockState.sel++; refreshContext(); });
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
      state.env = await YX.bridge.call('env');
      if (!state.env.assets && YX.store.devAssets()) {
        const r = await YX.bridge.call('setAssets', { path: YX.store.devAssets() });
        state.env.assets = r.assets;
      }
      YX.store.setAssets(state.env.assets);
      state.sfx = YX.store.listSfx();
      state.engine = 'ok';
      if (manual) toast('ok', 'Moteur rechargé', `v${state.info.version} · build ${state.info.build} · ${state.ready.size} presets`);
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
    setTimeout(() => { $('#gate').hidden = true; }, 460);
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
  YX.app = { state, initEngine, refreshContext };
})();
