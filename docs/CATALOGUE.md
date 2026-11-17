# Catalogue YexoFX

Généré par `tools/catalog.mjs` : ne pas éditer à la main.

592 presets, 57 primitives. Lint : 0 doublon(s) bloquant(s), 0 paire(s) proche(s).

| Catégorie | Presets | léger | moyen | lourd |
|---|---|---|---|---|
| Impacts | 97 | 72 | 24 | 1 |
| Texte | 88 | 80 | 8 | 0 |
| Styles | 75 | 19 | 56 | 0 |
| Shake | 54 | 53 | 1 | 0 |
| Twitch | 45 | 44 | 1 | 0 |
| Vitesse | 43 | 29 | 14 | 0 |
| Transitions | 64 | 51 | 13 | 0 |
| FX | 58 | 40 | 11 | 7 |
| Overlays & HUD | 44 | 44 | 0 | 0 |
| Caméra 3D | 24 | 21 | 3 | 0 |

| Style | Presets |
|---|---|
| Phonk / Velocity | 50 |
| Flow / Smooth | 45 |
| Hype / Hard | 111 |
| Cinematic / Film | 88 |
| Raw / Clean | 43 |
| Quality / CC | 34 |
| Glitch / Digital | 90 |
| VHS / Retro 90s | 39 |
| Y2K / Chrome | 63 |
| Anime / Manga | 38 |
| Comic / Pop Art | 45 |
| Cyberpunk / Neon | 50 |
| Noir / Accent rouge | 32 |
| Dreamy / Soft | 62 |
| Aura / Sigma | 38 |
| Funk BR / Montagem | 67 |
| Minimal / Swiss | 44 |
| 3D / Parallax | 32 |
| Esport Broadcast | 67 |
| Lo-fi / Vibe | 46 |
| Horror / Creepy | 58 |
| Kinetic Type | 30 |

## Impacts (97)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Kill Hit ·v0.6 | Hype, Phonk, Raw | impact | moyen | shake:decay + exposure + rgbSplit |
| Shake + Twitch ·v0.6 | Hype, Funk | impact | léger | shake:decay + twitch |
| RGB Punch ·v0.6 | Hype, Glitch | impact | léger | punch:scale + rgbSplit |
| Headshot Pop ·v0.6 | Raw, Quality | impact | moyen | punch:scale + radialBlur + exposure |
| Bass Drop ·v0.6 | Phonk, Hype | impact | moyen | shake:decay + exposure + rgbSplit |
| Flicker ·v0.6 | Glitch, Hype | impact | léger | exposure |
| Choppy Hit ·v0.6 | Glitch, Funk | impact | léger | shake:decay + posterizeTime |
| Glow Hit ·v0.6 | Quality, Cyber | impact | léger | glow + exposure |
| Lens Punch ·v0.6 | Quality, Y2K | impact | léger | punch:scale + lens:fisheye |
| Freeze Hit ·v0.6 | Anime, Aura, Cinéma | impact | moyen | timeRemap:freeze + drift:push + bw + exposure |
| Flash ·v0.6 | Hype, Raw, Phonk | impact | léger | flash |
| Impact frame manga | Anime, Hype | impact | moyen | ink:threshold + invert + speedLines:radial + punch:scale + shake:decay |
| Coup rouge | Horror, Noir | impact | moyen | flash + warp:turbulent + shake:quake |
| Onde de choc | Cinéma, Quality | impact | moyen | warp:ripple + exposure + blur:gauss |
| Éclat néon | Cyber, Y2K | impact | moyen | glow + rgbSplit + punch:scale |
| Recul inversé | Phonk, Hype | impact | léger | invert + shake:recoil + punch:scale |
| Glitch Hit | Glitch, Cyber | impact | moyen | blocks:shift + rgbSplit + exposure |
| Zoom chroma | Y2K, Dreamy | impact | moyen | radialBlur + lens:fisheye + hueSat |
| Battement | Aura, Horror | impact | léger | shake:heartbeat + bw + vignette |
| Pixel Pop | Glitch, Comic | impact | léger | pixelate + punch:scale |
| Flare Hit | Cinéma, Quality | impact | léger | flare + exposure |
| Tampon ACE | Esport, Hype | impact | moyen | textLayer + punch:scale + shake:decay + textShadow:extrude |
| POW! | Comic, Anime | impact | moyen | textLayer + textShadow:outline + punch:rot + punch:scale |
| Strobe funk | Funk, Hype | impact | léger | exposure + hueSat + punch:scale |
| Flash punch | Raw, Hype | impact | léger | flash + punch:scale |
| Coupure noire | Horror, Noir | impact | léger | flash + shake:decay |
| Flash rouge | Phonk, Hype | impact | léger | flash + shake:decay |
| Flash glacé | Aura, Cyber | impact | léger | flash + punch:scale |
| Flash doré | Esport, Quality | impact | léger | flash + glow |
| Négatif différence | Glitch, Funk | impact | léger | flash + punch:scale |
| Spin punch | Funk, Hype | impact | moyen | punch:rot + radialBlur |
| Coup latéral | Flow, Raw | impact | léger | punch:posx + dirBlur |
| Slam | Phonk, Hype | impact | léger | punch:posy + dirBlur |
| Recul ciné | Cinéma, Noir | impact | léger | punch:scale + vignette |
| Écrasement | Comic, Funk | impact | léger | stretch + stretch |
| Étirement vertical | Y2K, Flow | impact | léger | stretch + dirBlur |
| Flip miroir | Funk, Glitch | impact | léger | flip + flash |
| Tête en bas | Funk, Comic | impact | léger | flip + punch:scale |
| Miroir central | Y2K, Glitch | impact | léger | mirror:mirror + exposure |
| Éclat kaléido | Dreamy, Y2K | impact | moyen | mirror:kaleida + radialBlur |
| Snap polaire | Glitch, Y2K | impact | moyen | mirror:polar + rgbSplit |
| Bulle | Comic, Y2K | impact | léger | lens:bulge + punch:scale |
| Sphère | Y2K, 3D | impact | léger | lens:sphere + flash |
| Vrille | Dreamy, Horror | impact | moyen | warp:twirl + radialBlur |
| Distorsion acide | Horror, Glitch | impact | léger | warp:turbulent + exposure |
| Onde lumineuse | Aura, Cinéma | impact | moyen | warp:ripple + rays |
| Mosh RGB | Glitch, VHS | impact | moyen | blocks:mosh + rgbSplit |
| Sort négatif | Glitch, Cyber | impact | léger | blocks:sort + invert |
| Aplats pop | Comic, Funk | impact | léger | posterize + punch:scale + exposure |
| Trame BD | Comic | impact | léger | halftone + punch:rot |
| Contours encrés | Comic, Anime | impact | léger | ink:edges + exposure |
| Lignes blanches | Anime, Hype | impact | léger | speedLines:radial + punch:scale |
| Dash | Anime, Flow | impact | léger | speedLines:horizontal + punch:posx |
| Lignes rouges | Anime, Horror | impact | léger | speedLines:radial + shake:quake |
| Explosion de rayons | Aura, Cinéma | impact | léger | rays + exposure |
| Flare zoom | Cinéma, Y2K | impact | léger | flare + punch:scale |
| Glow magenta | Cyber, Y2K | impact | léger | glow + flash |
| Punch N&B | Noir, Aura | impact | léger | bw + punch:scale |
| Seul le rouge | Noir, Horror | impact | léger | leaveColor + punch:scale |
| Saut de teinte | Glitch, Funk | impact | léger | hueSat + shake:step |
| Teinte sang | Horror, Phonk | impact | léger | hueSat + shake:decay |
| Duo cyber | Cyber, Y2K | impact | léger | duotone + rgbSplit |
| Écrasement des noirs | Phonk, Raw | impact | léger | levels + shake:decay |
| Plongée sombre | Horror, Noir | impact | léger | exposure + shake:heartbeat |
| Strobe négatif | Funk, Glitch | impact | léger | invert + shake:step |
| Strobe N&B | Funk, Noir | impact | léger | bw + punch:scale |
| Écho punch | Dreamy, Flow | impact | lourd | echo + punch:scale |
| Flou punch | Flow, Dreamy | impact | léger | blur:gauss + punch:scale |
| Saccade RGB | Glitch, VHS | impact | léger | posterizeTime + rgbSplit |
| Glitch VHS | VHS, Lo-fi | impact | moyen | waveWarp + scanlines + rgbSplit |
| Ondulation | Dreamy, Flow | impact | léger | waveWarp |
| Glitch carré | Glitch, Minimal | impact | léger | waveWarp |
| Secousse RGB | Hype, Glitch | impact | léger | shake:decay + twitch |
| Pivot lumière | Funk, Hype | impact | léger | twitch + exposure |
| Séisme flou | Cinéma, Horror | impact | léger | shake:quake + radialBlur |
| Pouls rouge | Horror, Aura | impact | léger | shake:heartbeat + flash |
| Recul + éclat | Raw, Esport | impact | léger | shake:recoil + exposure |
| Diagonale RGB | Hype, Glitch | impact | léger | shake:decay + rgbSplit |
| Bascule zoom | Phonk, Hype | impact | moyen | shake:decay + punch:scale + radialBlur |
| Rafale + flash | Hype, Raw | impact | léger | shake:bursts + exposure |
| Saccade pixel | Glitch, Funk | impact | léger | shake:step + pixelate |
| Hitmarker + éclat | Esport, Hype | impact | léger | hud:hitmarker + flash |
| HEADSHOT | Esport, Hype | impact | léger | textLayer + textShadow:outline + punch:scale |
| ONE TAP néon | Cyber, Esport | impact | moyen | textLayer + glow + punch:rot |
| BOOM | Comic | impact | léger | textLayer + textShadow:extrude + shake:quake |
| BAM! | Anime, Comic | impact | léger | textLayer + textShadow:outline + punch:scale |
| KILL glissé | Kinetic, Minimal | impact | léger | textLayer + punch:posy + textShadow:long |
| Aura qui monte | Aura | impact | moyen | glow + bw + drift:push |
| Bloom doux | Lo-fi, Dreamy | impact | moyen | exposure + blur:gauss + grain:film |
| Coupe propre | Minimal, Raw | impact | léger | flash + punch:scale |
| Flash broadcast | Esport, Minimal | impact | léger | flash + scanlines + punch:posx |
| Scan cyber | Cyber | impact | moyen | scanlines + glow + rgbSplit |
| Choc noir | Noir, Horror | impact | léger | bw + flash |
| Brûlure pellicule | Cinéma, Lo-fi | impact | léger | lightLeak + exposure |
| Tunnel | Aura, Phonk | impact | léger | radialBlur + vignette |
| Torsion chroma | Glitch, Funk | impact | léger | rgbSplit + punch:rot |
| Zoom anticipé | Phonk, Kinetic | impact | léger | punch:scale + exposure |

