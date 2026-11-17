/* YexoFX : catalogue affiché dans le panel (v1.0).
   Les données viennent de js/catalog.data.js, GÉNÉRÉ par tools/catalog.mjs depuis catalog/*.json. Ce fichier les adapte
   pour le panel (libellés français, recette lisible) et garde les courbes. Un preset est cliquable si le moteur connaît
   toutes ses primitives (recette) ou son id (preset natif v0.6) : voir isReady dans app.js. */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};
  const D = YX.catalogData || { cats: [], styles: [], presets: [], packs: [], synonyms: [], prims: {} };

  const EFFECT_CATS = D.cats.map((c) => ({ id: c.id, label: c.label, en: c.en }));
  const LIB = [
    { id: 'packs', label: 'Packs de style' },
    { id: 'stack', label: 'Pile & perso' },
    { id: 'coll', label: 'Collections' },
    { id: 'fav', label: 'Favoris' },
    { id: 'audio', label: 'Audio' },
  ];
  const CATS = EFFECT_CATS.concat(LIB);
  const STYLES = D.styles || [];
  const STYLE = {};
  STYLES.forEach((s) => { STYLE[s.id] = s; });

  const ROLES = { in: 'entrée', hit: 'impact', hold: 'maintien', out: 'sortie', transition: 'transition' };
  const PERF = { leger: 'léger', moyen: 'moyen', lourd: 'lourd' };
  const NEEDS = { comp: 'aucune sélection', any: 'rien, ou tes calques', layer: 'un calque', av: 'un clip', text: 'un calque texte', audio: 'un calque audio', two: '2 clips' };

  // Libellés français des primitives et des valeurs de choix les plus courantes.
  const PRIM_FR = {
    shake: 'Secousse', twitch: 'Twitch', punch: 'Punch', drift: 'Dérive', stretch: 'Étirement', flip: 'Retournement',
    timeRemap: 'Vitesse', posterizeTime: 'Cadence', echo: 'Écho', dirBlur: 'Flou directionnel', radialBlur: 'Flou radial', blur: 'Flou',
    exposure: 'Exposition', flash: 'Aplat', invert: 'Inversion', grade: 'Lumetri', levels: 'Niveaux', hueSat: 'Teinte / saturation',
    colorBalance: 'Balance des couleurs', duotone: 'Bichromie', bw: 'Noir et blanc', leaveColor: 'Couleur unique', glow: 'Glow',
    rays: 'Rayons', flare: 'Lens flare', lightLeak: 'Fuite de lumière', vignette: 'Vignette', sharpen: 'Netteté', rgbSplit: 'Écart RGB',
    waveWarp: 'Ondulation', lens: 'Objectif', warp: 'Distorsion', blocks: 'Glitch de blocs', pixelate: 'Mosaïque', posterize: 'Aplats',
    ink: 'Encre', halftone: 'Trame', scanlines: 'Scanlines', grain: 'Grain', mirror: 'Miroir', speedLines: 'Lignes de vitesse',
    wipe: 'Volet', layer3d: 'Transition 3D', textReveal: 'Révélation', textRandom: 'Texte aléatoire', typewriter: 'Machine à écrire',
    textWave: 'Vague', textKinetic: 'Kinetic', textStyle: 'Style de texte', textShadow: 'Ombre', textFill: 'Remplissage', textCounter: 'Compteur',
    hud: 'HUD', textLayer: 'Texte créé', particles: 'Particules', camera: 'Caméra 3D', parallax: 'Profondeur',
  };
  const VAL_FR = {
    decay: 'amortie', wiggle: 'continue', bursts: 'rafales', jumps: 'sauts', rumble: 'grondement', roll: 'roulis', recoil: 'recul',
    heartbeat: 'battement', quake: 'séisme', drunk: 'tangage', step: 'stop-motion', xy: 'X et Y', x: 'X', y: 'Y', diag: 'diagonale', rot: 'rotation',
    scale: 'zoom', posx: 'glissé X', posy: 'glissé Y', push: 'avance', pull: 'recul', panx: 'pan X', pany: 'pan Y', dutch: 'bascule',
    velocity: 'velocity', slowmo: 'ralenti', speedup: 'accélère', freeze: 'gel', rewind: 'rembobine', stutter: 'bégaie', boomerang: 'boomerang',
    steps: 'paliers', ramp: 'montée', reverse: 'envers', zoom: 'zoom', spin: 'rotatif', box: 'box', gauss: 'gaussien', fisheye: 'fisheye',
    bulge: 'bombé', sphere: 'sphère', turbulent: 'turbulence', twirl: 'tourbillon', ripple: 'ondes', shift: 'tranches', mosh: 'datamosh',
    sort: 'pixel sort', threshold: 'seuil', edges: 'contours', mirror: 'miroir', kaleida: 'kaléidoscope', polar: 'polaire', radial: 'radiales',
    horizontal: 'horizontales', linear: 'linéaire', clock: 'horloge', iris: 'iris', venetian: 'stores', block: 'blocs', luma: 'luma', grid: 'grille',
    flip: 'flip', cube: 'cube', swing: 'swing', slide3d: 'slide 3D', fold: 'pliage', glitch: 'glitch', scramble: 'décodage', flicker: 'grésille',
    word: 'mot à mot', stack: 'empilés', highlight: 'surlignage', outline: 'contour', halo: 'halo', extrude: 'relief', long: 'ombre longue',
    offset: 'décalage', gradient: 'dégradé', chrome: 'chrome', sweep: 'reflet', count: 'compteur', markers: 'markers', timer: 'chrono',
    fine: 'fin', film: 'film', digital: 'numérique', dust: 'poussière', stars: 'étoiles', sparks: 'étincelles', snow: 'neige', embers: 'braises',
    orbit: 'orbite', tilt: 'tilt', pan: 'pan', crane: 'grue', dollyzoom: 'dolly zoom', shake3d: 'secousse 3D', layers: 'calques', depth: 'relief',
    cylinder: 'cylindre', hitmarker: 'hitmarker', crosshair: 'viseur', killfeed: 'kill feed', letterbox: 'letterbox', frame: 'cadre',
    perforation: 'pellicule', rec: 'REC', scoreboard: 'score', playerbar: 'barre joueur', lowerthird: 'lower third', brackets: 'crochets', cases: 'case BD',
    normal: 'normal', add: 'addition', screen: 'écran', multiply: 'produit', difference: 'différence', overlay: 'incrustation',
  };
  const SHAPE_FR = { decay: 'retombe', attack: 'monte', bell: 'cloche', hold: 'tenu', ramp: 'rampe', pulse: 'pulsations', strobe: 'strobe', steps: 'paliers' };
  const fr = (v) => VAL_FR[v] || v;

  // « Secousse · amortie · X » ; « Aplat · #ff2d2d · addition » ; « Volet · iris »…
  const stepLabel = (s) => {
    const bits = [PRIM_FR[s.p] || s.p];
    ['pattern', 'kind', 'channel', 'shape', 'type', 'move', 'mode', 'axis'].forEach((k) => {
      if (s[k] !== undefined && typeof s[k] === 'string' && !(k === 'axis' && s[k] === 'xy')) bits.push(fr(s[k]));
    });
    if (Array.isArray(s.channels)) bits.push(s.channels.map(fr).join(' + '));
    if (s.color && /^#/.test(s.color)) bits.push(s.color);
    if (s.blend && s.blend !== 'normal') bits.push(fr(s.blend));
    if (s.word) bits.push('« ' + s.word + ' »');
    if (s.env && typeof s.env === 'object') bits.push(SHAPE_FR[s.env.shape] || s.env.shape);
    return bits.join(' · ');
  };

  const P = D.presets.map((p) => Object.assign({}, p, {
    cat: p.category,
    sb: p.sub || '',
    f: p.defaults && p.defaults.frames !== undefined ? p.defaults.frames : 12,
    w: (p.preview && p.preview.word) || 'ACE',
    rx: (p.recipe || []).map(stepLabel),
    vibe: p.styles[0],
    rank: typeof p.rank === 'number' ? p.rank : 40,
  }));
  const byId = new Map(P.map((p) => [p.id, p]));

  // Courbes : bézier cubiques (comme cubic-bezier.com / Flow). Elastic = courbe spéciale calculée en expression.
  const CURVE_LIB = [
    { id: 'linear', name: 'Linear', b: [0, 0, 1, 1] },
    { id: 'expo', name: 'Expo', b: [0.16, 1, 0.3, 1] },
    { id: 'back', name: 'Back', b: [0.34, 1.56, 0.64, 1] },
    { id: 'quint', name: 'Quint', b: [0.22, 1, 0.36, 1] },
    { id: 'smooth', name: 'Smooth', b: [0.65, 0, 0.35, 1] },
    { id: 'snap', name: 'Snap', b: [0.05, 0.9, 0.1, 1] },
    { id: 'antic', name: 'Anticipate', b: [0.68, -0.55, 0.27, 1.55] },
    { id: 'aggro', name: 'Agressive', b: [0.9, 0, 0.1, 1] },
    { id: 'elastic', name: 'Elastic', b: [0.3, 1.9, 0.45, 0.9], special: true },
  ];
  const QUICK_CURVES = ['expo', 'back', 'quint', 'smooth', 'snap'];
  // Compatibilité : anciennes « vibes » -> nom court du style principal.
  const VIBES = {};
  STYLES.forEach((s) => { VIBES[s.id] = s.short; });

  YX.catalog = {
    CATS, EFFECT_CATS, LIB, STYLES, STYLE, P, byId, ROLES, PERF, NEEDS, PACKS: D.packs || [], SYN: D.synonyms || [], PRIMS: D.prims || {},
    PRIM_FR, stepLabel, CURVE_LIB, QUICK_CURVES, VIBES,
  };
})();
