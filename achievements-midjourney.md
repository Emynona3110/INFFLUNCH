# Icônes des succès — série Midjourney

Les 26 prompts prêts à coller dans Discord. Les **sujets** viennent de
`achievements-icon-prompts.txt`, qui reste la source : modifier là-bas, puis
régénérer ce fichier.

On repart d'une série entière générée d'un coup : les icônes actuelles, faites
par vagues avec deux outils, comptent une quarantaine de bleus et d'oranges au
lieu de 2, et des viewBox de 384 à 2048.

## Référence de style

Huit icônes du style visé, hébergées dans le repo (`public/achievements/ref/`) :
une fois le site déployé, leur URL est publique et stable, contrairement à un
lien Discord qui expire.

- https://infflunch.com/achievements/ref/ref-calendrier-flamme.png
- https://infflunch.com/achievements/ref/ref-mouton-sorcier.png
- https://infflunch.com/achievements/ref/ref-plume-toque.png
- https://infflunch.com/achievements/ref/ref-fer-a-cheval.png
- https://infflunch.com/achievements/ref/ref-chronometre.png
- https://infflunch.com/achievements/ref/ref-de.png
- https://infflunch.com/achievements/ref/ref-mouton-ble.png
- https://infflunch.com/achievements/ref/ref-miroir.png

Style visé : celui de `berger_dun_jour` — très simple, trois couleurs, dominante
blanc cassé, contours bleus, orange en touche ponctuelle (19 formes blanches,
4 bleues, **1 seule** orange).

> Vérifier qu'une de ces URL s'ouvre en navigation privée. Si elle demande une
> connexion, Midjourney ne pourra pas la lire.

## Réglages

| Drapeau | Pourquoi |
|---|---|
| `--style raw` | sans lui, MJ ajoute sa patte par-dessus le prompt, et elle varie |
| `--v 7` | version figée : deux versions ne donnent pas le même trait |
| `--sw 100` | poids du style. Tester 100 puis 200, garder la **même valeur** pour les 26 |
| `--no …` | bloque surtout `black outlines`, `frame`, `scenery` — MJ adore encadrer une icône |

Tout générer dans **une seule session** : c'est ce qui pèse le plus sur la cohérence.

## Étape 0 — valider le style

Les icônes s'affichent à **40 px** (mobile) et **56 px** (desktop). Un style
illisible à cette taille est disqualifié, si beau soit-il en grand.

Générer les trois tests ci-dessous — un objet simple, un objet composé, un être
vivant — puis les réduire à 56 px avant de trancher. Un style peut très bien
tenir sur un cookie et s'effondrer sur un mouton.

Éliminer tout ce qui produit dégradés, ombres portées ou détails fins : ça ne
survit pas à la vectorisation en trois aplats.

**Test — cookie** (objet simple)

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a round chocolate-chip cookie being eaten from the top down, its whole upper half replaced by a scalloped bite edge, a few crumbs tumbling below. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

**Test — addition** (objet composé)

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a small restaurant bill tray (shallow rounded dish seen at a slight angle) holding a folded stack of several receipts, with a coin balanced on top. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

**Test — berger_dun_jour** (être vivant)

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a friendly cartoon sheep being fed a handful of grass by a hand reaching in from the side. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

## Les 26 prompts

### anti_panurgisme — « Anti-panurgisme »

*trouver un mouton*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a single sheep stepping out of a line of identical sheep, breaking away from the herd, standing out. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### berger_dun_jour — « Berger d'un jour »

*nourrir un mouton*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a hand offering a golden wheat sheaf / hay to a small cute sheep. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### gourou_du_troupeau — « Gourou du troupeau »

*nourrir 50x d'affilée*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a wise sheep guru wearing a tiny halo and a pointed sage hat, serene expression. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### critique_en_herbe — « Critique en herbe »

*1er avis*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a pencil with a small sprouting green-blue leaf, next to a single review star. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### palais_aguerri — « Palais aguerri »

*10 avis*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: crossed fork and knife with three small stars above, refined tasting emblem. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### plume_gastronomique — « Plume gastronomique »

*50 avis*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: an elegant writing quill pen dipped over a chef's toque, with one shining star. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### photographe — « Photographe »