## Texte (88)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Pop ·v0.6 | Raw, Kinetic, Esport | entrée | léger | textReveal |
| Slide ·v0.6 | Kinetic, Minimal | entrée | léger | textReveal |
| Blur ·v0.6 | Dreamy, Flow, Cinéma | entrée | léger | textReveal |
| Typewriter ·v0.6 | Minimal, VHS, Kinetic | entrée | léger | typewriter |
| Glitch ·v0.6 | Glitch, Cyber | entrée | léger | textRandom:glitch |
| Stomp ·v0.6 | Hype, Phonk | entrée | léger | textReveal + shake:decay |
| Flip 3D ·v0.6 | 3D, Kinetic | entrée | léger | textReveal |
| Tracking ·v0.6 | Cinéma, Minimal | entrée | léger | textReveal |
| Scramble ·v0.6 | Glitch, Cyber, Esport | entrée | léger | textRandom:scramble |
| Wave ·v0.6 | Lo-fi, Dreamy | maintien | léger | textWave |
| Kinetic ·v0.6 | Kinetic, Hype | entrée | léger | textKinetic |
| Valorant ·v0.6 | Esport, Hype | maintien | léger | textStyle + textShadow:offset |
| CS2 ·v0.6 | Esport, Raw | maintien | léger | textStyle + textShadow:offset |
| Néon ·v0.6 | Cyber, Y2K | maintien | léger | textStyle + textShadow:halo |
| Double contour ·v0.6 | Comic, Y2K | maintien | léger | textStyle + textShadow:outline |
| Gradient ·v0.6 | Y2K, Dreamy | maintien | léger | textFill:gradient |
| Glitch figé ·v0.6 | Glitch, VHS | maintien | léger | textShadow:offset + textShadow:offset |
| Chute élastique | Kinetic, Comic | entrée | léger | textReveal |
| Éclat central | Hype, Kinetic | entrée | léger | textReveal |
| Swing 3D | 3D, Cinéma | entrée | léger | textReveal |
| Pop aléatoire | Funk, Comic | entrée | léger | textReveal |
| Titre chrome | Y2K, Cyber | maintien | moyen | textStyle + textFill:chrome + textShadow:halo |
| Rouge clignotant | Noir, Horror | entrée | léger | textRandom:flicker + textStyle + textShadow:long |
| Sous-titres TikTok | Kinetic, Minimal | maintien | léger | textKinetic + textShadow:outline |
| Compteur de kills | Esport, Hype | maintien | léger | textCounter:markers + textStyle |
| Compteur 0 → 100 | Minimal, Cinéma | entrée | léger | textCounter:count |
| 1v5 écrasé | Hype, Esport | entrée | moyen | textLayer + textReveal + textShadow:extrude + shake:decay |
| CLUTCH glitch | Glitch, Esport | entrée | léger | textLayer + textRandom:scramble + textShadow:offset |
| Manuscrit lo-fi | Lo-fi, Dreamy | entrée | léger | textStyle + textReveal |
| Montée floue | Flow, Dreamy | entrée | léger | textReveal |
| Descente | Kinetic, Minimal | entrée | léger | textReveal |
| Entrée latérale | Kinetic, Esport | entrée | léger | textReveal |
| Rétrécit | Hype, Kinetic | entrée | léger | textReveal |
| Lettres qui tournent | Comic, Funk | entrée | léger | textReveal |
| Retournement de carte | 3D, Esport | entrée | léger | textReveal |
| Glisse penchée | Kinetic, Esport | entrée | léger | textReveal |
| Lettres serrées | Minimal, Cinéma, Kinetic | entrée | léger | textReveal |
| Arrivée rouge | Hype, Phonk | entrée | léger | textReveal |
| Brume centrale | Dreamy, Cinéma | entrée | léger | textReveal |
| Bascule avant | 3D, Kinetic | entrée | léger | textReveal |
| Terminal | Cyber, Minimal | entrée | léger | typewriter + textStyle + textShadow:halo |
| Décodage néon | Cyber, Y2K | entrée | léger | textRandom:scramble + textShadow:halo |
| Glitch sang | Glitch, Horror | entrée | léger | textRandom:glitch + textStyle + textShadow:offset |
| Néon qui s'allume | Cyber, Y2K | entrée | léger | textRandom:flicker + textStyle + textShadow:halo |
| Balancement | Lo-fi, Comic | maintien | léger | textWave |
| Respiration | Dreamy, Kinetic | maintien | léger | textWave |
| Mots empilés | Kinetic, Minimal | entrée | léger | textKinetic |
| Karaoké rouge | Kinetic, Hype | maintien | léger | textKinetic + textStyle |
| Chrono | Esport, Minimal | maintien | léger | textCounter:timer + textStyle |
| Argent CS2 | Esport, Hype | entrée | léger | textCounter:count + textStyle |
| Titre BD | Comic | maintien | léger | textStyle + textShadow:extrude |
| Titre noir | Noir, Cinéma | maintien | léger | textStyle + textShadow:long |
| Titre horreur | Horror | maintien | moyen | textStyle + textShadow:halo + waveWarp |
| Titre lo-fi | Lo-fi | maintien | léger | textStyle + textShadow:offset |
| Titre VHS | VHS | maintien | léger | textStyle + textShadow:offset + textShadow:offset |
| Plaque esport | Esport | maintien | léger | textStyle + textShadow:extrude |
| Titre aura | Aura, Minimal | maintien | moyen | textStyle + textShadow:halo + glow |
| Bulle Y2K | Y2K, Dreamy | maintien | léger | textFill:gradient + textShadow:outline |
| Titre cyber | Cyber | maintien | moyen | textStyle + glow + textShadow:offset |
| Titre suisse | Minimal | maintien | léger | textStyle |
| Titre or | Esport, Quality | maintien | léger | textFill:gradient + textShadow:extrude |
| Reflet argent | Y2K, Quality | maintien | léger | textStyle + textFill:sweep |
| Titre anime | Anime | maintien | léger | textStyle + textShadow:outline + textShadow:offset |
| Titre phonk | Phonk | maintien | léger | textStyle + textShadow:halo |
| Titre funk | Funk | maintien | léger | textStyle + textShadow:extrude |
| Titre rêveur | Dreamy, Lo-fi | maintien | léger | textStyle + textShadow:halo |
| Titre brut | Raw | maintien | léger | textStyle + textShadow:offset |
| ACE pop | Hype, Esport | entrée | léger | textLayer + textReveal + textShadow:extrude |
| gg qui ondule | Lo-fi, Kinetic | maintien | léger | textLayer + textWave |
| CLUTCH néon | Cyber, Esport | entrée | léger | textLayer + textRandom:flicker + textShadow:halo |
| BOMB DEFUSED | Esport, Minimal | entrée | léger | textLayer + typewriter |
| VICTORY doré | Cinéma, Esport | entrée | moyen | textLayer + textReveal + textFill:gradient |
| NO SCOPE | Hype, Comic | entrée | léger | textLayer + textReveal + textShadow:outline |
| FLAWLESS | Aura, Cinéma | entrée | moyen | textLayer + textReveal + glow |
| WALLBANG | Glitch, Esport | entrée | léger | textLayer + textRandom:glitch + textShadow:offset |
| EZ sticker | Funk, Comic | entrée | léger | textLayer + textReveal + textShadow:outline |
| Pseudo | Esport, Minimal | entrée | léger | textLayer + textReveal + textShadow:long |
| ULT READY | Esport, Hype | entrée | moyen | textLayer + textReveal + glow |
| ZOOM manga | Anime, Comic | entrée | léger | textLayer + textReveal + textShadow:outline |
| Bascule inverse | Kinetic, Funk | entrée | léger | textReveal |
| Vitesse floue | Cyber, Kinetic | entrée | léger | textReveal |
| Entrée dorée | Esport, Quality | entrée | léger | textReveal |
| Plongée 3D | 3D, Cinéma | entrée | léger | textReveal |
| Pop des bords | Minimal, Kinetic | entrée | léger | textReveal |
| Encre qui coule | Noir, Dreamy | entrée | léger | textReveal |
| Slide inversé | Kinetic, Minimal | entrée | léger | textReveal |
| Roulement VHS | VHS, Glitch | entrée | léger | textReveal |
| Fondu simple | Lo-fi, Minimal, Kinetic | entrée | léger | textReveal |

