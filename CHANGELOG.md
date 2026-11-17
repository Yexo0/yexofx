# Changelog YexoFX

## 1.0.0 (2026-11-17) : catalogue piloté par des données, 592 presets, 22 styles d'edit

> État : validé sur un After Effects **simulé** (moteur) et dans Edge à 340 / 450 / 560 px (panel).
> **Pas encore lancé dans le vrai AE.** Rien n'est annoncé comme marchant dans AE avant la sonde des effets et
> l'auto-test complet (voir « À faire dans AE » plus bas).

### Catalogue
- **592 presets** (+ 3 outils : Beat sync, Markers, Easing des keys) au lieu de 73, dans **10 catégories** :
  Impacts 97, Texte 88, Styles 75, Shake 54, Twitch 45, Vitesse 43, Transitions 64, FX 58,
  **Overlays & HUD 44** (nouveau), **Caméra 3D 24** (nouveau).
- Pas 1000 : la règle n°1 du cahier des charges (intensité, durée et courbe sont des réglages, pas des presets) a été
  appliquée par un lint automatique. On s'est arrêté quand les variantes n'étaient plus vraiment différentes.
- Les **73 presets v0.6** gardent leur id, leur comportement et tes favoris. Certains ont changé de catégorie
  (Valorant, CS2, Neon, Double, Dégradé, Glitchs → Texte ; Cold, Warm, Punchy, Vignette → Styles ; Flash → Impacts ;
  Grain, Light leak, Letterbox, Kill feed → Overlays & HUD).
- **22 styles d'edit** (Phonk, Flow, Hype, Cinéma, Raw, Quality, Glitch, VHS, Y2K, Anime, Comic, Cyber, Noir, Dreamy,
  Aura, Funk, Minimal, 3D, Esport, Lo-fi, Horror, Kinetic), chacun avec au moins 30 presets, sa palette, son tempo,
  sa courbe et ses sons. Guide : `docs/STYLES.md`.
- **22 packs de style** : un look sur toute la comp + une transition à chaque coupe + un impact sur chaque beat
  (ou chaque coupe sans musique) + les sons du style, en un clic et un seul Ctrl+Z.
- 8 presets lourds signalés, chacun avec une alternative légère proposée dans sa fiche.

### Moteur (ExtendScript ES3)
- Les nouveaux presets sont des **recettes JSON** (`catalog/*.json`) exécutées par un interpréteur ES3 (`src/36_rx.jsx`)
  à partir de **57 primitives** (secousse, vitesse, glow, volets, texte animé, HUD, caméra 3D…), en un seul undo group.
- Hôtes : calque d'ajustement, calques sélectionnés, texte, clip (Time Remapping), coupe, 2 clips, calque créé, comp.
  Déclenchement par markers (recliquer ajoute un impact au CTI), sur la coupe, en boucle, entrée / sortie ou figé.
- Réglages après coup dans Effect Controls : `YFX_<Nom>_Duree`, `_Intensite`, `_CourbeP1` / `_CourbeP2`.
- Volets à 2 clips : le plan entrant est rallongé avec ses images avant la coupe ; message clair s'il n'en a pas assez.
- Messages d'erreur : preset, étape, effet et paramètre en cause + quoi faire.
- Nouvelles commandes : `prims`, `applyStack`, `applyPack`, `undo`, `sfxTimes`, `probe` (sonde des effets),
  `rxTestBegin` / `rxTest` / `rxTestEnd` (auto-test complet piloté par le panel).

### Panel
- Grille **virtualisée** : seules les cartes visibles existent (10 à 18 sur 97 à l'écran), ouverture du panel ~110 à
  160 ms dans Edge, changement de catégorie ~80 ms.
- Vidéos de preview lues **au survol seulement** par défaut (préchargement à la demande).
- **Barre de styles** au-dessus des cartes (filtre global, le style actif reste en tête), **filtres** combinables
  (rôle, perf, ce qu'il faut sélectionner) et **tri** (populaires, récents, A-Z, favoris d'abord).
- **Recherche floue** FR / EN avec synonymes (tremblement = shake, ralenti = slowmo…) et fautes de frappe tolérées.
- **Compatibilité avec la sélection** avant de cliquer : les cartes qui ne peuvent pas marcher sont grisées avec la raison
  (« texte requis », « 2 clips », « plugin »…).
- **Fiche** enrichie : recette lisible, styles, rôle, perf, ce qu'il faut sélectionner, durée, intensité et courbe propres
  au preset, **Appliquer au beat**, **Comparer A/B** (deux aperçus côte à côte, B choisi parmi les presets proches).
- **Pile & presets perso** : combine des presets (+ sur une carte), applique-les en un undo group, garde la pile comme
  preset perso, **export / import JSON**.
- **Collections**, **historique** de la session avec annulation, raccourcis (Ctrl+K ou /, Entrée, F, Échap).
- Réglages : **Sonde des effets**, **Auto-test complet** (chaque preset sur des copies, rapport à la fin), compte des
  presets prêts et des primitives absentes du moteur.
- Plus de `window.prompt` (bloqué dans CEP) : noms saisis dans des champs du panel.

### Previews
- Le moteur rend les presets v1 à partir de leur recette (sélection adaptée : texte, clip, 2 clips, calques 3D).
- WebM VP9 **256×320**, 2,4 s max, sans son (64 Ko sur la mire de test) + **image WebP** (affiche de la vidéo, et aperçu de
  repli s'il n'y a pas de vidéo).
- Génération **par lots** (25, 50, 100 ou tout) avec **reprise** : seules les manquantes sont refaites.
- En attendant les vraies vidéos, chaque nouveau preset a un aperçu CSS « indicatif » (signalé dans la fiche).

### Sons
- `tools/generate_sfx.py` : **56 sons** synthétisés (Python standard, sans échantillon externe, donc libres de droits)
  dans 31 types, avec variantes par style (`impact_phonk`, `impact_horror`, `whoosh_deep`, `zap_cyberpunk`…).
- Le panel choisit la variante du preset, puis celle du style actif, puis d'un style du preset, sinon le son de base.

### Outils et tests
- `tools/catalog.mjs` : validation du catalogue, lint anti-doublon (règle n°1), couverture des styles (≥ 30), packs,
  `ids.lock` (un id publié ne disparaît jamais), génère `cep/js/catalog.data.js`, `docs/CATALOGUE.md`, `docs/STYLES.md`.
- `npm run check` : build + lint ES3, catalogue, moteur sur AE simulé (toutes les recettes évaluées à 14 instants,
  previews, pack, pile), panel en jsdom, panel dans Edge à 340 / 450 / 560 px avec captures (`tests/screenshots/`).

### Limites connues
- Noms de paramètres de certains effets supposés depuis la doc (Lumetri, Channel Mixer, CC Ball Action, Venetian Blinds,
  Fractal Noise…) : la **sonde des effets** les vérifie dans ton AE.
- Trame (halftone) et datamosh sont des approximations avec des effets natifs.
- « Passer à travers un objet » remplacé par un volet luma ; le dolly zoom demande au moins 2 calques.
- Les sons n'ont pas été écoutés par un humain : à valider à l'oreille.

## 0.6.0 (2026-11-16)
DA « Rouge impact » (graphite + un seul rouge), coque façon KIRU (rail repliable, fil d'Ariane, palette Ctrl+K,
barre d'état), Accueil, Réglages en page, apparence (animations, densité).

## 0.5.0
Moteur ES3, panel CEP, 73 presets, générateur de previews, licence liée au PC.
