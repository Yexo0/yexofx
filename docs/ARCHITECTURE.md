# YexoFX : architecture

État au 2026-11-17 : **v1.0.0**. 592 presets + 3 outils, 22 styles, 22 packs. Tout est validé sur un AE **simulé**
(`tests/host.smoke.mjs`) et le panel dans Edge (`tests/panel.e2e.mjs`). **Pas encore lancé dans le vrai AE** :
la sonde des effets puis l'auto-test complet doivent tourner chez Yexo avant d'annoncer quoi que ce soit.
Plan détaillé de la v1 : `docs/PLAN_V1.md`. Historique : `CHANGELOG.md`.

## Historique des décisions
- Cahier des charges initial : panel ScriptUI (ES3). Pivot vers une **extension CEP** (comme Motion Bro) : interface
  HTML, vidéos de preview, licence. Le moteur ExtendScript est conservé.
- Licence : clé liée au PC, signée Ed25519, vérifiée hors ligne (pas de serveur).
- v0.6 : DA « Rouge impact » (graphite + un seul rouge, sans halo), coque façon KIRU.
- v1.0 : le catalogue devient des **données** (JSON) exécutées par un interpréteur ES3 à partir de primitives ; les
  73 presets v0.6 restent du code natif (`impl: "native"`) avec le même id et le même comportement.
- v1.0 : objectif ~1000 presets ramené à 592 par la règle n°1 (intensité, durée, courbe = réglages) et le lint anti-doublon.

## Structure
```
catalog/                   LA source des presets (JSON, un fichier par catégorie, .2.json = suite)
  schema.json              schéma JSON (2020-12) d'un fichier de catégorie
  edit-styles.json         22 styles (palette, tempo, courbe, intensité, sons) + correspondance des anciennes vibes
  packs.json               22 packs (look, cut, beat, sons)
  synonyms.json            synonymes FR / EN de la recherche
  ids.lock                 ids publiés (on n'en retire jamais)
  prims.json               GÉNÉRÉ : primitives déclarées par le moteur (paramètres, coût)
cep/                       l'extension (lien vers %APPDATA%\Adobe\CEP\extensions\com.yexo.yexofx en dev)
  index.html               rail, en-tête, vue, dock, feuilles, palette, écran de licence
  css/yexofx.css           tokens, previews CSS, feuilles, éditeur de courbe
  css/layout.css           coque, accueil, réglages, palette, grille virtualisée, styles, packs, pile, A/B
  js/catalog.data.js       GÉNÉRÉ par tools/catalog.mjs (presets, styles, packs, synonymes, primitives)
  js/catalog.js            adapte les données pour le panel (libellés FR, recette lisible, courbes)
  js/search.js             recherche floue (synonymes, fautes), filtres, tri
  js/previews.js           vignettes : vidéo .webm (+ .webp) si présente, sinon aperçu CSS (proxy d'un preset v0.6)
  js/pvgen.js              génération des vidéos par lots : pvRender + ffmpeg (WebM VP9 256x320 + WebP)
  js/bridge.js             evalScript -> YFX.api.call(json) ; moteur simulé hors AE
  js/store.js              préférences (%APPDATA%\YexoFX\panel.json), SFX, vidéos, dossiers
  js/licence.js, pubkey.js clé de licence (Node crypto) + ID machine
  js/app.js                logique du panel
  host/yexofx_host.jsx     moteur GÉNÉRÉ par build.mjs depuis src/
src/                       moteur ExtendScript (ES3, lint au build), assemblé par ordre alphabétique
  00_header 10_utils 20_core 30_text 31_styles 35_kit 36_rx 40_shake 41_fx 42_impacts 43_twitch 44_trans
  46_p_motion 47_p_light 48_p_distort 49_p_text 50_timing 51_p_create 60_audio 70_previews 80_devtools
  81_dev_v1 85_api 99_footer
tools/                     catalog.mjs, generate_sfx.py, licence.mjs, install_dev.cmd, uninstall_dev.cmd
YexoFX_assets/             sfx/<type>/*.wav (générés), previews/<id>.webm|.webp (générées dans AE)
tests/                     host.smoke.mjs (AE simulé), panel.dom.cjs (jsdom), panel.e2e.mjs (Edge), screenshots/
```

## Recettes (moteur v1)
Un preset v1 = `{ id, name, nameEn, category, host, drive, recipe: [étapes], needs, defaults, styles, role, perf… }`.
- **Hôtes** (`Y.rx.run`) : `any` (calques sélectionnés, sinon calque d'ajustement `YFX_<NameEn>`), `adj` (toujours un
  calque d'ajustement), `layer` / `text` / `clip` (calques sélectionnés), `cut` (calque d'ajustement centré sur la
  coupe), `two` (plan sortant A + entrant B, réglages sur B), `new` (la 1re étape crée le calque), `comp`.
- **Pilotage** : `marker` (impact au CTI, recliquer en ajoute un ; une musique sélectionnée avec markers déclenche sur
  chaque beat), `cut`, `loop`, `inout`, `static`.
- **Enveloppes** dans les expressions (`yfxEnv`) : decay, attack, bell, hold, ramp, pulse, strobe, steps ; longueur en
  images ou relative, anticipation jusqu'au marker suivant ; courbe principale, linéaire ou identité.