## Styles (75)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Froid ·v0.6 | Quality, Cinéma | maintien | léger | grade |
| Chaud ·v0.6 | Lo-fi, Cinéma | maintien | léger | grade |
| Punchy ·v0.6 | Hype, Quality | maintien | léger | grade |
| Vignette ·v0.6 | Cinéma, Noir, Horror | maintien | léger | vignette |
| Teal & orange | Cinéma, Quality | maintien | moyen | colorBalance + grade + vignette |
| Pellicule Kodak | Cinéma, Lo-fi | maintien | moyen | grade + colorBalance + levels + grain:film |
| Noir accent rouge | Noir, Horror | maintien | moyen | leaveColor + grade + vignette |
| N&B écrasé | Noir, Raw | maintien | moyen | bw + levels + grain:fine |
| Nuit cyber | Cyber, Y2K | maintien | moyen | duotone + glow + scanlines |
| Pastel rêveur | Dreamy, Lo-fi | maintien | moyen | grade + glow + hueSat |
| Cassette VHS | VHS, Lo-fi | maintien | moyen | scanlines + waveWarp + rgbSplit + grain:digital + levels |
| Lo-fi délavé | Lo-fi, Dreamy | maintien | moyen | grade + levels + grain:film |
| Aura désaturée | Aura, Noir | maintien | moyen | bw + glow + vignette |
| Pop art | Comic, Funk | maintien | léger | posterize + hueSat + ink:edges |
| Glace Y2K | Y2K, Cyber | maintien | moyen | colorBalance + grade + glow + lens:fisheye |
| Malsain | Horror | maintien | moyen | colorBalance + grade + vignette + warp:turbulent |
| Crisp | Quality, Raw | maintien | moyen | sharpen + grade + glow |
| Mono phonk | Phonk, Noir | maintien | moyen | bw + levels + grain:digital |
| Funk saturé | Funk, Hype | maintien | moyen | hueSat + grade + colorBalance |
| Diffusion esport | Esport, Quality | maintien | moyen | grade + sharpen + vignette |
| Violet phonk | Phonk, Cyber | maintien | moyen | duotone + levels + grain:digital |
| Nuit rouge | Phonk, Horror | maintien | moyen | colorBalance + grade + vignette |
| Fumée drift | Phonk, Aura | maintien | moyen | bw + glow + grain:film |
| Flow net | Flow, Quality | maintien | moyen | grade + glow |
| Flow doux | Flow, Dreamy | maintien | léger | grade + colorBalance |
| Overdrive | Hype, Phonk | maintien | moyen | levels + grade + sharpen |
| Punch rouge | Hype, Esport | maintien | moyen | hueSat + colorBalance + grade |
| Bleach bypass | Cinéma, Noir | maintien | moyen | bw + grade + levels |
| Heure dorée | Cinéma, Lo-fi | maintien | moyen | grade + colorBalance + glow |
| Nuit américaine | Cinéma, Horror | maintien | moyen | grade + colorBalance + vignette |
| Anamorphique | Cinéma, Quality | maintien | léger | colorBalance + flare |
| Fragmovie | Raw, Esport | maintien | moyen | grade + sharpen + levels |
| Désat compétitif | Raw, Minimal | maintien | moyen | hueSat + grade + vignette |
| Deep glow natif | Quality, Y2K | maintien | moyen | glow + grade + sharpen |
| HDR | Quality, Raw | maintien | léger | grade + sharpen |
| Numérique sale | Glitch, Cyber | maintien | moyen | rgbSplit + scanlines + grain:digital + posterize |
| Fichier corrompu | Glitch, Horror | maintien | moyen | blocks:shift + rgbSplit |
| VHS bleutée | VHS, Lo-fi | maintien | moyen | colorBalance + levels + scanlines + grain:fine |
| Vidéo de famille | VHS, Dreamy | maintien | moyen | grade + blur:gauss + waveWarp |
| Rose Y2K | Y2K, Dreamy | maintien | moyen | colorBalance + glow + lens:fisheye |
| Argent Y2K | Y2K, Noir | maintien | moyen | bw + glow + sharpen |
| Cel shading | Anime, Comic | maintien | moyen | posterize + grade + ink:edges + glow |
| Ciel d'anime | Anime, Dreamy | maintien | moyen | colorBalance + grade + glow |
| Page de manga | Anime, Noir | maintien | léger | ink:threshold + halftone |
| Trame pop | Comic, Funk | maintien | léger | halftone + hueSat |
| Vieille impression | Comic, Lo-fi | maintien | moyen | duotone + posterize + grain:film |
| Sarcelle et rose | Cyber, Y2K | maintien | moyen | colorBalance + glow |
| Pluie numérique | Cyber, Glitch | maintien | moyen | duotone + scanlines + rgbSplit |
| Argentique N&B | Noir, Cinéma | maintien | moyen | bw + glow + vignette |
| Sépia | Noir, Lo-fi | maintien | léger | bw + grain:film |
| High key | Noir, Minimal | maintien | moyen | bw + levels + glow |
| Accent bleu | Noir, Cyber | maintien | léger | leaveColor + grade |
| Rose poudré | Dreamy | maintien | moyen | glow + grade |
| Brume | Dreamy, Aura | maintien | moyen | blur:gauss + hueSat + glow |
| Aura dorée | Aura, Esport | maintien | léger | bw + glow |
| Aura pourpre | Aura, Horror | maintien | moyen | bw + glow + vignette |
| Nuit froide | Aura, Cinéma | maintien | moyen | grade + glow + vignette |
| Tropical | Funk, Y2K | maintien | léger | colorBalance + hueSat |
| Acide | Funk, Glitch | maintien | moyen | hueSat + posterize + glow |
| Mono propre | Minimal, Raw | maintien | léger | bw + levels |
| Papier | Minimal, Lo-fi | maintien | léger | duotone |
| Rouge suisse | Minimal, Noir | maintien | léger | leaveColor + levels |
| Brume atmosphérique | 3D, Cinéma | maintien | moyen | blur:gauss + levels + colorBalance |
| Volume | 3D, Aura | maintien | moyen | rays + grade + vignette |
| Look Valorant | Esport, Hype | maintien | moyen | colorBalance + grade + sharpen |
| Look CS2 | Esport, Raw | maintien | moyen | grade + colorBalance + levels |
| Vert vintage | Lo-fi, VHS | maintien | moyen | colorBalance + grade + grain:film |
| Coucher lo-fi | Lo-fi, Dreamy | maintien | moyen | grade + colorBalance + lightLeak |
| Polaroid | Lo-fi, Minimal | maintien | moyen | levels + grade + vignette + grain:fine |
| Froid mortel | Horror, Noir | maintien | moyen | grade + vignette + grain:film |
| Chambre rouge | Horror, Phonk | maintien | léger | hueSat + vignette |
| Found footage | Horror, VHS | maintien | moyen | bw + grain:digital + scanlines + waveWarp |
| Fond pour texte | Kinetic, Minimal | maintien | moyen | blur:gauss + grade + vignette |
| Fond mono | Kinetic, Noir | maintien | moyen | bw + exposure + blur:box |
| Fond coloré | Kinetic, Phonk | maintien | léger | duotone + exposure |

