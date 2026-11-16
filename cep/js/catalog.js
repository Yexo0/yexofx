/* YexoFX : catalogue des presets affichés dans le panel.
   Un preset n'est cliquable que si le moteur (cep/host) le connaît : voir YX.ready dans app.js. */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};

  const CATS = [
    { id: 'impacts', label: 'Impacts', cmd: 'ls ~/presets/impacts' },
    { id: 'text', label: 'Texte', cmd: 'ls ~/presets/texte' },
    { id: 'shake', label: 'Shake', cmd: 'ls ~/presets/shake' },
    { id: 'twitch', label: 'Twitch', cmd: 'ls ~/presets/twitch' },
    { id: 'speed', label: 'Vitesse', cmd: 'ls ~/presets/vitesse' },
    { id: 'trans', label: 'Transitions', cmd: 'ls ~/presets/transitions' },
    { id: 'fx', label: 'FX', cmd: 'ls ~/presets/fx' },
    { id: 'styles', label: 'Styles', cmd: 'ls ~/presets/styles' },
    { id: 'audio', label: 'Audio', cmd: 'ls ~/sfx' },
    { id: 'fav', label: 'Favoris', cmd: 'cat ~/.yexofx/favoris' },
  ];
  const VIBES = { clean: 'clean', aggro: 'agressif', smooth: 'smooth', glitch: 'glitch', retro: 'rétro' };
  // f = durée par défaut en images (ou 'loop' pour un effet continu). rx = recette (effets combinés).
  const P = [
    // Impacts : combos posés au CTI (ou sur chaque marker)
    { id: 'killhit', cat: 'impacts', name: 'Kill Hit', sb: 'shake + RGB + flash', vibe: 'aggro', f: 8, sfx: 'impact_02', rx: ['Impact shake', 'RGB split léger · 4 f', 'Flash exposure · 2 f'], desc: "Le combo de base sur un kill : une secousse qui s'amortit, un petit écart RGB au moment du coup et un flash d'exposition de 2 images." },
    { id: 'shaketwitch', cat: 'impacts', name: 'Shake + Twitch', sb: 'secousse + sauts de scale', vibe: 'aggro', f: 10, sfx: 'impact_05', rx: ['Impact shake', 'Twitch scale · 3 sauts', 'Motion blur'], desc: 'La secousse d\'impact ponctuée de sauts de scale aléatoires, façon Twitch. Nerveux sans être illisible.' },
    { id: 'rgbpunch', cat: 'impacts', name: 'RGB Punch', sb: 'zoom punch + RGB', vibe: 'aggro', f: 8, sfx: 'impact_05', rx: ['Zoom punch +22 %', 'RGB split · 6 f', 'Retour avec la courbe'], desc: 'Un coup de zoom vers le réticule pendant que les canaux rouge et bleu s\'écartent, puis tout se recolle.' },
    { id: 'hspop', cat: 'impacts', name: 'Headshot Pop', sb: 'zoom réticule + blur', vibe: 'clean', f: 10, sfx: 'click_02', rx: ['Zoom vers le centre', 'Radial blur · 4 f', 'Flash · 2 f'], desc: 'Zoom rapide centré sur le réticule avec un flou radial, puis retour propre. Pour souligner un one-tap.' },
    { id: 'bassdrop', cat: 'impacts', name: 'Bass Drop', sb: 'secousse lourde + expo', vibe: 'aggro', f: 14, sfx: 'bassdrop_01', rx: ['Shake vertical lourd', 'Exposure +1,5', 'RGB split · 4 f'], desc: 'Secousse verticale lourde et surexposition, à caler sur un drop.' },
    { id: 'flicker', cat: 'impacts', name: 'Flicker', sb: "strobe d'exposition", vibe: 'glitch', f: 6, rx: ['Exposure · 3 pulses', 'Posterize time'], desc: 'Trois flashs d\'exposition très courts, effet stroboscope.' },
    { id: 'choppy', cat: 'impacts', name: 'Choppy Hit', sb: 'saccadé + shake', vibe: 'glitch', f: 12, rx: ['Posterize time 12 i/s', 'Impact shake'], desc: "L'image passe en saccadé pendant l'impact, puis reprend sa fluidité." },
    { id: 'glowhit', cat: 'impacts', name: 'Glow Hit', sb: "bloom sur l'impact", vibe: 'clean', f: 12, rx: ['Glow natif ou Deep Glow', 'Exposure +0,6', 'Retombée 12 f'], desc: 'Les hautes lumières s\'embrasent puis retombent. Utilise Deep Glow s\'il est installé, sinon le Glow natif.' },
    { id: 'lenspunch', cat: 'impacts', name: 'Lens Punch', sb: 'bulge + scale', vibe: 'clean', f: 10, rx: ['Optics Compensation', 'Scale +16 %', 'Vignette éclair'], desc: "L'image se bombe comme un objectif fisheye pendant un instant." },
    { id: 'freezehit', cat: 'impacts', name: 'Freeze Hit', sb: 'arrêt sur image + zoom', vibe: 'clean', f: 18, rx: ['Freeze frame', 'Zoom lent +7 %', 'Désaturation', 'Flash à la reprise'], desc: "L'image se fige sur le kill, zoome doucement en noir et blanc, puis repart avec un flash." },
    // Texte
    { id: 'pop', cat: 'text', name: 'Pop', sb: 'scale · overshoot', vibe: 'clean', f: 12, w: 'ACE', sfx: 'click_02', rx: ['Animator scale', 'Sélecteur expression', 'Délai entre lettres'], desc: 'Chaque lettre surgit avec un léger dépassement, puis se pose. L\'anim la plus polyvalente.' },
    { id: 'slide', cat: 'text', name: 'Slide', sb: 'position · 4 directions', vibe: 'clean', f: 14, w: 'CLUTCH', sfx: 'whoosh_01', rx: ['Animator position', 'Masque de ligne', 'Direction réglable'], desc: 'Les lettres montent depuis la ligne de base avec un easing fort.' },
    { id: 'blur', cat: 'text', name: 'Blur', sb: 'flou · fondu', vibe: 'smooth', f: 16, w: 'HEADSHOT', rx: ['Animator blur', 'Opacité', 'Scale 115 %'], desc: 'Les lettres sortent du flou une par une, avec un léger zoom.' },
    { id: 'type', cat: 'text', name: 'Typewriter', sb: 'frappe · curseur', vibe: 'clean', f: 24, w: 'gg ez', sfx: 'click_02', rx: ['Révélation par lettre', 'Curseur clignotant'], desc: 'Le texte se tape lettre par lettre, avec un curseur clignotant en option.' },
    { id: 'glitch', cat: 'text', name: 'Glitch', sb: 'jitter · RGB split', vibe: 'glitch', f: 10, w: 'ACE', sfx: 'glitch_04', rx: ['Position aléatoire par lettre', 'RGB split'], desc: 'Décalages aléatoires par lettre et split RGB rapide, pour un kill nerveux.' },
    { id: 'stomp', cat: 'text', name: 'Stomp', sb: 'chute + secousse', vibe: 'aggro', f: 10, w: 'ACE', sfx: 'impact_02', rx: ['Chute par lettre', 'Écrasement', 'Shake à l\'atterrissage'], desc: 'Les lettres tombent d\'en haut et secouent l\'image en touchant le sol.' },
    { id: 'feed', cat: 'text', name: 'Kill Feed', sb: 'bandeau qui glisse', vibe: 'clean', f: 14, w: 'YEXO', rx: ['Bandeau + barre rouge', 'Slide depuis la droite'], desc: 'Un bandeau de kill feed qui glisse depuis la droite, comme dans le jeu.' },
    { id: 'flip', cat: 'text', name: 'Flip 3D', sb: 'rotation par lettre', vibe: 'clean', f: 14, w: 'RETAKE', rx: ['3D par caractère', 'Rotation X'], desc: 'Chaque lettre bascule en 3D autour de sa base.' },
    { id: 'track', cat: 'text', name: 'Tracking', sb: 'espacement', vibe: 'smooth', f: 20, w: 'VICTORY', rx: ['Tracking', 'Flou de mouvement'], desc: "L'espacement se resserre jusqu'au mot final." },
    { id: 'scramble', cat: 'text', name: 'Scramble', sb: 'décodage', vibe: 'glitch', f: 24, w: 'DEFUSED', rx: ['Character offset', 'Résolution par lettre'], desc: 'Des caractères aléatoires se résolvent un à un en texte lisible.' },
    { id: 'wave', cat: 'text', name: 'Wave', sb: 'jelly continu', vibe: 'smooth', f: 'loop', w: 'gg wp', rx: ['Position Y sinusoïdale', 'Scale Y'], desc: 'Une vague continue traverse le texte.' },
    { id: 'kin', cat: 'text', name: 'Kinetic', sb: 'mots sur markers', vibe: 'aggro', f: 10, w: 'NO SCOPE', rx: ['Un mot par marker', 'Scale punch'], desc: 'Chaque mot arrive sur un marker posé au rythme de la musique.' },
    // Shake
    { id: 'smooth', cat: 'shake', name: 'Smooth', sb: 'dérive lente + flou', vibe: 'smooth', f: 'loop', rx: ['Wiggle 1,2 Hz', 'Rotation ±0,7°', 'Motion blur', 'Motion Tile'], desc: 'Mouvement lent et flottant avec du motion blur. Pour les intros et les edits slowed.' },
    { id: 'hand', cat: 'shake', name: 'Handheld', sb: 'caméra à la main', vibe: 'clean', f: 'loop', rx: ['Wiggle 4 Hz', 'Amplitude 6 px', 'Motion Tile'], desc: 'Un léger tremblement continu de caméra tenue à la main.' },
    { id: 'twitchy', cat: 'shake', name: 'Twitchy', sb: 'immobile puis rafales', vibe: 'aggro', f: 'loop', rx: ['Rafales aléatoires', 'Fréquence des rafales', 'Immobilité réglable'], desc: 'Alterne immobilité et rafales de secousse, dans l\'esprit du mode Twitchy de S_Shake, en natif.' },
    { id: 'jumpy', cat: 'shake', name: 'Jumpy', sb: 'sauts + dérive', vibe: 'aggro', f: 'loop', rx: ['Sauts soudains', 'Dérive lente entre deux'], desc: 'Des secousses soudaines séparées par une dérive lente.' },
    { id: 'impact', cat: 'shake', name: 'Impact', sb: 'decay sur markers', vibe: 'aggro', f: 12, sfx: 'impact_02', rx: ['Secousse amortie', 'Déclenchée sur markers'], desc: 'Une secousse forte qui s\'amortit, sur chaque marker du calque YFX.' },
    { id: 'hor', cat: 'shake', name: 'Horizontal', sb: 'impact en X', vibe: 'aggro', f: 10, rx: ['Secousse X amortie'], desc: 'Impact uniquement à l\'horizontale, pour les tirs et les whips.' },
    { id: 'ver', cat: 'shake', name: 'Vertical', sb: 'impact en Y', vibe: 'aggro', f: 10, rx: ['Secousse Y amortie'], desc: 'Impact uniquement à la verticale, pour les drops et les sauts.' },
    { id: 'rumble', cat: 'shake', name: 'Rumble', sb: 'grondement continu', vibe: 'smooth', f: 40, sfx: 'riser_01', rx: ['Vibration basse fréquence', 'Montée et descente douces'], desc: 'Une vibration basse et continue, pour accompagner un riser ou une ult.' },
    { id: 'roll', cat: 'shake', name: 'Roll', sb: 'roulis de caméra', vibe: 'smooth', f: 'loop', rx: ['Rotation ±2,4°', 'Motion Tile'], desc: 'La caméra roule doucement de gauche à droite.' },
    // Twitch (opérateurs façon plugin Twitch, en natif)
    { id: 'tw-scale', cat: 'twitch', name: 'Twitch Scale', sb: 'sauts de zoom', vibe: 'aggro', f: 8, rx: ['Scale aléatoire ±14 %', 'Ancre aléatoire', 'Motion blur'], desc: 'Des sauts de zoom aléatoires sur quelques images.' },
    { id: 'tw-slide', cat: 'twitch', name: 'Twitch Slide', sb: 'glissés + RGB', vibe: 'glitch', f: 8, rx: ['Position X aléatoire', 'RGB split sur le mouvement', 'Motion blur'], desc: 'L\'image glisse par à-coups, avec un écart RGB à chaque saut.' },
    { id: 'tw-light', cat: 'twitch', name: 'Twitch Light', sb: "sauts d'exposition", vibe: 'aggro', f: 8, rx: ['Exposure aléatoire ±1,5 IL'], desc: 'L\'exposition saute vers le clair et le sombre, au hasard.' },
    { id: 'tw-blur', cat: 'twitch', name: 'Twitch Blur', sb: 'flous éclair', vibe: 'smooth', f: 8, rx: ['Fast Box Blur aléatoire'], desc: 'Des flous très courts qui claquent sur le rythme.' },
    { id: 'tw-time', cat: 'twitch', name: 'Twitch Time', sb: 'sauts dans le temps', vibe: 'glitch', f: 8, rx: ['Time remap décalé ±3 images'], desc: "L'image saute quelques images en avant ou en arrière, au hasard." },
    { id: 'tw-full', cat: 'twitch', name: 'Twitch Full', sb: 'tout combiné', vibe: 'aggro', f: 10, sfx: 'glitch_04', rx: ['Scale', 'Slide + RGB', 'Light', 'Seed commune'], desc: 'Tous les opérateurs à la fois, synchronisés sur la même seed.' },
    // Vitesse
    { id: 'velocity', cat: 'speed', name: 'Velocity', sb: 'rapide › lent › rapide', vibe: 'smooth', f: 30, sfx: 'whoosh_03', rx: ['Time remapping', 'Courbe de vitesse', 'Frame blending Pixel Motion'], desc: 'La rampe classique des edits : ça accélère vers le kill, ralentit dessus, puis repart.' },
    { id: 'slowkill', cat: 'speed', name: 'Slow Kill', sb: 'ralenti sur le kill', vibe: 'smooth', f: 30, rx: ['Time remapping', 'Vitesse 25 %', 'Pixel Motion'], desc: 'Passe en ralenti au CTI et y reste.' },
    { id: 'speedup', cat: 'speed', name: 'Speed Up', sb: 'accélération', vibe: 'aggro', f: 20, rx: ['Time remapping', 'Vitesse 300 %'], desc: 'Part lentement et accélère fort vers la suite.' },
    { id: 'freeze', cat: 'speed', name: 'Freeze', sb: 'arrêt puis reprise', vibe: 'clean', f: 20, rx: ['Time remap figé', 'Reprise avec la courbe'], desc: "L'action s'arrête net sur le kill, puis reprend." },
    { id: 'rewind', cat: 'speed', name: 'Rewind', sb: 'retour arrière', vibe: 'glitch', f: 24, sfx: 'whoosh_01', rx: ['Time remap inversé', 'Lignes VHS', 'Whoosh'], desc: 'Le clip revient en arrière à toute vitesse avant de rejouer l\'action.' },
    { id: 'posterize', cat: 'speed', name: 'Choppy', sb: 'cadence 12 i/s', vibe: 'glitch', f: 'loop', rx: ['Posterize Time 12 i/s'], desc: 'Fait tomber la cadence à 12 images par seconde : look saccadé.' },
    { id: 'marker', cat: 'speed', name: 'Marker au CTI', sb: 'déclencheur', vibe: 'clean', f: 'loop', tool: 1, rx: ['Marker de calque'], desc: 'Pose un marker à la tête de lecture. Les impacts, flashs et shakes se déclenchent dessus.' },
    { id: 'beat', cat: 'speed', name: 'Beat sync', sb: 'markers sur les pics', vibe: 'clean', f: 'loop', tool: 1, rx: ['Convert Audio to Keyframes', 'Seuil réglable'], desc: 'Analyse la musique et pose un marker sur chaque pic au-dessus du seuil.' },
    { id: 'ease', cat: 'speed', name: 'Easing keys', sb: 'courbe sur tes keyframes', vibe: 'clean', f: 'loop', tool: 1, rx: ['Éditeur de courbe', 'Keyframes sélectionnées'], desc: "Ouvre l'éditeur de courbe et applique la courbe à tes propres keyframes." },
    // Transitions
    { id: 'zoom', cat: 'trans', name: 'Zoom in', sb: 'scale + blur radial', vibe: 'smooth', f: 12, sfx: 'whoosh_01', rx: ['Scale', 'Radial blur', 'Motion Tile'], desc: "Le plan sortant fonce dans l'image, le plan entrant arrive depuis le flou." },
    { id: 'zoomout', cat: 'trans', name: 'Zoom out', sb: 'recul + blur', vibe: 'smooth', f: 12, sfx: 'whoosh_03', rx: ['Scale', 'Radial blur', 'Motion Tile'], desc: "Le plan sortant recule, le plan entrant s'écrase vers sa taille." },
    { id: 'whip', cat: 'trans', name: 'Whip pan', sb: 'flou directionnel', vibe: 'smooth', f: 10, sfx: 'whoosh_01', rx: ['Position X', 'Directional blur', 'Motion Tile'], desc: 'Un panoramique éclair avec flou de mouvement entre les deux plans.' },
    { id: 'spin', cat: 'trans', name: 'Spin', sb: 'rotation 150°', vibe: 'aggro', f: 12, sfx: 'whoosh_03', rx: ['Rotation', 'Scale', 'Radial blur'], desc: "Le plan tourne et s'enchaîne sur le suivant dans le même mouvement." },
    { id: 'rgbshake', cat: 'trans', name: 'RGB Shake', sb: 'secousse verticale RGB', vibe: 'aggro', f: 12, sfx: 'impact_05', rx: ['Shake vertical', 'RGB split', 'Coupe au milieu'], desc: 'Les deux plans tremblent verticalement avec un écart RGB autour de la coupe.' },
    { id: 'whiteglitch', cat: 'trans', name: 'White Glitch', sb: 'tranches + flash', vibe: 'glitch', f: 8, sfx: 'glitch_04', rx: ['Tranches décalées', 'Flash blanc'], desc: 'Les deux plans se mélangent par tranches dans un flash blanc.' },
    { id: 'popin', cat: 'trans', name: 'Pop-in', sb: 'le plan B surgit', vibe: 'clean', f: 10, sfx: 'click_02', rx: ['Scale depuis 20 %', 'Coins arrondis', 'Courbe Back'], desc: 'Le plan suivant surgit du centre avec un dépassement.' },
    { id: 'stretch', cat: 'trans', name: 'Stretch', sb: 'étirement horizontal', vibe: 'smooth', f: 10, sfx: 'whoosh_01', rx: ['Scale X', 'Flou'], desc: "Le plan s'étire jusqu'à se fondre dans le suivant." },
    { id: 'tflash', cat: 'trans', name: 'Flash', sb: 'coupe blanche', vibe: 'clean', f: 6, sfx: 'impact_05', rx: ['Flash blanc'], desc: 'Un flash blanc masque la coupe.' },
    // FX / look
    { id: 'flash', cat: 'fx', name: 'Flash', sb: 'blanc · sur markers', vibe: 'clean', f: 4, sfx: 'impact_05', rx: ['Solide blanc YFX_Flash', 'Opacité sur markers', 'Courbe de retombée'], desc: 'Un flash blanc à chaque marker du calque YFX_Flash. Recliquer ajoute un flash au CTI.' },
    { id: 'grain', cat: 'fx', name: 'Grain', sb: 'fractal noise', vibe: 'retro', f: 'loop', rx: ['Fractal Noise en overlay', 'Taille et intensité'], desc: 'Grain film en overlay, taille et intensité réglables.' },
    { id: 'rgb', cat: 'fx', name: 'RGB léger', sb: 'aberration continue', vibe: 'glitch', f: 'loop', rx: ['Décalage R / B', 'Intensité animable'], desc: 'Un écart RGB discret et permanent qui respire.' },
    { id: 'glow', cat: 'fx', name: 'Glow', sb: 'natif · Deep Glow si installé', vibe: 'clean', f: 'loop', rx: ['Glow natif empilé', 'ou Deep Glow'], desc: 'Un halo doux sur les hautes lumières. Passe sur Deep Glow automatiquement s\'il est installé.' },
    { id: 'vhs', cat: 'fx', name: 'VHS', sb: 'scanlines · tracking', vibe: 'retro', f: 'loop', rx: ['Scanlines', 'Bande de tracking', 'Décalage couleur'], desc: 'Lignes de balayage, bande de tracking et léger décalage couleur.' },
    { id: 'vig', cat: 'fx', name: 'Vignette', sb: 'bords assombris', vibe: 'clean', f: 'loop', rx: ['Vignette Lumetri'], desc: "Assombrit les bords pour centrer l'œil sur l'action." },
    { id: 'letterbox', cat: 'fx', name: 'Letterbox', sb: 'bandes ciné animées', vibe: 'clean', f: 14, rx: ['Bandes noires', 'Entrée / sortie animées'], desc: 'Les bandes cinéma entrent sur le moment fort et ressortent ensuite.' },
    { id: 'lens', cat: 'fx', name: 'Lens', sb: 'fisheye léger', vibe: 'smooth', f: 'loop', rx: ['Optics Compensation', 'Vignette'], desc: 'Une légère déformation d\'objectif grand-angle.' },
    { id: 'leak', cat: 'fx', name: 'Light leak', sb: 'fuite de lumière', vibe: 'retro', f: 'loop', rx: ['Fractal Noise coloré', 'Mode Screen'], desc: 'Une fuite de lumière chaude générée, sans fichier externe.' },
    { id: 'cold', cat: 'fx', name: 'Froid', sb: 'color grade', vibe: 'clean', f: 'loop', rx: ['Lumetri : température −', 'Saturation +'], desc: 'Étalonnage froid via Lumetri, avant / après.' },
    { id: 'warm', cat: 'fx', name: 'Chaud', sb: 'color grade', vibe: 'clean', f: 'loop', rx: ['Lumetri : température +', 'Teinte'], desc: 'Étalonnage chaud via Lumetri, avant / après.' },
    { id: 'punchy', cat: 'fx', name: 'Punchy', sb: 'color grade', vibe: 'aggro', f: 'loop', rx: ['Lumetri : contraste +', 'Vibrance +'], desc: 'Contraste et saturation poussés, avant / après.' },
    // Styles
    { id: 'val', cat: 'styles', name: 'Valorant', sb: '#ff4655 · condensé', vibe: 'clean', f: 'loop', w: 'ACE', rx: ['Couleur', 'Contour blanc', 'Barre'], desc: 'Rouge Valorant, contour blanc, typo condensée et barre de soulignement.' },
    { id: 'cs2', cat: 'styles', name: 'CS2', sb: 'orange · gris', vibe: 'clean', f: 'loop', w: 'CLUTCH', rx: ['Couleur', 'Ombre en relief'], desc: 'Orange CS2 et ombre grise en relief.' },
    { id: 'neon', cat: 'styles', name: 'Néon', sb: 'glow lavande', vibe: 'retro', f: 'loop', w: 'gg', rx: ['Glow empilé', 'Scintillement'], desc: 'Tube néon lavande avec un léger scintillement.' },
    { id: 'double', cat: 'styles', name: 'Double contour', sb: 'noir · lavande', vibe: 'clean', f: 'loop', w: 'ACE', rx: ['Contour texte', 'Layer style Stroke'], desc: 'Deux contours empilés, couleurs réglables.' },
    { id: 'grad', cat: 'styles', name: 'Gradient', sb: 'dégradé animé', vibe: 'smooth', f: 'loop', w: '1v5', rx: ['Gradient Ramp calé sur le texte'], desc: 'Un dégradé qui glisse dans les lettres.' },
    { id: 'glitchs', cat: 'styles', name: 'Glitch', sb: 'RGB figé', vibe: 'glitch', f: 'loop', w: 'ACE', rx: ['RGB split fixe', 'Sauts ponctuels'], desc: 'Décalage RGB permanent avec des sauts ponctuels.' },
  ];

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

  YX.catalog = { CATS, VIBES, P, CURVE_LIB, QUICK_CURVES };
})();