- **Valeurs** : nombre, `{from, to}` ou `{keys}` ; les paramètres marqués `k` sont multipliés par l'intensité.
- Réglages partagés : `YFX_<NameEn>_Duree`, `_Intensite`, `_CourbeP1`, `_CourbeP2` + le paramètre principal.
- Effets non animables (seuils, mosaïque…) : calque « porte » dont l'opacité suit l'enveloppe (`Y.rx.gate`).
- Validation complète de la recette avant de toucher au projet (`Y.rx.check`) ; erreur = preset, étape, effet,
  paramètre + quoi faire (`Y.rx.rethrow`).
- Primitives : `src/46_p_motion` (shake, twitch, punch, timeRemap, echo, flous…), `47_p_light` (exposition, flash,
  Lumetri, glow, rayons, fuites…), `48_p_distort` (RGB, ondulation, objectif, blocs, mosaïque, encre, trame, grain,
  miroir, lignes de vitesse), `49_p_text` (révélation, aléatoire, machine à écrire, vague, kinetic, style, ombres,
  remplissage, compteur), `51_p_create` (HUD, texte créé, particules, caméra 3D, profondeur, volets, transitions 3D).
- Perf = somme des coûts des primitives (1-3 léger, 4-8 moyen, 9+ lourd) ; un preset lourd a une alternative `alt`.

## Catalogue (`tools/catalog.mjs`)
Valide chaque fichier (préfixes d'id par catégorie, hôte / pilotage / besoins cohérents, primitives supportées par
l'hôte, paramètres et bornes, enveloppes, `nameEn` unique et sans collision avec les calques v0.6, `alt` existant),
lint anti-doublon (même « signature » de recette → écart des paramètres ≥ 0,5 OK ; RÉGLAGE SEUL / INTENSITÉ SEULE /
DOUBLON bloquent), couverture des styles (≥ 30 avec `--strict`), packs, `ids.lock`. Écrit `cep/js/catalog.data.js`,
`catalog/prims.json`, `docs/CATALOGUE.md`, `docs/STYLES.md`.

## API moteur (`YFX.api.call`)
`ping`, `presets` (ids natifs), `prims` (primitives : le panel active une recette si toutes ses primitives existent),
`context` (comp, CTI, sélection avec type, nb de markers, 3D), `env`, `setAssets`, `apply {id, def?, params}`,
`applyStack {name, items}`, `applyPack {name, look, cut, beat, sfx, params}`, `undo`, `sfx {path, mode}`,
`sfxTimes {path, times}`, `autotest` (v0.6), `probe`, `rxTestBegin` / `rxTest {def, params}` / `rxTestEnd`, `dump`,
`effects`, `openLog`, `pvInfo`, `pvBegin`, `pvRender {id, def?, kind hit|text|cut|loop, word, params, keep}`, `pvEnd`.
Réponse `{ok, data}` ou `{ok:false, error, user}`. Aucune boîte de dialogue côté moteur.
Paramètres : `frames`, `intensity` (0..2), `curve {b, special, name}`, `dir`, `by`.

## Panel
- Prêt = preset natif déclaré par le moteur, ou recette dont toutes les primitives existent dans le moteur chargé.
- Compatibilité calculée avant le clic depuis `context` (texte, clip, 2 clips, calques 3D, plugins tiers).
- Grille virtualisée (`mountGrid` / `layoutGrid` / `paintGrid`) : rangées visibles ± 2, hors mise en page tout est rendu.
- Vidéos `preload="none"`, lues au survol ; affiche WebP si présente.
- Préférences dans `panel.json` : favoris, récents, usage (tri « populaires »), style, tri, pile, presets perso,
  collections, durée / courbe / intensité par preset.
- Chromium de CEP (~99) : pas de `:has()`, `color-mix()`, container queries ni nesting ; pas de `window.prompt`.

## Vidéos de preview
- Moteur (`70_previews`) : `pvBegin` choisit la source (clip sélectionné au CTI, sinon scène de démo), le modèle H.264,
  met la file de rendu de côté. `pvRender` : comp 1080x1352, 60 i/s, 2 s, demi-résolution ; kill à 0,7 s, texte à
  0,3 s, coupe à 1 s ; recette exécutée via `Y.rx.exec` avec une sélection adaptée. `pvEnd` : ménage.
- Panel (`pvgen.js`) : lots, reprise (seules les manquantes), compression ffmpeg en parallèle du rendu suivant.

## Limites connues
- Noms de paramètres supposés pour certains effets : la sonde (`Réglages > Diagnostic > Sonde des effets`) écrit
  `%APPDATA%\YexoFX\probe_<date>.txt|json` avec les vrais noms ; à intégrer ensuite.
- Convert Audio to Keyframes et `executeCommand(16)` (Undo) lancés depuis CEP : à confirmer dans AE.
- Elastic n'est pas une bézier : courbe spéciale calculée en expression, non éditable.
- Licence vérifiée côté client ; pas de révocation à distance.

## Prochaines étapes
1. Chez Yexo : sonde des effets, auto-test complet dans un projet vide, puis previews par lots. Corriger d'après les
   rapports.
2. Remplacer les aperçus CSS indicatifs par les vraies vidéos.
3. Signature .zxp et installeur pour distribuer.