## Shake (54)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Smooth ·v0.6 | Flow, Cinéma | maintien | léger | shake:wiggle |
| Handheld ·v0.6 | Raw, Cinéma | maintien | léger | shake:wiggle |
| Twitchy ·v0.6 | Hype, Glitch | maintien | léger | shake:bursts |
| Jumpy ·v0.6 | Hype, Funk | maintien | léger | shake:jumps |
| Impact ·v0.6 | Hype, Phonk, Raw | impact | léger | shake:decay |
| Horizontal ·v0.6 | Raw, Hype | impact | léger | shake:decay |
| Vertical ·v0.6 | Phonk, Hype | impact | léger | shake:decay |
| Rumble ·v0.6 | Cinéma, Horror | impact | léger | shake:rumble |
| Roll ·v0.6 | Flow, Dreamy | maintien | léger | shake:roll |
| Recul d'arme | Raw, Esport | impact | léger | shake:recoil |
| Pouls | Aura, Horror | maintien | léger | shake:heartbeat |
| Tremblement de terre | Cinéma, Horror | impact | léger | shake:quake |
| Ivre | Lo-fi, Dreamy | maintien | léger | shake:drunk |
| Saccadé | Glitch, Funk | impact | léger | shake:step |
| Diagonale | Hype, Phonk | impact | léger | shake:decay |
| Rotation | Phonk, Funk | impact | léger | shake:decay |
| Rafales floues | Hype, Quality | maintien | léger | shake:bursts + radialBlur |
| Secousse 3D | 3D, Hype | impact | léger | shake:decay |
| Wobble basse | Phonk, Funk | impact | léger | shake:rumble + punch:scale |
| Balancement latéral | Flow, Cinéma | maintien | léger | shake:wiggle |
| Marche | Lo-fi, Raw | maintien | léger | shake:wiggle |
| Caméra qui respire | 3D, Quality | maintien | léger | shake:wiggle |
| Rafales latérales | Glitch, Hype | maintien | léger | shake:bursts |
| Rafale au marker | Hype, Funk | impact | léger | shake:bursts |
| Sauts au marker | Hype, Glitch | impact | léger | shake:jumps |
| Sauts pivotés | Funk, Hype | maintien | léger | shake:jumps |
| Moteur | Phonk, Cinéma | maintien | léger | shake:rumble |
| Grondement latéral | Cinéma, Phonk | impact | léger | shake:rumble |
| Roulis au marker | Flow, Phonk | impact | léger | shake:roll |
| Roulis rêveur | Dreamy, Flow | maintien | léger | shake:roll |
| Recul lourd | Raw, Esport | impact | léger | shake:recoil |
| Battement unique | Aura, Horror | impact | léger | shake:heartbeat |
| Tremblement continu | Horror, Cinéma | maintien | léger | shake:quake |
| Séisme vertical | Phonk, Hype | impact | léger | shake:quake |
| Étourdi | Dreamy, Horror | impact | léger | shake:drunk |
| Stop-motion | Glitch, Comic | maintien | léger | shake:step |
| Saccade latérale | Funk, Glitch | impact | léger | shake:step |
| Horizontal pivoté | Raw, Hype | impact | léger | shake:decay |
| Pompe basse | Phonk, Funk | impact | léger | shake:decay |
| Diagonale pivotée | Hype, Anime | impact | léger | shake:decay |
| Secousse floue X | Quality, Flow | impact | léger | shake:decay + dirBlur |
| Secousse floue Y | Quality, Phonk | impact | léger | shake:decay + dirBlur |
| Secousse chroma | Glitch, Hype | impact | léger | shake:decay + rgbSplit |
| Secousse éclair | Raw, Hype | impact | léger | shake:decay + exposure |
| Course | Raw, Cinéma | maintien | léger | shake:wiggle + shake:jumps |
| Vibration | Minimal, Esport | impact | léger | shake:decay |
| Flottement flou | Dreamy, Aura | maintien | léger | shake:wiggle + blur:gauss |
| Angoisse | Horror, Aura | maintien | léger | shake:rumble + vignette |
| Secousse en recul | Cinéma, Raw | impact | léger | shake:decay + punch:scale |
| Secousse nette | Raw, Esport | impact | léger | shake:decay |
| Bascule 3D | 3D, Phonk | impact | léger | shake:decay |
| Secousse buguée | Glitch, VHS | impact | moyen | shake:step + rgbSplit + posterizeTime |
| Secousse manga | Anime, Comic | impact | léger | shake:step + speedLines:radial |
| Épaule ciné | Cinéma, 3D | maintien | léger | shake:drunk |

