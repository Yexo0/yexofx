# YexoFX

Extension CEP pour After Effects 2025, pensée pour les edits FPS (Valorant / CS2).
Version 1.0.0 : **592 presets** (10 catégories), **22 styles d'edit**, **22 packs de style**, pile et presets perso,
collections, comparer A/B, sons générés. Nouveautés détaillées : `CHANGELOG.md`. Guide des styles : `docs/STYLES.md`.

> La v1.0 a été validée sur un AE simulé et dans un navigateur, **pas encore dans ton AE** : commence par
> « Premier lancement de la v1.0 » ci-dessous.

## Installer (mode dev)

1. Double-clique **`tools\install_dev.cmd`** (pas besoin des droits admin). Il fait deux choses :
   - il autorise les extensions non signées dans les apps Adobe (réglage `PlayerDebugMode`, côté utilisateur) ;
   - il relie le dossier `cep\` du projet au dossier des extensions Adobe : chaque build est pris en compte sans copie.
2. Dans AE : **Edit > Preferences > Scripting & Expressions**, coche **Allow Scripts to Write Files and Access Network**.
3. Relance After Effects, puis **Window > Extensions > YexoFX**. Docke le panel où tu veux.
4. À la première ouverture, l'écran d'activation s'affiche : colle la clé du fichier `keys\licence_Yexo_….txt`.

Si tu avais installé l'ancienne version ScriptUI, supprime `YexoFX_Dev.jsx` de
`C:\Program Files\Adobe\Adobe After Effects 2025\Support Files\Scripts\ScriptUI Panels\`.

## Mettre à jour après une livraison

Réglages (⚙) > **Recharger le panel**, ou ferme et rouvre le panel. Le moteur est rechargé à chaque ouverture.

## Premier lancement de la v1.0 (à faire une fois, dans l'ordre)

1. **Sonde des effets** : Réglages > Diagnostic > **Sonde des effets**. AE fige quelques secondes, puis un fichier
   `probe_<date>.txt` s'ouvre (dans `%APPDATA%\YexoFX`). Il liste les vrais noms des paramètres de chaque effet dans
   ton AE : envoie-le moi.
2. **Auto-test complet** : ouvre un **projet vide**, Réglages > Diagnostic > **Auto-test complet** > Lancer. Il applique
   les 592 presets un par un sur des copies dans une comp `YFX_TEST` et vérifie toutes les expressions. Compte
   quelques minutes. Le rapport `autotest_recettes_<date>.txt` s'ouvre à la fin : envoie-le moi.
3. **Previews** : Réglages > Previews vidéo > **Générer les manquantes**, choisis un lot (50 par exemple), Lancer.
   Recommence plus tard pour le lot suivant : seules les manquantes sont refaites.

## Utilisation

- **Accueil** : la comp active (taille, fps, durée, sélection), des actions rapides, des presets suggérés selon le
  calque sélectionné (clip, texte, son…), tes récents et tes favoris.
- **À gauche, le rail** : Accueil, les effets (Impacts, Texte, Styles, Shake, Twitch, Vitesse, Transitions, FX,
  Overlays & HUD, Caméra 3D), la bibliothèque (Packs de style, Pile & perso, Collections, Favoris, Audio), puis
  Réglages. Le bouton du bas affiche ou masque les libellés.
- **Au-dessus des cartes, la barre de styles** : choisis un style (Phonk, Flow, Hype, Cinéma…) et toutes les catégories
  ne montrent plus que ses presets. **Filtres** à droite : rôle (entrée, impact, sortie…), perf (léger, moyen, lourd),
  ce qu'il faut sélectionner, et tri (populaires, récents, A-Z, favoris d'abord).
- **Cartes grisées** : le preset ne peut pas marcher avec ta sélection actuelle ; la raison est écrite dessus
  (« texte requis », « 2 clips »…).
- **+ au survol d'une carte** : ajoute le preset à la **pile**. Bibliothèque > Pile & perso : applique la pile en un
  seul Ctrl+Z, garde-la comme **preset perso**, exporte ou importe des presets perso en `.json`.
- **Packs de style** : sélectionne tes clips (et ta musique avec ses markers de beat), puis un pack : look sur toute la
  comp, une transition à chaque coupe, un impact sur chaque beat, les sons du style. Un seul Ctrl+Z annule tout.
- **Collections** : depuis la fiche d'un preset, « Collection » pour le ranger (« Intros », « Edit Valo de juin »…).
- **Historique** (icône horloge en haut) : ce que tu as appliqué pendant la session, réappliquer, annuler.
- **En haut** : où tu es (« Effets › Impacts ») et **Rechercher (Ctrl+K ou /)** : presets, sons, pages et actions.
  ↑ ↓ pour choisir, Entrée pour appliquer, Maj+Entrée pour voir les résultats en cartes.
- **Tout en bas, la barre d'état** : point vert = licence + moteur OK (survole-le), puis comp, fps, CTI et sélection
  (clic = rafraîchir).
- **Clic sur une carte** : applique le preset. Un seul Ctrl+Z l'annule.
- **− / +** au survol d'une carte : durée (Maj+clic : 5 images). **⋯** : fiche (recette, styles, durée, intensité et
  courbe propres au preset, **Appliquer au beat**, **Comparer A/B**, alternative légère pour les presets lourds).
- **Raccourcis** : Ctrl+K ou / pour chercher (« tremblement », « ralenti », « néon »… en français ou en anglais,
  fautes tolérées), Entrée applique depuis la fiche, F met en favori la carte survolée, Échap ferme.
- **Le dock** (au-dessus de la barre d'état) : intensité (0 à 200 %) et courbe par défaut (clic = éditeur de courbe,
  aussi applicable aux keys sélectionnées dans la timeline). Le bouton lecture, en haut à droite, coupe la lecture auto
  des previews.
- **Réglages** : lecture auto, SFX auto, apparence (animations normales / réduites / coupées, densité, libellés du
  rail), previews vidéo, dossier assets, licence, outils de calque et diagnostic.
- **★** : favoris (compteur sur le rail).
- Impacts, flashs et shakes se déclenchent sur des **markers** : recliquer au CTI ajoute un impact au même calque.
- Tout ce que crée YexoFX commence par `YFX_` ; les réglages restent modifiables dans Effect Controls.

### Caler les impacts sur la musique (beat sync)
1. Sélectionne le calque de musique, catégorie **Vitesse** > **Beat sync** : des markers « beat » sont posés sur les temps forts
   (intensité haute = plus de beats ; la durée = écart minimum entre deux beats).
2. Garde la musique sélectionnée et clique un impact, un flash ou un shake : un impact par beat.

### Vitesse (Velocity, Freeze, Rewind…)
Sélectionne le clip, place le CTI sur le moment clé, clique. Le Time Remapping est activé avec Pixel Motion ; plusieurs
presets de vitesse sur le même clip se combinent dans une seule expression.

## Previews et sons

### Générer les vidéos des cartes
1. Ouvre un projet (un projet vide suffit). Pour des previews sur **ton** gameplay : sélectionne ton clip dans ta comp
   et place le CTI pile sur le kill. Sans sélection, YexoFX utilise sa scène de démo (cible, viseur, grille).
2. Réglages (⚙) > **Previews vidéo** > **Générer N manquantes** (ou **Tout regénérer**), puis **Lancer**.
3. Pour chaque preset, AE crée une comp de démo 4:5, applique le preset, la rend en H.264, puis la supprime.
   ffmpeg la compresse en `YexoFX_assets\previews\<id>.webm` (256×320, 2,4 s, sans son, < 150 Ko) + une image
   `<id>.webp`. Compte ~6 à 10 s par preset ; AE est bloqué pendant chaque rendu, le panel affiche l'avancement et
   **Arrêter après celui-ci**. Génère par lots (25, 50, 100 ou tout) : la suite reprend là où tu t'es arrêté.
4. Depuis la fiche d'un preset (⋯) : **Regénérer la vidéo de preview** pour ce seul preset.

Tes rendus déjà en file d'attente sont mis de côté pendant la génération, puis remis.
ffmpeg est cherché dans le PATH puis dans `C:\ffmpeg\bin` ; sans ffmpeg, les rendus restent en MP4 (plus lourds,
et pas toujours lisibles par le panel).

### Tes propres vidéos et sons
- Vidéos : dépose `YexoFX_assets\previews\<id>.mp4` (ou .mov ; ids dans `LISEZMOI.txt`), puis
  Réglages > Previews vidéo > **Convertir tes vidéos** : WebM 4:5 recadré, tes originaux sont gardés.
- Sons : `YexoFX_assets\sfx\<catégorie>\*.wav` (ou mp3, aif). Ils apparaissent dans l'onglet Audio.
  Le pack de base (56 sons libres de droits, variantes par style comme `impact_phonk.wav`) est généré par
  `python tools/generate_sfx.py`. Un preset qui suggère un son prend la variante de son style si elle existe.

## Licences

- La personne ouvre le panel, copie son **ID machine** et te l'envoie.
- Tu génères sa clé : `node tools/licence.mjs issue <ID-MACHINE> "<pseudo>"` (ajoute `--days 365` pour une date de fin).
- Elle colle la clé : c'est fait, sans connexion Internet. La clé ne marche que sur son PC.
- **`keys\yexofx_private.pem` est ta clé privée** : ne la partage jamais et ne la copie jamais dans `cep\`.
  Si tu la perds, tu ne peux plus créer de licence ; en recréer une (`keygen --force`) invalide toutes les anciennes.
- Limite : la vérification tourne sur le PC de l'utilisateur. Une personne très technique pourrait la contourner
  en modifiant le panel. La révocation à distance n'existe pas encore : utilise `--days` pour des clés temporaires.

## Où sont les fichiers

| Quoi | Où |
|---|---|
| Extension (lien en dev) | `%APPDATA%\Adobe\CEP\extensions\com.yexo.yexofx` → `cep\` |
| Moteur ExtendScript (généré) | `cep\host\yexofx_host.jsx` |
| Préférences du panel, licence | `%APPDATA%\YexoFX\panel.json`, `licence.key` |
| Config moteur, log, rapports | `%APPDATA%\YexoFX\config.json`, `yexofx.log`, `autotest_*.txt` |
| Vidéos de preview | `YexoFX_assets\previews\<id>.webm` (rendus bruts temporaires : `%APPDATA%\YexoFX\previews_raw`) |

## Si quelque chose casse

- **Panel absent du menu Extensions** : `install_dev.cmd` lancé ? AE bien relancé après ?
- **Point rouge et bandeau « moteur »** : clique Recharger. Sinon, envoie-moi le message affiché.
- **Carte « bientôt »** : le moteur chargé est plus vieux que le panel. Réglages > Recharger le moteur.
- **Réglages > Diagnostic > Auto-test complet**, dans un projet vide : il ouvre un rapport à m'envoyer.
- **Réglages > Dump calque** : toutes les propriétés des calques sélectionnés.
- Débogage avancé : panel ouvert dans AE, ouvre `http://localhost:8088` dans Chrome.

## Développement

```
npm install            une fois
npm run build          src/*.jsx -> cep/host/yexofx_host.jsx (vérifie l'ES3) + catalogue -> cep/js/catalog.data.js
npm run lint:catalog   validation et lint anti-doublon du catalogue, détail par catégorie et par style
npm run check          build + catalogue + moteur (AE simulé) + panel (jsdom) + panel dans Edge (340/450/560 px)
npm run sfx            régénère les sons de base
```

- `catalog/` : **les presets** (JSON). Un nouveau preset = une entrée dans le bon fichier, puis `npm run check`.

- `src/` : moteur ExtendScript (ES3, un fichier par module). Ne pas éditer `cep/host/yexofx_host.jsx` à la main.
- `cep/` : l'extension (manifest, `index.html`, `css/`, `js/`, polices Geist sous licence OFL).
- `design/` : maquette publiée et logo.
- `tools/` : installation, licences. `tests/` : tests automatiques.
