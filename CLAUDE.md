# YexoFX : consignes pour Claude

Extension CEP pour After Effects 2025 (Windows, AE en anglais) qui sert à faire des edits Valorant / CS2 pour TikTok
(1080x1920, souvent 60 i/s). Le propriétaire, Yexo, écrit en français : **réponds en français et tutoie-le**.
Ce qui compte pour lui, dans l'ordre : la qualité visuelle des animations (easings propres, rien de linéaire),
l'application en 1 clic, puis le nombre de presets (« 20 presets qui claquent > 100 moyens »).

- État du projet, décisions, API, limites et prochaines étapes : `docs/ARCHITECTURE.md` (la référence, à tenir à jour).
- Utilisation et installation : `README.md`.

## Travailler sur le code
- `npm install` une fois, puis **`npm run check`** après chaque modification : build (lint ES3) + moteur sur un AE
  simulé (`tests/host.smoke.mjs`, expressions évaluées image par image) + panel en jsdom (`tests/panel.dom.cjs`).
- Moteur : `src/*.jsx` en **ExtendScript ES3** (pas de let/const, flèches, JSON natif…), assemblé par ordre
  alphabétique dans `cep/host/yexofx_host.jsx`. Ne jamais éditer ce fichier généré.
- matchNames partout ; paramètres d'effets lus avec `Y.p.prop(effect, [matchName, name])`.
- Réglages d'un preset = Expression Controls `YFX_<Preset>_*`. Tout ce qui est créé commence par `YFX_`.
  1 action = 1 undo group (`Y.exec`). Messages à l'utilisateur en français (`Y.fail`).
- Nouveau preset : `Y.reg.add` avec le même id que dans `cep/js/catalog.js` (le panel n'active que les ids que le
  moteur déclare).
- Panel : Chromium de CEP (~99) : pas de `:has()`, `color-mix()`, container queries ni nesting CSS.
- Je ne peux pas lancer After Effects : après chaque livraison, donner des étapes de test précises dans AE et demander
  le rapport d'auto-test (`%APPDATA%\YexoFX\autotest_*.txt`) ou le texte d'erreur exact.

## Direction artistique (site yexofps.org)
Fond #0e0e0f, surface #1c1b1d (cartes r20, bord 1px rgba(120,118,122,.22)), surface-2 #262527, surface-3 #353436,
texte #ebe7e9 / muted #c9c5ca / dim #a29fa4, accent #c7bfff sur #2a009f, accent-mid #8e7fff, accent-low #5a48ce.
Polices Geist Sans + Geist Mono ; labels mono en capitales (10.5px, .14em) ; boutons pilule et chips ; coins de viseur
sur les médias. Logo : Y dans un carré arrondi accent + deux échos de mouvement (`design/logo-yexofx.svg`).

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