## Twitch (45)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Twitch Scale ·v0.6 | Hype, Funk | impact | léger | twitch |
| Twitch Slide ·v0.6 | Glitch, Hype | impact | léger | twitch |
| Twitch Light ·v0.6 | Hype, Funk | impact | léger | twitch |
| Twitch Blur ·v0.6 | Hype, Flow | impact | léger | twitch |
| Twitch Time ·v0.6 | Glitch, Funk | impact | léger | timeRemap:steps |
| Twitch Full ·v0.6 | Hype, Glitch, Funk | impact | léger | twitch |
| Twitch Rotation | Funk, Hype | impact | léger | twitch |
| Twitch Skew | Glitch, Cyber | impact | léger | twitch |
| Twitch vertical | Glitch, Funk | impact | léger | twitch |
| Zoom + lumière | Funk, Phonk | impact | léger | twitch |
| Twitch RGB | Glitch, VHS | impact | léger | twitch |
| Glissé flou | Flow, Hype | impact | léger | twitch |
| Twitch anime | Anime, Hype | impact | léger | twitch |
| Twitch XY RGB | Glitch, Cyber | impact | léger | twitch |
| Micro-jitter | Quality, Raw | maintien | léger | twitch |
| Strobe saccadé | Funk, Hype | impact | léger | twitch + posterizeTime |
| Skew + RGB | Glitch, VHS | impact | léger | twitch |
| Rotation + lumière | Funk, Hype | impact | léger | twitch |
| Zoom flou | Hype, Flow | impact | léger | twitch |
| Glissé lumineux | Hype, Raw | impact | léger | twitch |
| Sauts verticaux lumineux | Phonk, Funk | impact | léger | twitch |
| Décrochage | Cyber, Glitch | impact | léger | twitch |
| Pivot flou | Flow, Dreamy | impact | léger | twitch |
| Zoom RGB | Glitch, Hype | impact | léger | twitch |
| Lumière floue | Dreamy, Lo-fi | impact | léger | twitch |
| Tracking RGB | VHS, Glitch | impact | léger | twitch |
| Torsion | Glitch, Anime | impact | léger | twitch |
| Zoom + glissé | Hype, Funk | impact | léger | twitch |
| Chaos total | Glitch, Hype | impact | léger | twitch |
| Zoom vivant | Funk, Hype | maintien | léger | twitch |
| Ampoule qui grésille | Horror, Lo-fi | maintien | léger | twitch |
| Signal instable | VHS, Glitch | maintien | léger | twitch |
| Tics de rotation | Anime, Funk | maintien | léger | twitch |
| Interférences | Cyber, VHS | maintien | léger | twitch |
| Mise au point qui accroche | Dreamy, Cinéma | maintien | léger | twitch |
| Zoom saccadé | Funk, Anime | impact | léger | twitch + posterizeTime |
| RGB négatif | Glitch, Horror | impact | léger | twitch + invert |
| Glissé pixelisé | Glitch, Funk | impact | léger | twitch + pixelate |
| Lumière rouge | Horror, Phonk | impact | léger | twitch + flash |
| Flou + zoom radial | Flow, Hype | impact | léger | twitch + radialBlur |
| Pivot tournoyant | Funk, Anime | impact | moyen | twitch + radialBlur |
| Temps + lumière | Glitch, Funk | impact | léger | timeRemap:steps + twitch |
| Bégaiement RGB | Glitch, VHS | impact | léger | timeRemap:stutter + twitch |
| Néon instable | Cyber, Horror | maintien | léger | twitch |
| Coupes manga | Anime, Comic | impact | léger | twitch + ink:threshold |