*1re photo*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a plate of food surrounded by a ring light, with a couple of small like bubbles. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### inffluenceur — « Inffluenceur »

*10 photos*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a fan / spread of several overlapping Polaroid photos of food dishes, one small sparkle. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### pizzarazzi — « Pizzarazzi »

*50 photos*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a pizza slice merged with a camera lens, playful flash sparkles around it. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### petit_geste — « Petit geste »

*1re réaction*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a single thumbs-up hand inside a soft speech bubble. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### public_conquis — « Public conquis »

*réagir à 20 photos*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: two hands clapping with small motion sparkles, applause. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### approuve — « Approuvé »

*recevoir 10 réactions*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a heart with a small orange approval checkmark badge. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### quinte_gagnant — « Le quinté gagnant »

*5 favoris*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a lucky horseshoe surrounded by five small hearts, winning bet motif. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### fidele_au_poste — « Fidèle au poste »

*5 jours d'affilée*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a calendar showing a streak of five checked days, with a small orange flame. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### completionniste — « Complétionniste »

*tous les autres succès*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a shining trophy cup with a star, completion award. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### gambling — « Gambling »

*tirer le repas au hasard*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a top-down casino roulette wheel, ring segments alternating deep royal blue and white, thick blue outline, with the central casino spinning cross / turret hub in warm orange. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### indecis — « Indécis »

*lancer la roue 3 fois, succès secret*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a balance scale with two hanging pans, level and perfectly balanced, with a small floating orange question mark above the central pivot, unable to choose between options. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### de_pipe — « Dé pipé »

*lancer avec un seul resto, succès secret*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a single loaded / weighted dice tilted on one corner, all visible faces showing the same one pip, with a tiny sly wink sparkle, cheating motif. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### jour_nuit — « Jour ! Nuit ! Jour ! Nuit ! »

*basculer le thème 8 fois*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a vintage wall light switch (toggle lever) flipped repeatedly, with motion lines, half of the icon lit by a small sun and the other half by a crescent moon, split down the middle, day on one side, night on the other. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### narcisse — « Narcisse »

*réagir à sa propre photo*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a hand mirror showing a smiling reflection, with a small heart floating above it, admiring oneself and liking it. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### shooting_stars — « Shooting Stars »

*faire filer les étoiles d'un restaurant*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a five-pointed star streaking diagonally across the frame like a shooting star, with a long tapered glowing tail behind it and three or four tiny sparkling stars scattered along the tail, a comet made of a rating star. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### flambe — « Flambé »

*déclarer son midi 10 jours ouvrés d'affilée*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a flambéed dish, a small skillet or shallow pan seen from the side with a tall lively flame bursting upward from it, a couple of tiny sparks rising above the flame, the pan and handle in blue, the flame in orange, a dish set alight at the table. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### sprinter — « Sprinter »

*choisir son restaurant du midi avant 10 h*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a stopwatch with its button pressed, the hand frozen very early on the dial, with two or three horizontal speed lines trailing off to the left, and a small rising sun peeking behind the top of the watch, a record set at dawn. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### retardataire — « Retardataire »

