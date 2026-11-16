# YexoFX : architecture

État au 2026-11-16 : **v0.5.0**. Les 73 presets du catalogue sont codés et validés sur un AE simulé ; le moteur v0.4
a tourné dans AE 25.1 chez Yexo (Kill Hit + markers OK). L'auto-test v0.5 dans AE reste à faire.

## Historique des décisions
- Cahier des charges initial : panel ScriptUI (ES3). Livraison 1 « Core » faite en ScriptUI.
- Pivot (retour de Yexo) : ScriptUI trop austère → **extension CEP** comme Motion Bro, interface HTML dans la DA de
  yexofps.org, vidéos de preview, licence pour restreindre l'accès. Le moteur ExtendScript est conservé.
- Maquette v0.3 validée (`design/maquette-panel.html`, publiée en artifact privé) : 73 presets pensés en combos
  d'edit, durée par preset, éditeur de courbe façon Flow, filtre par vibe.
- Licence : clé liée au PC, signée Ed25519, vérifiée hors ligne (pas de serveur).
- v0.5 (« plus jolie et plus simple ») : rail d'icônes à gauche, recherche + ligne de contexte en haut, cartes vidéo
  4:5 avec titre en surimpression, dock intensité / courbe en bas, statut réduit à un point.
- RGB split natif : 2 calques d'effets en mode Éclaircir (Channel Mixer garde le rouge ou le bleu) + Transform décalé.

## Structure
```
cep/                       l'extension (lien vers %APPDATA%\Adobe\CEP\extensions\com.yexo.yexofx en dev)
  CSXS/manifest.xml        AEFT 22+, CSXS 9+, Node.js activé (--enable-nodejs --mixed-context)
  index.html               rail, en-tête, vue, dock, feuilles, écran de licence
  css/yexofx.css           previews, feuilles, éditeur de courbe, licence (issus de la maquette)
  css/layout.css           mise en page v0.5 (rail, cartes, dock, pastilles)
  js/catalog.js            catalogue affiché (73 presets, catégories, vibes, courbes)
  js/previews.js           vignettes CSS (ou vidéo <assets>/previews/<id>.webm si présente)
  js/pvgen.js              génération des vidéos : boucle pvRender + compression ffmpeg (VP9 432x540)
  js/bridge.js             evalScript -> YFX.api.call(json) ; moteur simulé hors AE
  js/store.js              préférences (%APPDATA%\YexoFX\panel.json), SFX sur disque, vidéos, ouverture de dossiers
  js/licence.js, pubkey.js vérification de la clé (Node crypto) + ID machine (MachineGuid Windows haché)
  js/app.js                logique du panel
  host/yexofx_host.jsx     moteur GÉNÉRÉ par build.mjs depuis src/
src/                       moteur ExtendScript (ES3, lint au build)
  00_header  10_utils  20_core  30_text  31_styles  35_kit  40_shake  41_fx  42_impacts  43_twitch  44_trans
  50_timing  60_audio  70_previews  80_devtools  85_api  99_footer
tools/                     install_dev.cmd, uninstall_dev.cmd, licence.mjs (keygen | machine | issue)
keys/                      clé privée (NE JAMAIS distribuer) + clé publique + licences émises
tests/                     host.smoke.mjs (AE simulé, tous les presets, expressions évaluées), panel.dom.cjs (jsdom)
```
L'ordre des modules compte (tri alphabétique) : `42_impacts` utilise `Y.shake.preset` de `40_shake`.

## API moteur (`YFX.api.call`)
`ping`, `presets` (ids codés : le panel n'active que ceux-là, les autres sont « bientôt »), `context` (comp, CTI,
sélection), `env` (assets, écriture, effets tiers), `setAssets`, `apply {id, params}`, `sfx {path, mode cti|markers}`,
`autotest`, `dump`, `effects`, `openLog`, `pvInfo`, `pvBegin`, `pvRender {id, kind hit|text|cut, word, params, keep}`,
`pvEnd`. Réponse `{ok, data}` ou `{ok:false, error, user}`. Aucune boîte de dialogue côté moteur.

## Vidéos de preview
- Moteur (`70_previews`) : `pvBegin` choisit la source (calque footage/précomp sélectionné, temps source au CTI, sinon
  scène de démo `YFX_PV_Scene` 6 s : 2 plans fond dégradé + grille + cible qui « meurt » sous le viseur à 1,2 s / 4,2 s),
  repère le modèle de sortie H.264 le plus léger (sinon Lossless) et décoche la file de rendu de l'utilisateur.