## Vitesse (43)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Velocity ·v0.6 | Phonk, Flow, Quality | impact | léger | timeRemap:velocity |
| Slow Kill ·v0.6 | Aura, Cinéma | impact | léger | timeRemap:slowmo |
| Speed Up ·v0.6 | Hype, Phonk | impact | léger | timeRemap:speedup |
| Freeze ·v0.6 | Raw, Anime | impact | léger | timeRemap:freeze |
| Rewind ·v0.6 | VHS, Glitch | impact | léger | timeRemap:rewind |
| Choppy ·v0.6 | Funk, Glitch, Anime | maintien | léger | posterizeTime |
| Bégaiement | Funk, Hype | impact | léger | timeRemap:stutter |
| Boomerang | Funk, Y2K | impact | léger | timeRemap:boomerang |
| Paliers | Anime, Comic | impact | léger | timeRemap:steps + punch:scale |
| Montée au drop | Phonk, Flow | impact | léger | timeRemap:ramp |
| Marche arrière | VHS, Horror | impact | léger | timeRemap:reverse |
| Ralenti + push | Aura, Cinéma | impact | léger | timeRemap:slowmo + drift:push |
| Gel + flash | Anime, Hype | impact | léger | timeRemap:freeze + flash |
| Accélération floue | Hype, Flow | impact | moyen | timeRemap:speedup + dirBlur |
| Velocity + secousse | Phonk, Hype | impact | léger | timeRemap:velocity + shake:decay |
| Gel manga | Anime, Comic | impact | moyen | timeRemap:freeze + ink:threshold + speedLines:radial |
| Velocity flou | Flow, Quality | impact | moyen | timeRemap:velocity + blur:gauss |
| Velocity zoom | Phonk, Hype | impact | léger | timeRemap:velocity + punch:scale |
| Velocity RGB | Glitch, Phonk | impact | moyen | timeRemap:velocity + rgbSplit |
| Velocity flash | Hype, Raw | impact | léger | timeRemap:velocity + exposure |
| Ralenti N&B | Aura, Noir | impact | léger | timeRemap:slowmo + bw |
| Ralenti lumineux | Aura, Dreamy | impact | moyen | timeRemap:slowmo + glow |
| Ralenti focus | Cinéma, Aura | impact | léger | timeRemap:slowmo + vignette |
| Accélération RGB | Glitch, Hype | impact | moyen | timeRemap:speedup + rgbSplit |
| Accélération manga | Anime, Hype | impact | moyen | timeRemap:speedup + speedLines:horizontal |
| Gel + push | Cinéma, Aura | impact | léger | timeRemap:freeze + drift:push |
| Gel RGB | Glitch, Cyber | impact | moyen | timeRemap:freeze + rgbSplit |
| Gel secoué | Hype, Raw | impact | léger | timeRemap:freeze + shake:decay |
| Gel rouge | Horror, Phonk | impact | léger | timeRemap:freeze + hueSat |
| Gel BD | Comic | impact | moyen | timeRemap:freeze + halftone |
| Rembobinage VHS | VHS, Lo-fi | impact | moyen | timeRemap:rewind + scanlines + waveWarp |
| Rembobinage glitch | Glitch, Cyber | impact | moyen | timeRemap:rewind + blocks:shift |
| Bégaiement strobe | Funk, Hype | impact | léger | timeRemap:stutter + exposure |
| Bégaiement zoom | Funk, Kinetic | impact | léger | timeRemap:stutter + punch:scale |
| Boomerang RGB | Glitch, Y2K | impact | moyen | timeRemap:boomerang + rgbSplit |
| Boomerang zoom | Funk, Y2K | impact | léger | timeRemap:boomerang + punch:scale |
| Animé encré | Anime, Comic | impact | léger | timeRemap:steps + ink:edges |
| Montée qui gronde | Phonk, Cinéma | impact | léger | timeRemap:ramp + shake:wiggle |
| Montée floue | Flow, Hype | impact | moyen | timeRemap:ramp + radialBlur |
| Retour en N&B | Noir, Horror | impact | léger | timeRemap:reverse + bw |
| Ralenti filé | Flow, Quality | impact | moyen | timeRemap:slowmo + dirBlur |
| Animé 8 i/s | Anime, Lo-fi | maintien | léger | posterizeTime + grain:fine |
| Saccade punch | Anime, Funk | impact | léger | posterizeTime + punch:scale |