*choisir son restaurant du midi après 14 h*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a snail carrying a domed restaurant cloche on its back instead of a shell, crawling slowly to the right with a short orange trail behind it, arriving long after everyone has eaten. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```
### cookie — « Cookie »

*manger le seul cookie du site*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a round chocolate-chip cookie being eaten from the top down, its whole upper half is gone, replaced by a scalloped bite edge (rows of small rounded tooth marks), only the lower half remains, with a few crumbs tumbling down below it, the one and only cookie a cookie-free website ever had. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### addition — « L'addition ! »

*déclarer le prix d'un 1er restaurant*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a small restaurant bill tray (shallow rounded dish seen at a slight angle) holding a folded stack of several receipts, with a coin balanced on top, the moment the bill arrives at the table. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

### gardez_la_monnaie — « Gardez la monnaie »

*déclarer le prix de 5 restaurants*

```
/imagine prompt: Very simple minimalist flat vector icon, single centered subject, few large clean geometric rounded shapes, thick uniform royal blue outlines (#113894), flat shading only, mostly off-white fills with one small warm orange accent, strict three-colour palette (deep royal blue #113894, warm orange #EA580C, off-white #FAF8F4), no text, plain solid background, square 1:1. Subject: a hand holding out a small fan of folded banknotes, pushed forward towards the viewer, with two coins left behind on a flat surface below, paying without waiting for the change. --ar 1:1 --style raw --v 7 --sref https://infflunch.com/achievements/ref/ref-calendrier-flamme.png https://infflunch.com/achievements/ref/ref-mouton-sorcier.png https://infflunch.com/achievements/ref/ref-plume-toque.png https://infflunch.com/achievements/ref/ref-fer-a-cheval.png https://infflunch.com/achievements/ref/ref-chronometre.png https://infflunch.com/achievements/ref/ref-de.png https://infflunch.com/achievements/ref/ref-mouton-ble.png https://infflunch.com/achievements/ref/ref-miroir.png --sw 100 --no black outlines, black strokes, gradient, texture, grain, photorealism, 3d render, isometric, perspective, drop shadow, glow, highlights, scenery, background objects, frame, border, multiple subjects, lettering, watermark, fine detail, hatching
```

## Après génération

1. Upscale, télécharger en 1024 px minimum.
2. Détourer le fond sous Photopea.
3. Vectoriser en 3 aplats, **forcer les hex exacts**.
4. **Recadrer sur un canevas carré identique, même marge** — c'est l'étape qui a
   fait dériver la série précédente.
5. Nommer par l'**id** (colonne de gauche ci-dessous) et mettre `image:` à jour
   dans `src/data/achievements.ts`.

## Annexe — id / titre / fichier

**Règle (2026-10-02)** : un succès porte UN seul nom. L'id est le titre en
kebab/snake sans accent, et le fichier d'icône est `{id}.svg`. Les anciens ids
hérités d'un autre intitulé (`premier_avis` pour « Critique en herbe »,
`troupeau_complet` pour « Complétionniste »…) ont été alignés, en base comme
dans le code. Renommer un succès = renommer son id, son fichier, et ajouter un
`update public.user_achievements` au script SQL du jour.

| ID | Titre | Fichier |
|---|---|---|
| `anti_panurgisme` | Anti-panurgisme | `anti_panurgisme.svg` |
| `berger_dun_jour` | Berger d'un jour | `berger_dun_jour.svg` |
| `gourou_du_troupeau` | Gourou du troupeau | `gourou_du_troupeau.svg` |
| `critique_en_herbe` | Critique en herbe | `critique_en_herbe.svg` |
| `palais_aguerri` | Palais aguerri | `palais_aguerri.svg` |
| `plume_gastronomique` | Plume gastronomique | `plume_gastronomique.svg` |
| `photographe` | Photographe | `photographe.svg` |
| `inffluenceur` | Inffluenceur | `inffluenceur.svg` |
| `pizzarazzi` | Pizzarazzi | `pizzarazzi.svg` |
| `addition` | L'addition ! | `addition.svg` |
| `gardez_la_monnaie` | Gardez la monnaie | `gardez_la_monnaie.svg` |
| `petit_geste` | Petit geste | `petit_geste.svg` |
| `public_conquis` | Public conquis | `public_conquis.svg` |
| `approuve` | Approuvé | `approuve.svg` |
| `gouts_et_couleurs` | Goûts et couleurs | `gouts_et_couleurs.svg` (fournie : meme du chat devant l'assiette) |
| `quinte_gagnant` | Quinté gagnant | `quinte_gagnant.svg` |
| `gambling` | Gambling | `gambling.svg` |
| `indecis` | Indécis | `indecis.svg` |
| `de_pipe` | Dé pipé | `de_pipe.svg` |
| `jour_nuit` | Jour ! Nuit ! Jour ! Nuit ! | `jour_nuit.svg` |
| `narcisse` | Narcisse | `narcisse.svg` |
| `shooting_stars` | Shooting Stars | `shooting_stars.svg` |
| `cookie` | Cookie | `cookie.svg` |
| `fidele_au_poste` | Fidèle au poste | `fidele_au_poste.svg` |
| `flambe` | Flambé | `flambe.svg` |
| `sprinter` | Sprinter | `sprinter.svg` |
| `retardataire` | Retardataire | `retardataire.svg` |
| `completionniste` | Complétionniste | `completionniste.svg` |

26 succès.
