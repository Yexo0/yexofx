# Refonte v0.6 : analyse de KIRU Suite et plan

Référence : KIRU Suite, panel AE tout-en-un d'un pote de Yexo (site kiru-suite.kiru-koyama.workers.dev, panel de démo
dans `/panel/`). On reprend le niveau de finition et l'organisation, **pas** son identité (nom, logo 切る, or).

## Ce que fait KIRU
- **Coque** : rail d'icônes repliable (52 px, ou 156 px avec libellés), en-tête 42 px avec fil d'Ariane
  (« Édition › Calques »), recherche Ctrl+K (palette de commandes), barre d'état 26 px (« Moteur connecté · AE 26.0 »).
- **Accueil** : carte de la comp active (taille, fps, sélection, nombre d'éléments), actions rapides, suggestions selon
  la sélection, tâches longues en cours, favoris.
- **Édition** : Calques (créer, ajuster, centrer, miroirs, figer, étirer les clés, point d'ancrage en grille 3x3,
  couleur et effets, capture PNG), Courbes (éditeur + 25 courbes nommées en Sortie / Les deux / Entrée, lire la
  sélection, sauvegarder), Texte (bibliothèque de presets .ffx importés, previews rendues), OneFrame (106 effets d'une
  image, preview au survol, rendu sur une image au choix, multi-sélection, file d'attente).
- **Bibliothèques** : Presets (dossiers .ffx de l'utilisateur et d'AE), Assets (overlays et SFX depuis des dossiers,
  sous-dossiers = catégories, previews MP4 générées), Templates (un dossier par .aep avec preview).
- **Médias** : détection de beats (sensibilité, markers sur calque ou comp), téléchargement (YouTube, TikTok…),
  sous-titres locaux, séparation de pistes, interpolation, upscale (moteurs embarqués).
- **Outils** : découpe auto aux changements de plan, suivi de visage, rendu rapide des clips, nettoyage des images
  doublées (anime). **Nettoyage** : cache AE, ranger le projet, médias et comps inutilisés.
- **KIRU AI** (Premium) : chat dans le panel ; Claude, ChatGPT ou Duo, via l'abonnement de l'utilisateur (applis
  officielles) ou sa clé API ; voit le projet, agit (effets, clés, expressions, texte, rendus), vérifie par un rendu
  d'image ; chaque modification = un Ctrl+Z.
- « Des centaines de presets, des milliers de SFX » : surtout des **bibliothèques que l'utilisateur branche**
  (dossiers scannés + previews auto). En natif : 106 one-framers, 25 courbes, outils de calque.

## Tokens relevés (panel KIRU, thème « dark-aureum »)
- Fonds gris neutres : #09090a, #0d0d0f, panneau #121214, survol #171719, élevé #1b1b1e.
- Bordures blanches très faibles : .055 / .09 / .14. Texte #f2f0ea / #aaa7a0 / #6e6c68.
- Un seul accent, utilisé avec parcimonie : barre active du rail, titres de section, bouton principal (dégradé léger),
  bordure des cartes mises en avant.
- Surfaces : léger dégradé vertical blanc 2,5 % → 0,8 %. Ombres sobres.
- Typo dense : Inter, mono Cascadia ; 13 / 12 / 11 / 10 px ; graisses 450 / 550 / 650.
- Rayons 4 à 12 px (rien à 20). Espacements 2 à 32 px. Réglage de densité (x1,18 « confortable »).
- Animations courtes : survol 90 ms, bouton 110, bascule 120, info-bulle 140, menu 150, vue 160, tiroir 200 ;
  courbe `cubic-bezier(0.16, 1, 0.3, 1)`. Réglage « animations réduites / coupées ». Thèmes (Halloween).

## Pourquoi YexoFX v0.5 « fait IA »
Violet lavande, halos et dégradés lumineux, grands rayons (20 px), cartes très aérées : c'est le cliché des interfaces
générées. Correctif : graphite neutre, une couleur franche sans halo, rayons serrés, typo dense, animations brèves.

## Plan (une étape à la fois)
1. **Nouvelle DA + coque** (fait le 2026-11-16, v0.6.0) : palette « Rouge impact » (Geist conservée, déjà embarquée),
   tokens (rayons, durées, densité), rail repliable avec libellés et groupes, fil d'Ariane, palette Ctrl+K (ou « / »),
   barre d'état (moteur + comp + CTI + sélection), Accueil (comp active, actions rapides, suggestions selon le type de
   calque sélectionné, récents, favoris), Réglages en page (apparence : animations, densité, libellés du rail).
2. **SFX** : import du pack de Yexo (105 sons, kill sounds Valorant) en catégories, lecteur avec forme d'onde, pose au
   CTI ou sur les markers, favoris. Les fichiers audio restent hors de git (poids, droits).
3. **Bibliothèques** : presets .ffx, overlays, templates .aep : dossiers scannés + previews (générateur existant).
4. **Calques, courbes, nettoyage** : outils de calque, 25 courbes nommées + lire la sélection + sauvegarder, cleanup.
5. **One-framers FPS** : effets d'une image natifs, avec previews.
6. **Assistant IA dans AE** : chat dans le panel, via l'abonnement Claude de l'utilisateur ou une clé API ; agit par
   le moteur YexoFX, chaque action dans un undo group.
7. Plus tard, optionnel : outils médias lourds (téléchargement, sous-titres, pistes, interpolation, upscale).