## Transitions (64)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Zoom in ·v0.6 | Flow, Hype | transition | léger | punch:scale + radialBlur |
| Zoom out ·v0.6 | Flow, Cinéma | transition | léger | punch:scale + radialBlur |
| Whip pan ·v0.6 | Flow, Raw | transition | léger | punch:posx + dirBlur |
| Spin ·v0.6 | Hype, Funk | transition | moyen | punch:rot + punch:scale + radialBlur |
| RGB Shake ·v0.6 | Glitch, Hype | transition | léger | shake:decay + rgbSplit |
| White Glitch ·v0.6 | Glitch, Hype | transition | léger | waveWarp + exposure |
| Pop-in ·v0.6 | Comic, Y2K | transition | léger | punch:scale |
| Stretch ·v0.6 | Flow, Y2K | transition | léger | stretch + dirBlur |
| Flash cut ·v0.6 | Raw, Hype | transition | léger | exposure |
| Volet net | Minimal, Esport | transition | léger | wipe:linear |
| Iris | Comic, Minimal | transition | léger | wipe:iris |
| Passage luma | Cinéma, Dreamy | transition | léger | wipe:luma |
| Blocs | Glitch, VHS | transition | léger | wipe:block |
| Flip 3D | 3D, Y2K | transition | léger | layer3d:flip |
| Cube | 3D, Esport | transition | léger | layer3d:cube |
| Pixel cut | Glitch, Funk | transition | léger | pixelate + exposure |
| Tourbillon | Dreamy, Horror | transition | moyen | warp:twirl + radialBlur |
| Polaire | Y2K, Glitch | transition | moyen | mirror:polar + rgbSplit |
| Flash encre | Anime, Noir | transition | léger | ink:threshold + exposure |
| Kaléidoscope | Dreamy, Y2K | transition | moyen | mirror:kaleida + radialBlur |
| Zoom RGB | Glitch, Hype | transition | léger | punch:scale + rgbSplit |
| Zoom vrillé | Hype, Funk | transition | moyen | punch:scale + punch:rot + radialBlur |
| Whip vertical | Flow, Phonk | transition | léger | punch:posy + dirBlur |
| Whip diagonal | Flow, Hype | transition | moyen | punch:posx + punch:posy + dirBlur |
| Passage au noir | Cinéma, Minimal | transition | léger | flash |
| Brûlure rouge | Phonk, Horror | transition | léger | flash |
| Fondu lumineux | Dreamy, Flow | transition | léger | flash + blur:gauss |
| Flou de passage | Flow, Dreamy | transition | léger | blur:gauss |
| Surexposition | Cinéma, Aura | transition | léger | exposure + glow |
| Brûlure de pellicule | Cinéma, Lo-fi | transition | léger | lightLeak + exposure |
| Blocs glitch | Glitch, Cyber | transition | moyen | blocks:shift + rgbSplit |
| Datamosh | Glitch | transition | moyen | blocks:mosh |
| Pixel sort | Glitch, Cyber | transition | léger | blocks:sort + exposure |
| Vague | Dreamy, Flow | transition | léger | waveWarp |
| Liquide | Horror, Dreamy | transition | moyen | warp:turbulent + blur:gauss |
| Ondes | Dreamy, Y2K | transition | léger | warp:ripple + exposure |
| Fisheye | Y2K, Hype | transition | léger | lens:fisheye + punch:scale |
| Bulle | Comic, Y2K | transition | moyen | lens:bulge + radialBlur |
| Bille de verre | Y2K, 3D | transition | moyen | lens:sphere + rgbSplit |
| Stretch vertical | Flow, Phonk | transition | léger | stretch + dirBlur |
| Écrasement | Comic, Funk | transition | léger | stretch + stretch |
| Miroir | Y2K, Glitch | transition | léger | mirror:mirror + exposure |
| Négatif | Glitch, Horror | transition | léger | invert + exposure |
| Passage gris | Noir, Cinéma | transition | léger | bw + exposure |
| Rétro 8-bit | Comic, Glitch | transition | léger | posterize + pixelate |
| Dash manga | Anime, Hype | transition | léger | speedLines:radial + punch:scale |
| Rayons | Aura, Cinéma | transition | léger | rays + exposure |
| Flare qui traverse | Cinéma, Y2K | transition | léger | flare + exposure |
| Arc-en-ciel | Funk, Y2K | transition | moyen | hueSat + radialBlur |
| Secousse éclair | Hype, Raw | transition | léger | shake:decay + exposure |
| Battement | Aura, Horror | transition | léger | shake:heartbeat + bw |
| Coupe balayée | VHS, Cyber | transition | léger | scanlines + rgbSplit |
| Tracking VHS | VHS, Lo-fi | transition | moyen | waveWarp + scanlines + rgbSplit |
| Trame BD | Comic | transition | léger | halftone + punch:scale |
| Volet diagonal | Minimal, Esport | transition | léger | wipe:linear |
| Volet radial | Minimal, Comic | transition | léger | wipe:radial |
| Horloge | Esport, Minimal | transition | léger | wipe:clock |
| Stores | VHS, Minimal | transition | léger | wipe:venetian |
| Grille | Esport, Y2K | transition | léger | wipe:grid |
| Volet doux | Dreamy, Flow | transition | léger | wipe:linear |
| Swing | 3D, Cinéma | transition | léger | layer3d:swing |
| Pliage | 3D, Comic | transition | léger | layer3d:fold |
| Slide 3D | 3D, Esport | transition | léger | layer3d:slide3d |
| Flip vertical | 3D, Y2K | transition | léger | layer3d:flip |

## FX (58)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| RGB léger ·v0.6 | Glitch, VHS | maintien | léger | rgbSplit |
| Glow ·v0.6 | Quality, Dreamy, Cyber | maintien | léger | glow |
| VHS ·v0.6 | VHS | maintien | moyen | grain:digital + scanlines + waveWarp |
| Lens ·v0.6 | Y2K, Quality | maintien | léger | lens:fisheye |
| Écran CRT | VHS, Cyber | maintien | moyen | scanlines + lens:bulge + rgbSplit + glow + vignette |
| Traînée écho | Dreamy, Flow | maintien | lourd | echo + blur:box |
| Flou de bougé | Flow, Dreamy | maintien | moyen | dirBlur + glow |
| Aura | Aura, Cinéma | maintien | moyen | glow + rays |
| Lignes de vitesse | Anime, Hype | maintien | léger | speedLines:radial |
| Datamosh | Glitch | impact | moyen | blocks:mosh |
| Pixel sort | Glitch, Cyber | impact | léger | blocks:sort |
| Flare qui passe | Cinéma, Y2K | maintien | léger | flare |
| Halation | Cinéma, Quality | maintien | léger | glow |
| Rayons divins | Cinéma, Aura | maintien | léger | rays |
| Chaleur | Horror, Cinéma | maintien | léger | warp:turbulent |
| Étincelles Y2K | Y2K, Dreamy | maintien | lourd | particles:stars |
| Bloom large | Dreamy, Quality | maintien | léger | glow |
| Contours néon | Cyber, Y2K | maintien | léger | ink:edges + glow |
| RGB vertical | Glitch, VHS | maintien | léger | rgbSplit |
| RGB pulsé | Glitch, Funk | maintien | léger | rgbSplit |
| Glow pulsé | Cyber, Funk | maintien | léger | glow |
| Strobe continu | Funk, Hype | maintien | léger | exposure |
| Négatif | Glitch, Horror | maintien | léger | invert |
| Lignes horizontales | Anime, Flow | maintien | léger | speedLines:horizontal |
| Lignes noires | Anime, Comic | maintien | léger | speedLines:radial |
| Lumière du bas | Aura, Cinéma | maintien | léger | rays |
| Flare fixe | Cinéma, Y2K | maintien | léger | flare |
| Bombé | Y2K, Comic | maintien | léger | lens:bulge |
| Globe | Y2K, 3D | maintien | léger | lens:sphere |
| Spirale | Dreamy, Horror | maintien | léger | warp:twirl |
| Surface de l'eau | Dreamy, Lo-fi | maintien | léger | warp:ripple |
| Sous l'eau | Dreamy, Lo-fi | maintien | léger | waveWarp |
| Kaléidoscope | Y2K, Dreamy | maintien | léger | mirror:kaleida |
| Petite planète | Y2K, Glitch | maintien | léger | mirror:polar |
| Symétrie | Y2K, Minimal | maintien | léger | mirror:mirror |
| 8-bit | Glitch, Comic | maintien | léger | pixelate |
| Aplats | Comic, Funk | maintien | léger | posterize |
| Trame | Comic | maintien | léger | halftone |
| Contours | Comic, Anime | maintien | léger | ink:edges |
| Encre | Noir, Anime | maintien | léger | ink:threshold |
| Blocs aléatoires | Glitch | maintien | léger | blocks:shift |
| Mosh continu | Glitch, VHS | maintien | moyen | blocks:mosh |
| Coulures | Glitch, Cyber | maintien | léger | blocks:sort |
| Écran phosphore | VHS, Cyber | maintien | moyen | duotone + scanlines + lens:bulge + glow |
| Objectif chromatique | Y2K, Quality | maintien | moyen | lens:fisheye + rgbSplit |
| Rêve chromatique | Dreamy, Y2K | maintien | moyen | glow + rgbSplit |
| Aura rouge | Aura, Horror | maintien | moyen | glow + rays |
| Aura dorée | Aura, Esport | maintien | moyen | glow + rays |
| Braises | Horror, Cinéma | maintien | lourd | particles:embers |
| Neige | Dreamy, Lo-fi | maintien | lourd | particles:snow |
| Gerbe d'étincelles | Hype, Cinéma | impact | lourd | particles:sparks |
| Particules de poussière | Lo-fi, Cinéma | maintien | lourd | particles:dust |
| Étoiles au marker | Y2K, Anime | impact | lourd | particles:stars |
| Strobe glitch | Glitch, Funk | maintien | léger | exposure + rgbSplit |
| Clarté | Quality, Raw | maintien | léger | sharpen + glow |
| Éclair d'orage | Horror, Cinéma | impact | léger | flash |
| Projecteur | Lo-fi, Cinéma | maintien | léger | exposure + grain:film |
| Extinction TV | VHS, Glitch | sortie | léger | stretch + flash |

