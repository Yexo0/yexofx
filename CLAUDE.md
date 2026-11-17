# YexoFX : consignes pour Claude

Extension CEP pour After Effects 2025 (Windows, AE en anglais) qui sert à faire des edits Valorant / CS2 pour TikTok
(1080x1920, souvent 60 i/s). Le propriétaire, Yexo, écrit en français : **réponds en français et tutoie-le**.
Ce qui compte pour lui, dans l'ordre : la qualité visuelle des animations (easings propres, rien de linéaire),
l'application en 1 clic, puis le nombre de presets (« 20 presets qui claquent > 100 moyens »).

- État du projet, décisions, API, limites et prochaines étapes : `docs/ARCHITECTURE.md` (la référence, à tenir à jour).
- Utilisation et installation : `README.md`.

## Travailler sur le code
- `npm install` une fois, puis **`npm run check`** après chaque modification : build (lint ES3) + catalogue
  (`tools/catalog.mjs`) + moteur sur un AE simulé (`tests/host.smoke.mjs`, expressions évaluées image par image)
  + panel en jsdom (`tests/panel.dom.cjs`) + panel dans Edge à 340 / 450 / 560 px (`tests/panel.e2e.mjs`).
- Moteur : `src/*.jsx` en **ExtendScript ES3** (pas de let/const, flèches, JSON natif…), assemblé par ordre
  alphabétique dans `cep/host/yexofx_host.jsx`. Ne jamais éditer ce fichier généré.
- matchNames partout ; paramètres d'effets lus avec `Y.p.prop(effect, [matchName, name])`.
- Réglages d'un preset = Expression Controls `YFX_<Preset>_*`. Tout ce qui est créé commence par `YFX_`.
  1 action = 1 undo group (`Y.exec`). Messages à l'utilisateur en français (`Y.fail`).
- **Nouveau preset (v1)** : une recette JSON dans `catalog/<catégorie>.json` (ou `.2.json`), à partir des primitives
  du moteur (`catalog/prims.json`, code dans `src/46..51_p_*.jsx`). Règle n°1 : intensité, durée et courbe sont des
  réglages, pas des presets ; le lint de `tools/catalog.mjs` bloque les quasi-doublons. Un id publié (`catalog/ids.lock`)
  ne disparaît jamais. Les 73 presets v0.6 restent en code natif (`impl: "native"`, `Y.reg.add`).
- `cep/js/catalog.data.js`, `catalog/prims.json`, `docs/CATALOGUE.md` et `docs/STYLES.md` sont générés : ne pas les éditer.
- Effets AE natifs uniquement (un plugin tiers doit être déclaré dans `needs.plugins`). Un preset lourd a un `alt` léger.
- Panel : Chromium de CEP (~99) : pas de `:has()`, `color-mix()`, container queries ni nesting CSS.
- Je ne peux pas lancer After Effects : après chaque livraison, donner des étapes de test précises dans AE et demander
  les rapports (`%APPDATA%\YexoFX\probe_*.txt`, `autotest_recettes_*.txt`) ou le texte d'erreur exact. Ne jamais
  annoncer qu'un preset marche dans AE tant que l'auto-test n'a pas tourné dans le vrai AE.

## Direction artistique « Rouge impact » (v0.6)
L'ancien violet lavande est abandonné : Yexo le trouvait « trop IA ». Les tokens sont dans `cep/css/yexofx.css` (:root),
et l'analyse de la référence (KIRU Suite) est dans `docs/REFONTE_V06.md`.
- Graphite neutre : fond #0b0b0d, rail #08080a, surfaces #131316 / #1a1a1e / #242428, bordures blanches .07 / .13.
  Texte #f2f0ed / #b8b5af / #8a8781.
- **Une seule** couleur vive, utilisée avec parcimonie : rouge #ff4b3e (remplissage des boutons #e2382c, texte blanc).
  Elle sert à la barre active du rail, aux titres de section importants, au bouton principal et aux pastilles actives.
- Aucun halo ni dégradé lumineux dans l'interface (ils restent réservés aux previews d'effets).
- Rayons 4 à 12 px, Geist + Geist Mono, texte 10 à 13 px, labels en capitales (600, .08em).
- Animations courtes (90 à 240 ms), `cubic-bezier(0.16, 1, 0.3, 1)`, interruptibles. Réglage Normales / Réduites / Coupées.
- Logo : Y dans un carré arrondi rouge + deux échos de mouvement.
- On reprend le niveau de finition de KIRU, **pas** son identité (nom, logo 切る, or).

## Sécurité
- `keys/yexofx_private.pem` (clé privée des licences) n'est **jamais** commitée ni copiée dans `cep/`. Elle se transfère
  à la main d'un PC à l'autre. Les licences émises (`keys/licence_*.txt`) restent aussi hors du repo.
- La licence est liée au PC : sur un nouveau poste, le panel affiche un nouvel ID machine, et il faut une nouvelle clé
  (`node tools/licence.mjs issue <ID-MACHINE> "<pseudo>"`, sur le PC qui a la clé privée).

## Installer sur un nouveau poste
1. `git clone` du repo, puis `npm install`.
2. `tools\install_dev.cmd` (lien `cep\` → extensions Adobe + autorisation des extensions non signées).
3. AE : Edit > Preferences > Scripting & Expressions > **Allow Scripts to Write Files and Access Network**.
4. Window > Extensions > YexoFX, puis activer avec une clé émise pour l'ID machine de ce poste.
5. Pour générer les previews : ffmpeg dans le PATH (`winget install Gyan.FFmpeg`) ou dans `C:\ffmpeg\bin`.