- `pvRender` : comp `YFX_PV_<id>` 1080x1352, 60 i/s, 2 s, demi-résolution (« Current Settings »). Kill à 0,7 s (CTI des
  impacts), texte qui entre à 0,3 s, coupe à 1,0 s pour les transitions (plan B = source + 1,5 s). Le preset passe par
  `Y.exec` avec comp et sélection explicites, puis `renderQueue.render()` (bloquant) et la comp est supprimée.
- `pvEnd` : supprime le dossier `YFX_Previews` et les solides `YFX_*_1080x1352` inutilisés, rétablit la file de rendu.
- Panel (`pvgen.js`) : un appel `pvRender` par preset (le panel reste à jour entre deux), compression ffmpeg en
  parallèle du rendu suivant, `?v=<mtime>` dans l'URL pour recharger une preview regénérée. WebM prioritaire ; MP4
  seulement si `canPlayType('video/mp4')` (le Chromium de CEP n'a pas forcément le H.264).

Paramètres d'un preset : `frames` (durée), `intensity` (0..2), `curve {b:[x1,y1,x2,y2], special, name}`, `dir`, `by`.

## Presets (v0.5)
- **Texte** (animators + sélecteur d'expression) : Pop, Slide, Blur, Flip, Tracking, Stomp, Glitch, Scramble, Wave,
  Kinetic (mots sur markers), Typewriter (Source Text), Kill feed (texte + fond shape).
- **Styles** : Valorant, CS2, Neon, Double, Dégradé, Glitch (police trouvée parmi une liste, sinon police actuelle).
- **Shake** (Motion Tile + Transform) : Impact, Horizontal, Vertical, Smooth, Handheld, Twitchy, Jumpy, Rumble, Roll.
- **Impacts** (combos) : Kill Hit, Shake + Twitch, RGB Punch, Headshot Pop, Bass Drop, Flicker, Choppy, Glow Hit, Lens Punch.
- **Twitch** : Scale, Slide (+ RGB), Light, Blur, Full.
- **Vitesse** (une expression Time Remapping combinée) : Velocity, Slow Kill, Speed Up, Freeze, Rewind, Twitch time,
  Freeze Hit ; Choppy (Posterize Time), Marker, Beat sync (Convert Audio to Keyframes + pics), Easing des keys.
- **Transitions** (calque d'effets centré sur la coupe) : Zoom in/out, Whip, Spin, RGB Shake, White Glitch, Stretch,
  Flash, Pop-in (2 calques).
- **FX** : Flash, Grain, Vignette, Light leak, Letterbox, RGB léger, Glow (Deep Glow si installé), VHS, Lens,
  étalonnages Lumetri Cold / Warm / Punchy.

## Principes
- matchNames partout ; propriétés d'effets trouvées par matchName puis nom (`Y.p.prop`, `Y.fxe`).
- Réglages = Expression Controls `YFX_<Preset>_*` sur le calque concerné (Durée, Amplitude, Fréquence, Axe, Mode,
  CourbeP1/P2…). Courbe = bézier cubique évaluée dans l'expression (`yfxBez`, même rendu que l'éditeur du panel).
- Enveloppes pilotées par markers (`Y.kit.envCode`) : calques YFX = tous leurs markers ; calques de l'utilisateur =
  markers dont le commentaire est le nom du preset. Une musique sélectionnée avec markers sert de déclencheur.
- Transitions : fenêtre en cloche centrée sur la coupe (`Y.kit.bellCode`).
- 1 action = 1 undo group (`Y.exec`, finally). Erreurs utilisateur (`Y.fail`) affichées telles quelles par le panel.
- UI compatible Chromium de CEP : pas de `:has()`, `color-mix()`, container queries ni nesting.

## Limites connues
- Noms de paramètres de certains effets (Lumetri, Channel Mixer, Venetian Blinds, types de Wave Warp) supposés depuis
  la doc : à confirmer par l'auto-test dans AE (les mocks des tests reprennent ces hypothèses).
- Convert Audio to Keyframes lancé depuis CEP (`executeCommand`) : à confirmer dans AE.
- Elastic n'est pas une bézier : courbe spéciale calculée en expression (P1 = [-1, -1]), non éditable.
- Licence vérifiée côté client (contournable par un utilisateur très technique) ; pas de révocation à distance.
- Previews : noms des modèles de sortie (« H.264 - Match Render Settings - … », « Current Settings ») et paramètres de
  l'effet Grid supposés ; à confirmer à la première génération dans AE.

## Prochaines étapes
1. Retour de Yexo dans AE : génération des previews, auto-test v0.5, essais par catégorie, corrections.
2. `tools/generate_sfx.py` (pack de SFX).
3. Signature .zxp et installeur pour distribuer à d'autres personnes.