## Overlays & HUD (44)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Grain ·v0.6 | Lo-fi, Cinéma, VHS | maintien | léger | grain:fine |
| Light leak ·v0.6 | Lo-fi, Dreamy, Cinéma | maintien | léger | lightLeak |
| Letterbox ·v0.6 | Cinéma | entrée | léger | hud:letterbox |
| Kill Feed ·v0.6 | Esport, Hype | entrée | léger | hud:killfeed |
| Hitmarker | Esport, Hype | impact | léger | hud:hitmarker |
| Viseur qui s'ouvre | Esport, Raw | impact | léger | hud:crosshair |
| Caméscope REC | VHS, Lo-fi | maintien | léger | hud:rec |
| Scoreboard | Esport | entrée | léger | hud:scoreboard |
| Lower third | Esport, Minimal | entrée | léger | hud:lowerthird |
| Barre joueur | Esport, Hype | maintien | léger | hud:playerbar |
| Cadre arrondi | Minimal, Dreamy | maintien | léger | hud:frame |
| Pellicule | Cinéma, Lo-fi | maintien | léger | hud:perforation |
| Case de BD | Comic | maintien | léger | hud:cases |
| Grille | Minimal, Cyber | maintien | léger | hud:grid |
| Crochets de visée | Cyber, Esport | impact | léger | hud:brackets |
| Poussière | Lo-fi, VHS | maintien | léger | grain:dust |
| Fuite néon | Cyber, Dreamy | maintien | léger | lightLeak |
| Hitmarker rouge | Esport, Hype | impact | léger | hud:hitmarker |
| Viseur fixe | Raw, Minimal | maintien | léger | hud:crosshair |
| Viseur rouge | Esport, Hype | impact | léger | hud:crosshair |
| Kill feed fixe | Esport, Raw | maintien | léger | hud:killfeed |
| Kill feed doré | Esport, Quality | entrée | léger | hud:killfeed |
| Letterbox fixe | Cinéma, Noir | maintien | léger | hud:letterbox |
| Caméscope encadré | VHS, Lo-fi | maintien | léger | hud:rec + hud:frame |
| Cadre qui apparaît | Minimal, Dreamy | entrée | léger | hud:frame |
| Cadre doré | Esport, Quality | maintien | léger | hud:frame |
| Grille cyan | Cyber, Y2K | maintien | léger | hud:grid |
| Grille éclair | Cyber, Minimal | impact | léger | hud:grid |
| Crochets fixes | Cyber, Esport | maintien | léger | hud:brackets |
| Verrouillage | Esport, Horror | impact | léger | hud:brackets |
| Score fixe | Esport | maintien | léger | hud:scoreboard |
| Lower third fixe | Esport, Minimal | maintien | léger | hud:lowerthird |
| Barre joueur animée | Esport, Hype | entrée | léger | hud:playerbar |
| Habillage tournoi | Esport | entrée | léger | hud:scoreboard + hud:lowerthird |
| Bande cinéma | Cinéma, Lo-fi | maintien | léger | hud:letterbox + hud:perforation |
| Grain épais | Lo-fi, Cinéma | maintien | léger | grain:film |
| Bruit numérique | VHS, Glitch | maintien | léger | grain:digital |
| Fuite qui respire | Lo-fi, Dreamy | maintien | léger | lightLeak |
| Fuite rouge | Horror, Cinéma | maintien | léger | lightLeak |
| Lignes épaisses | VHS, Cyber | maintien | léger | scanlines |
| Vignette rouge | Horror, Phonk | maintien | léger | vignette |
| Halo blanc | Dreamy, Lo-fi | maintien | léger | vignette |
| Dégâts | Esport, Horror | impact | léger | vignette |
| Vie basse | Esport, Horror | maintien | léger | vignette |

## Caméra 3D (24)

| Nom | Styles | Rôle | Perf | Recette |
|---|---|---|---|---|
| Push-in | Cinéma, 3D | impact | léger | camera |
| Pull-out | Cinéma, Flow | maintien | léger | camera |
| Orbite | 3D, Y2K | maintien | léger | camera |
| Dolly zoom | Horror, Cinéma | impact | léger | camera |
| Tilt | Cinéma, Aura | maintien | léger | camera |
| Roll caméra | Phonk, Hype | impact | léger | camera |
| Grue | Cinéma, 3D | maintien | léger | camera |
| Secousse caméra 3D | Hype, 3D | impact | léger | camera |
| Parallaxe 2,5D | 3D, Flow | maintien | moyen | camera + parallax:layers |
| Faux relief | 3D, Y2K | maintien | léger | parallax:depth |
| Cylindre | Y2K, 3D | maintien | léger | parallax:cylinder |
| Push lent | Cinéma, Aura | maintien | léger | camera |
| Recul sur le kill | Hype, Cinéma | impact | léger | camera |
| Quart d'orbite | 3D, Hype | impact | léger | camera |
| Tilt sur le kill | Cinéma, Kinetic | impact | léger | camera |
| Panoramique lent | Cinéma, Flow | maintien | léger | camera |
| Pan éclair | Flow, Hype | impact | léger | camera |
| Rotation lente | Dreamy, Phonk | maintien | léger | camera |
| Grue éclair | Cinéma, Esport | impact | léger | camera |
| Vertigo lent | Horror, Cinéma | maintien | léger | camera |
| Caméra 3D portée | Raw, 3D | maintien | léger | camera |
| Orbite en couches | 3D, Y2K | maintien | moyen | camera + parallax:layers |
| Vertigo en couches | Horror, 3D | impact | moyen | camera + parallax:layers |
| Globe qui tourne | Y2K, 3D | maintien | léger | parallax:sphere |
