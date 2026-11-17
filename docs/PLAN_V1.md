# YexoFX v1.0 : plan (étape 1)

Cahier des charges : `YexoFX_prompt_v1.md` (catalogue massif + refonte de l'interface). Ce document fixe
l'architecture, les primitives, le format du catalogue, l'anti-doublon et la migration des 73 presets.
Les fiches des 22 styles sont dans `catalog/edit-styles.json` (source) et `docs/STYLES.md` (généré).

## 1. Objectif réaliste

Règle n° 1 du cahier des charges : un preset = un rendu différent. Intensité, durée, courbe et **sens**
(gauche / droite) sont des réglages, pas des presets. L'**axe** (X, Y, rotation, profondeur), le motif, la
combinaison d'effets, le style visuel et le rôle distinguent deux presets.

Estimation honnête avec les effets natifs d'AE 2025 :

| Catégorie | Existants | Cible | Limite |
|---|---|---|---|
| Impacts | 11 | 90-100 | combinaisons riches : secousse x lumière x distorsion x couleur |
| Texte | 17 | 90-100 | animators, ordres, styles de titres, compteurs, sous-titres |
| Styles (looks) | 4 | 80-90 | 22 styles x 3-4 looks vraiment différents |
| Shake | 9 | 55-70 | au-delà, on ne changerait plus que l'intensité |
| Twitch | 6 | 45-55 | 8 canaux, leurs combinaisons et 4 rythmes |
| Vitesse | 6 (+3 outils) | 40-50 | une courbe de vitesse est surtout un réglage |
| Transitions | 9 | 70-80 | |
| FX | 4 | 65-75 | |
| Overlays et HUD | 4 | 50-60 | |
| Caméra 3D | 0 | 25-35 | peu de mouvements de caméra distincts par nature |

Total visé : **650 à 700 presets**, pas 1 000. Les chiffres réels sortent du lint, catégorie par catégorie.

## 2. Architecture cible

```
catalog/*.json (source, 1 fichier par catégorie)      src/*.jsx (moteur ES3)
catalog/styles.json, packs.json, synonyms.json         ├─ 36_rx      registre des primitives, enveloppes,
catalog/ids.lock (ids publiés, jamais supprimés)       │             hôtes, interpréteur de recettes
        │                                               ├─ 46-52_p_* primitives (≈ 57)
        ▼  node build.mjs                               └─ modules v0.6 (73 presets « natifs »)
  1. moteur : concat + lint ES3 -> cep/host/yexofx_host.jsx
  2. schéma des primitives lu dans le moteur (vm Node) -> catalog/prims.json
  3. catalogue : validation, perf calculée, lint anti-doublon, ids.lock -> cep/js/catalog.data.js
```

- **Le panel possède le catalogue, le moteur possède les primitives.** Au clic, le panel envoie
  `apply {id, recipe, params}`. Le moteur ne charge pas 1 000 recettes au démarrage (ExtendScript est lent
  à parser) : il reste petit et rapide à charger.
- **Prêt ou pas** : un preset est cliquable si le moteur connaît toutes ses primitives (`prims`), ou son id
  pour les presets natifs (`presets`).
- **Un clic = un undo group** : l'interpréteur passe par `Y.exec` (validation de la sélection, undo group
  refermé dans `finally`).
- **Erreurs** : chaque étape de recette est exécutée dans un `try` qui ajoute le preset, l'étape, la primitive
  et l'effet AE en cause, plus quoi faire (« Réglages > Diagnostic > Sonde des effets »).

## 3. Exécution d'une recette

### Hôtes (où vont les effets)
| `host` | Comportement |
|---|---|
| `any` | calques visuels sélectionnés, sinon calque d'ajustement `YFX_<Nom>` sur toute la comp (comme v0.6) |
| `adj` | toujours un calque d'ajustement `YFX_<Nom>` |
| `layer` / `text` | uniquement les calques sélectionnés (texte pour `text`) |
| `clip` | clip sélectionné (Time Remapping) |
| `cut` | calque d'ajustement centré sur la coupe (2 clips sélectionnés, sinon CTI) |
| `two` | plan sortant + plan entrant (volets, 3D) |
| `new` | le preset crée ses calques (formes, texte, solides, caméra) |

