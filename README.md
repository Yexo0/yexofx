# YexoFX

Extension CEP pour After Effects 2025, pensée pour les edits FPS (Valorant / CS2).
Version 0.5.0 : les 73 presets du catalogue sont codés, interface simplifiée (rail d'icônes, cartes vidéo, dock).

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

## Utilisation

- **À gauche, le rail** : les catégories (Impacts, Texte, Shake, Twitch, Vitesse, Transitions, FX, Styles, Audio,
  Favoris). Le point en bas du rail : vert = licence + moteur OK (survole-le pour le détail).
- **En haut** : la recherche (sans accents) et la ligne de contexte (comp, fps, CTI, calques sélectionnés ; clic = rafraîchir).
- **Clic sur une carte** : applique le preset. Un seul Ctrl+Z l'annule.
- **− / +** au survol d'une carte : durée (Maj+clic : 5 images). **⋯** : fiche (recette, durée, courbe, entrée / sortie).
- **En bas, le dock** : intensité (0 à 200 %) et courbe par défaut (clic = éditeur de courbe, aussi applicable aux keys
  sélectionnées dans la timeline). Le bouton lecture coupe la lecture auto des previews.
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
   ffmpeg la compresse en `YexoFX_assets\previews\<id>.webm` (432×540, ~150 Ko). Compte ~10 s par preset ;
   AE est bloqué pendant chaque rendu, le panel affiche l'avancement et **Arrêter après celle-ci**.
4. Depuis la fiche d'un preset (⋯) : **Regénérer la vidéo de preview** pour ce seul preset.

Tes rendus déjà en file d'attente sont mis de côté pendant la génération, puis remis.
ffmpeg est cherché dans le PATH puis dans `C:\ffmpeg\bin` ; sans ffmpeg, les rendus restent en MP4 (plus lourds,
et pas toujours lisibles par le panel).

### Tes propres vidéos et sons
- Vidéos : dépose `YexoFX_assets\previews\<id>.mp4` (ou .mov ; ids dans `LISEZMOI.txt`), puis
  Réglages > Previews vidéo > **Convertir tes vidéos** : WebM 4:5 recadré, tes originaux sont gardés.
- Sons : `YexoFX_assets\sfx\<catégorie>\*.wav` (ou mp3, aif). Ils apparaissent dans l'onglet Audio.

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
- **Réglages > Auto-test**, dans un projet vide : il ouvre un rapport à m'envoyer.
- **Réglages > Dump calque** : toutes les propriétés des calques sélectionnés.
- Débogage avancé : panel ouvert dans AE, ouvre `http://localhost:8088` dans Chrome.

## Développement

```
npm install            une fois
npm run build          src/*.jsx -> cep/host/yexofx_host.jsx (vérifie l'ES3)
npm run check          build + test du moteur (AE simulé) + test du panel (jsdom)
```

- `src/` : moteur ExtendScript (ES3, un fichier par module). Ne pas éditer `cep/host/yexofx_host.jsx` à la main.
- `cep/` : l'extension (manifest, `index.html`, `css/`, `js/`, polices Geist sous licence OFL).
- `design/` : maquette publiée et logo.
- `tools/` : installation, licences. `tests/` : tests automatiques.