### Pilotage dans le temps (`drive`)
| `drive` | Déclencheur |
|---|---|
| `marker` | chaque marker du calque hôte (CTI au clic, ou un marker par beat si un calque audio avec markers est sélectionné) |
| `cut` | fenêtre de transition, coupe au milieu |
| `loop` | continu |
| `inout` | entrée au In du calque, sortie au Out (texte, overlays) |
| `static` | réglage posé une fois (styles de titres, looks fixes) |

### Réglages communs posés sur l'hôte
`YFX_<Nom>_Duree` (images), `YFX_<Nom>_Intensite` (%, **modifiable après coup**), `YFX_<Nom>_CourbeP1/P2`, plus
le réglage principal de chaque étape (ex. `YFX_<Nom>_Secousse`). Les 73 presets natifs gardent leurs réglages
actuels (intensité figée au clic, comme en v0.6).

### Enveloppes : les « keyframes relatives au CTI ou au beat »
Pas de vraies keyframes : des expressions calées sur le marker. On garde ainsi l'avantage de v0.6 (déplacer le
marker déplace l'effet, un seul calque gère tous les beats).

```json
"env": "main"                                   // 1 -> 0 sur Durée, avec la courbe du preset
"env": { "shape": "strobe", "frames": 6, "every": 2 }
"env": { "shape": "attack", "len": 0.5, "at": -0.5, "curve": "expo" }   // monte AVANT le beat
```
Formes : `decay`, `attack`, `bell`, `hold`, `ramp`, `pulse` (n, duty), `strobe` (every), `steps` (n).
`len` et `at` sont des fractions de Durée (`frames` = durée fixe en images) ; `at` < 0 = anticipation
(l'expression regarde le marker suivant). `curve` : `main` (courbe du preset), `linear` ou un id de courbe.

Valeur d'un paramètre : un nombre, `{ "from": a, "to": b }` (suivant l'enveloppe de l'étape), ou
`{ "keys": [[0, 0], [0.15, 18], [1, 0]] }` (clés en fraction de Durée, lissées par la courbe du preset).
Les paramètres marqués `k` dans le schéma des primitives sont multipliés par `Intensite`.

## 4. Primitives (57)

Statut : **E** = existe déjà en v0.6 (refactorisé), **N** = nouveau. Coût : 1 léger, 2 moyen, 4 lourd.
Les paramètres d'effet sont visés par matchName (`ADBE Xxx-0001`) avec repli sur le nom anglais : les
nouveaux sont à confirmer par la **sonde** (voir § 8).

### Mouvement (effet Transform + Motion Tile, la transform du calque reste intacte)
| id | Rôle | Effets natifs | Coût | |
|---|---|---|---|---|
| `shake` | secousse : decay, wiggle, bursts, jumps, rumble, roll, recoil, heartbeat, quake, drunk, step ; axe xy, x, y, diag, rot | ADBE Tile, ADBE Geometry2 | 1 | E |
| `twitch` | sauts image par image : scale, slide, slidey, rot, skew, light, blur (+ RGB) | Geometry2, Exposure2, Box Blur2 | 1 | E |
| `punch` | coup de zoom, rotation ou position avec dépassement | Geometry2 | 1 | E |
| `drift` | mouvement lent : push, pull, pan, rotation, dutch | Geometry2 | 1 | N |
| `stretch` | étirement / écrasement X ou Y + skew | Geometry2 | 1 | E |
| `flip` | retournement H, V ou 180° | Geometry2 | 1 | N |

### Temps
| `timeRemap` | velocity, slowmo, speedup, freeze, rewind, stutter, boomerang, steps, ramp (expression combinée) | Time Remapping (+ Pixel Motion) | 2 | E |
| `posterizeTime` | cadence réduite | ADBE Posterize Time | 1 | E |
| `echo` | traînée / écho temporel | ADBE Echo | 4 | N |

### Flou
| `dirBlur` | flou directionnel | ADBE Motion Blur | 2 | E |
| `radialBlur` | zoom (CC Radial Fast Blur) ou spin (Radial Blur) | CC Radial Fast Blur, ADBE Radial Blur | 2 / 4 | E |
| `blur` | flou box ou gaussien | ADBE Box Blur2, ADBE Gaussian Blur 2 | 2 | E |

### Lumière et couleur
| `exposure` | flash d'exposition | ADBE Exposure2 | 1 | E |
| `flash` | aplat de couleur avec mode de fusion (solide frère) | solide | 1 | E |
| `invert` | inversion | ADBE Invert | 1 | N |
| `grade` | Lumetri de base | ADBE Lumetri | 2 | E |
| `levels` | noirs écrasés ou délavés, gamma | ADBE Easy Levels2 | 1 | N |
| `hueSat` | teinte, saturation, colorisation | ADBE HUE SATURATION | 1 | N |
| `colorBalance` | split toning (teal & orange, Kodak) | ADBE Color Balance 2 | 1 | N |
| `duotone` | 2-3 couleurs sur la luminance | ADBE Tritone | 1 | E |
| `bw` | désaturation partielle ou totale, teintée | ADBE Tint | 1 | E |
| `leaveColor` | garde une seule couleur | ADBE Leave Color | 1 | N |
| `glow` | glow simple, empilé (deep) ou bicolore ; Deep Glow si installé | ADBE Glo2 | 2-4 | E |
| `rays` | rayons / aura | CC Light Rays | 2 | N |
| `flare` | lens flare qui traverse | ADBE Lens Flare | 2 | N |
| `lightLeak` | fuite de lumière générée (solide en Screen) | Fractal Noise, Tritone | 2 | E |
| `vignette` | bords assombris ou colorés (solide masqué) | solide + masque | 1 | E |
| `sharpen` | netteté | ADBE Unsharp Mask2 | 1 | N |

### Distorsion et numérique
| `rgbSplit` | écart R / B (2 calques Channel Mixer en Éclaircir) | ADBE CHANNEL MIXER, Geometry2 | 2 | E |
| `waveWarp` | ondulation, tranches, tracking | ADBE Wave Warp | 2 | E |
| `lens` | fisheye, bombé, sphère | Optics Compensation, Bulge, Spherize | 2 | E |
| `warp` | turbulence, twirl, ripple (chaleur, liquide, onde de choc) | Turbulent Displace, Twirl, Ripple | 2 | N |
| `blocks` | blocs décalés, datamosh simulé, pixel sort simulé | Mosaic, Wave Warp, Echo, Motion Blur | 2-4 | N |
| `pixelate` | mosaïque | ADBE Mosaic | 1 | N |
| `posterize` | aplats | ADBE Posterize | 1 | N |
| `ink` | seuil noir et blanc ou contours | ADBE Threshold2, ADBE Find Edges | 1 | N |
| `halftone` | trame de points (approximation) | CC Ball Action | 2 | N |
| `scanlines` | lignes de balayage (solide frère) | ADBE Venetian Blinds | 1 | E |
| `grain` | grain fin, film, numérique, poussière (solide frère) | Fractal Noise | 2 | E |
| `mirror` | miroir, kaléidoscope, polaire | ADBE Mirror, CC Kaleida, Polar Coordinates | 2 | N |
| `speedLines` | lignes de vitesse radiales ou horizontales (solide frère) | Fractal Noise, Polar Coordinates, Levels | 2 | N |

### Transitions à 2 calques
| `wipe` | volet : linear, radial, iris, venetian, block, luma, grid, clock | Linear / Radial / Iris Wipe, Venetian Blinds, Block Dissolve, Gradient Wipe, CC Grid Wipe | 1 | N |
| `layer3d` | flip, cube, swing, slide 3D (chaque plan dans sa moitié) | calques 3D | 2 | N |

### Texte
| `textReveal` | animator + sélecteur : props combinées, unité, ordre (avant, arrière, centre, aléatoire, bords) | animators | 1 | E |
| `textRandom` | glitch, scramble, flicker par lettre | animators | 1 | E |
| `typewriter` | frappe + curseur | Source Text | 1 | E |
| `textWave` | vague continue (Y, scale, rotation) | animators | 1 | E |
| `textKinetic` | un mot par marker, surlignage du mot courant (sous-titres) | animators | 1 | E |
| `textStyle` | police (liste de repli), remplissage, contour, capitales | Source Text | 1 | E |
| `textShadow` | contour, halo, extrusion 3D, ombre longue | ADBE Drop Shadow (xN) | 1-2 | E |
| `textFill` | dégradé animé, chrome, reflet | ADBE Ramp, ADBE Bevel Alpha, CC Light Sweep | 2 | E |
| `textCounter` | compteur 0 -> N, markers, chrono | Source Text | 1 | N |

### Calques créés
| `hud` | hitmarker, crosshair, killfeed, letterbox, cadre, perforations, REC, scoreboard, barre joueur, lower third, grille, crochets, cases BD | calques de forme | 1 | E |
| `textLayer` | calque texte stylé (ACE, 1v5, REC, onomatopées) | texte | 1 | E |
| `particles` | poussière, étincelles, étoiles | CC Particle World, CC Star Burst | 4 | N |

### Caméra 3D
| `camera` | caméra YFX + null : push, pull, orbit, tilt, pan, roll, crane, dolly zoom, shake 3D | caméra, null | 2 | N |
| `parallax` | calques répartis en Z, ou faux relief sur un clip 2D (cylindre, sphère) | 3D, CC Cylinder, CC Sphere | 2 | N |

Les composés demandés deviennent des **recettes**, pas des primitives : `impactFrame` = ink + invert +
speedLines + punch ; `strobe` = enveloppe ; `crt` = scanlines + lens + rgbSplit + glow + vignette ; `vhs` =
scanlines + waveWarp + rgbSplit + grain.

Pas de LUT `.cube` : le fichier d'Apply Color LUT ne se règle pas proprement par script. Les looks sont
construits avec Lumetri, Color Balance, Levels, Hue/Saturation et Tritone.

## 5. Format du catalogue

Schéma formel : `catalog/schema.json`. Un fichier par catégorie : `{ "category": "impacts", "presets": [...] }`.

| Champ | Contenu |
|---|---|
| `id` | stable, jamais réutilisé ; nouveaux : préfixe de catégorie (`imp-`, `txt-`, `sty-`, `shk-`, `twi-`, `spd-`, `trn-`, `fx-`, `hud-`, `cam-`) ; les 73 gardent le leur |
| `name`, `nameEn` | français, anglais (`nameEn` sert aussi au nom des calques `YFX_<NameEn>` : unique) |
| `sub`, `desc` | sous-titre de carte, description de la fiche |
| `category` | une des 10 catégories |
| `styles` | 1 à 3 styles parmi les 22 |
| `tags` | mots-clés FR et EN (les synonymes génériques sont dans `synonyms.json`) |
| `role` | `in`, `hit`, `hold`, `out`, `transition` |
| `host`, `drive` | voir § 3 |
| `recipe` | suite d'étapes `{ "p": primitive, ...paramètres, "env": ... }` |
| `impl` | `recipe` (défaut) ou `native` (les 73 : le code v0.6 s'exécute, la recette sert de description et au lint) |
| `defaults` | `frames` (ou `"loop"`), `intensity` (0-2), `curve`, `dir`, `by` |
| `perf` | `leger`, `moyen`, `lourd` : calculé (somme des coûts : 1-3 léger, 4-8 moyen, 9+ lourd), surchargeable |
| `alt` | id d'une alternative légère (obligatoire pour un preset `lourd` quand elle existe) |
| `needs` | `sel` (comp, any, layer, av, text, audio, two), `markers`, `layers3d`, `plugins`, `optional` |
| `preview` | `kind` (hit, text, cut, loop), `word` |
| `sfx` | `type` (whoosh, impact, riser, click, glitch, bassdrop, reverse, swoosh…), `variant` (style) |
| `rank`, `since` | ordre éditorial (tri « populaire », pas de télémétrie) et version d'ajout (tri « récent ») |

Exemple (preset existant, exécuté par son code v0.6) :
```json
{ "id": "killhit", "name": "Kill Hit", "nameEn": "Kill Hit", "category": "impacts", "impl": "native",
  "styles": ["hype", "phonk", "raw"], "role": "hit", "host": "any", "drive": "marker",
  "tags": ["kill", "frag", "coup", "secousse", "shake", "flash", "rgb"],
  "recipe": [
    { "p": "shake", "pattern": "decay", "axis": "xy", "amp": 24, "rot": 1.5, "freq": 12 },
    { "p": "exposure", "stops": 1.5, "env": { "shape": "decay", "frames": 3, "curve": "linear" } },
    { "p": "rgbSplit", "px": 12 } ],
  "defaults": { "frames": 8, "curve": "back" }, "needs": { "sel": "any" },
  "preview": { "kind": "hit" }, "sfx": { "type": "impact", "variant": "hype" } }
```

Exemple (nouveau preset) :
```json
{ "id": "imp-manga-frame", "name": "Impact frame manga", "nameEn": "Manga Impact Frame", "category": "impacts",
  "styles": ["anime", "hype"], "role": "hit", "host": "adj", "drive": "marker",
  "tags": ["impact frame", "anime", "manga", "noir et blanc", "inversion", "lignes de vitesse"],
  "recipe": [
    { "p": "ink", "kind": "threshold", "level": 120, "env": { "shape": "hold", "frames": 4 } },
    { "p": "invert", "env": { "shape": "strobe", "frames": 4, "every": 2 } },
    { "p": "speedLines", "kind": "radial", "color": "#000000", "env": { "shape": "hold", "frames": 5 } },
    { "p": "punch", "channel": "scale", "amount": 18 },
    { "p": "shake", "pattern": "decay", "amp": 20, "freq": 14 } ],
  "defaults": { "frames": 12, "curve": "snap" }, "needs": { "sel": "any" },
  "preview": { "kind": "hit" }, "sfx": { "type": "impact", "variant": "anime" } }
```

Autres fichiers : `styles.json` (22 fiches), `packs.json` (packs de style), `synonyms.json` (recherche FR/EN),
`ids.lock` (tout id publié ; le build échoue si un id disparaît : les favoris ne cassent jamais).

Presets perso (empilement) : `{ "yfx": "user-preset", "v": 1, "id": "user-…", "name": "…",
"stack": [{ "id": "killhit", "params": {…} }, …] }`, appliqués en un seul undo group, exportables en `.json`.

## 6. Anti-doublon (`npm run lint:catalog`)

Pour chaque preset, une signature : jetons (primitive, paramètres catégoriels comme `pattern`, `axis`, `kind`,
`channel`, forme d'enveloppe, `host`, `drive`, couleurs ramenées à 12 teintes + clair / sombre) et un vecteur
de paramètres numériques normalisés par les bornes de chaque primitive.

- `D = 0,7 x (1 - Jaccard pondéré des jetons) + 0,3 x écart moyen des paramètres numériques`
- **DOUBLON** si `D < 0,12` ; **INTENSITÉ SEULE** si mêmes jetons et vecteurs des paramètres `k`
  proportionnels (cosinus > 0,98) ; **RÉGLAGE SEUL** si seuls durée, courbe ou sens diffèrent : tous bloquants.
- **PROCHE** si `D < 0,2` : avertissement à justifier dans le tableau du lot.
- Comparaison sur tout le catalogue (un shake d'Impacts contre un shake de Shake).

## 7. Migration des 73

- Tous passent dans le JSON avec leurs ids. `impl: "native"` : le code v0.6 s'exécute tel quel, comportement
  identique garanti. La recette décrit ce qu'ils font (fiche, lint).
- Changements de catégorie (les ids ne changent pas, donc favoris intacts) :
  styles de titres `val`, `cs2`, `neon`, `double`, `grad`, `glitchs` -> **Texte** ; étalonnages `cold`, `warm`,
  `punchy` et `vig` -> **Styles** ; `flash` -> **Impacts** ; `grain`, `leak`, `letterbox`, `feed` -> **Overlays**.
- Les anciennes « vibes » deviennent des styles : clean -> Raw / Quality, aggro -> Hype / Phonk,
  smooth -> Flow, glitch -> Glitch, retro -> VHS / Lo-fi (puis affiné preset par preset).
- Corrigé au passage : `grain`, `leak` et `vhs` visent des paramètres par leur nom anglais
  (« Contrast », « Amount of Noise »…) et casseraient sur un AE en français. Passage aux matchNames après la sonde.

## 8. Ce qui dépend d'After Effects

Je ne peux pas lancer AE. Ce qui reste à vérifier chez toi, dans l'ordre :
1. **Sonde des effets** (nouveau bouton, Réglages > Diagnostic) : ajoute chaque effet utilisé par les primitives
   sur un calque temporaire et écrit ses paramètres (nom + matchName). Une minute, et toutes mes hypothèses
   de noms de paramètres sont vérifiées.
2. **Auto-test** : désormais piloté par le panel, il applique chaque recette du catalogue et cherche les
   erreurs d'expression.
3. **Previews** : génération par lots, reprise là où elle s'est arrêtée (environ 4 s par preset dans AE).

## 9. Risques connus

- Volets (`wipe`) : un vrai volet A -> B demande que les deux plans se chevauchent. Le moteur rallonge le plan
  entrant s'il a des images avant sa coupe (sinon le sortant s'il en a après) ; sinon, message clair.
- `halftone`, `blocks` (datamosh, pixel sort) : approximations natives. Si le rendu ne convainc pas, on les
  retire plutôt que de garder du faux.
- « Passage à travers un objet » : impossible sans masque de l'objet (rotoscopie). Remplacé par un passage luma
  (la transition suit les zones sombres de l'image).
- Dolly zoom et parallaxe : invisibles sur un seul calque plat ; ils demandent 2 calques ou plus (`needs`).
- Plugins tiers (Twixtor, Deep Glow, Sapphire) : déclarés dans `needs.plugins`, testables seulement si installés.
- Performances du panel : mesurées dans Chromium (Playwright), pas dans le Chromium de CEP.

## 10. Ordre de réalisation

1. Plan (ce document), `catalog/schema.json`, `catalog/styles.json`.
2. Moteur : registre + enveloppes + hôtes + interpréteur, primitives, sonde, autotest piloté par le panel.
   Build du catalogue, lint, migration des 73, échantillon de 10 presets par catégorie.
3. Catalogue complet, catégorie par catégorie : lint + tests moteur + tableau récapitulatif à chaque lot
   (`docs/CATALOGUE.md`, généré).
4. Panel : grille virtualisée, sélecteur de style, filtres, recherche floue, fiche, empilement, contexte,
   raccourcis, historique, packs. Tests navigateur à 340, 450 et 560 px avec captures.
5. Previews par lots (WebM VP9 256 px + WebP de secours) et banque de SFX générée en Python.
6. Test dans AE (toi) : sonde, auto-test, previews ; corrections à partir des rapports.
