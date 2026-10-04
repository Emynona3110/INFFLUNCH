# Icônes des succès

Les 28 icônes ont été refaites d'un coup dans **Recraft** le 2026-10-02 : une
seule série, une seule palette, et des références PNG regénérées en même temps.
Les prompts Midjourney qui occupaient ce fichier (et les huit `ref-*.png` qu'ils
citaient en `--sref`) ont été retirés : ils décrivaient la série précédente, et
leurs URL de référence n'existent plus.

## Ce qui vit où

- `public/achievements/{id}.svg` — l'icône servie par le site, recadrée sur son
  contenu (`width`/`height`/`viewBox` collés au dessin, pas de marge vide).
- `public/achievements/ref/{id}.png` — le PNG de la même icône, gardé comme
  référence de style pour une prochaine génération. 28 fichiers, mêmes slugs.
- `src/data/achievements.ts` — le catalogue : id, titre, condition (sauf
  secrets), emoji de repli, chemin de l'image.

Pour recadrer un nouvel export : `python tools/trim_svg.py public/achievements/*.svg`
affiche le rapport, `--apply` écrit.

Style de la série : trois couleurs, dominante blanc cassé, contours bleus
(#113894), orange (#EA580C) en touche ponctuelle.

## Référence de style — les 28 `--sref`

Les refs sont servies par le site, donc leurs URL sont publiques et stables
(contrairement à un lien Discord, qui expire). Elles portent le **slug du
succès** : `https://infflunch.com/achievements/ref/{id}.png`.

À coller tel quel derrière un prompt :

```
--sref https://infflunch.com/achievements/ref/anti_panurgisme.png https://infflunch.com/achievements/ref/berger_dun_jour.png https://infflunch.com/achievements/ref/gourou_du_troupeau.png https://infflunch.com/achievements/ref/critique_en_herbe.png https://infflunch.com/achievements/ref/palais_aguerri.png https://infflunch.com/achievements/ref/plume_gastronomique.png https://infflunch.com/achievements/ref/photographe.png https://infflunch.com/achievements/ref/inffluenceur.png https://infflunch.com/achievements/ref/pizzarazzi.png https://infflunch.com/achievements/ref/addition.png https://infflunch.com/achievements/ref/gardez_la_monnaie.png https://infflunch.com/achievements/ref/petit_geste.png https://infflunch.com/achievements/ref/public_conquis.png https://infflunch.com/achievements/ref/approuve.png https://infflunch.com/achievements/ref/gouts_et_couleurs.png https://infflunch.com/achievements/ref/quinte_gagnant.png https://infflunch.com/achievements/ref/gambling.png https://infflunch.com/achievements/ref/indecis.png https://infflunch.com/achievements/ref/de_pipe.png https://infflunch.com/achievements/ref/jour_nuit.png https://infflunch.com/achievements/ref/narcisse.png https://infflunch.com/achievements/ref/shooting_stars.png https://infflunch.com/achievements/ref/cookie.png https://infflunch.com/achievements/ref/fidele_au_poste.png https://infflunch.com/achievements/ref/flambe.png https://infflunch.com/achievements/ref/sprinter.png https://infflunch.com/achievements/ref/retardataire.png https://infflunch.com/achievements/ref/completionniste.png --sw 100
```

Une seule ref suffit souvent à tenir le style ; la liste complète sert quand on
veut la moyenne de toute la série plutôt qu'une icône en particulier.

## Annexe — id / titre / fichier

**Règle (2026-10-02)** : un succès porte UN seul nom. L'id est le titre en
kebab/snake sans accent, et le fichier d'icône est `{id}.svg`. Les anciens ids
hérités d'un autre intitulé (`premier_avis` pour « Critique en herbe »,
`troupeau_complet` pour « Complétionniste »…) ont été alignés, en base comme
dans le code. Renommer un succès = renommer son id, son fichier, et ajouter un
`update public.user_achievements` au script SQL du jour.

| ID | Titre | Fichier |
|---|---|---|
| `petit_prince` | Dessine-moi un mouton | `petit_prince.svg` |
| `minecraft` | Revenons à nos moutons | `minecraft.svg` |
| `gourou_du_troupeau` | Gourou du troupeau | `gourou_du_troupeau.svg` |
| `ratatouille` | La main à la pâte | `ratatouille.svg` |
| `death_note` | Rayer de la carte | `death_note.svg` |
| `naruto` | Ramen ta science | `naruto.svg` |
| `duck_face` | Selfood | `duck_face.svg` |
| `salt_bae` | Grain de sel | `salt_bae.svg` |
| `pizzarazzi` | Pizzarazzi | `pizzarazzi.svg` |
| `take_my_money` | Gardez la monnaie | `take_my_money.svg` |
| `stonks` | Beurre dans les épinards | `stonks.svg` |
| `brent_rambo` | Coup de pouce | `brent_rambo.svg` |
| `absolute_cinema` | Du grand art | `absolute_cinema.svg` |
| `approuve` | Approuvé | `approuve.svg` |
| `gouts_et_couleurs` | Goûts et couleurs | `gouts_et_couleurs.svg` (fournie : meme du chat devant l'assiette) |
| `pokeball` | Dégustez-les tous | `pokeball.svg` |
| `new_vegas` | Faites vos jeux | `new_vegas.svg` |
| `matrix` | Choix cornélien | `matrix.svg` |
| `magritte` | Dé pipé | `magritte.svg` |
| `jacquouille` | Jour ! Nuit ! Jour ! Nuit ! | `jacquouille.svg` |
| `johnny_bravo` | Jamais mieux servi que par soi-même | `johnny_bravo.svg` |
| `shooting_stars` | Étoiles filantes | `shooting_stars.svg` |
| `cookie_clicker` | Cookie Clicker | `cookie_clicker.svg` |
| `michael_scott` | Fidèle au poste | `michael_scott.svg` |
| `johnny_hallyday` | Tout feu tout flamme | `johnny_hallyday.svg` |
| `flash` | Premier arrivé, premier servi | `flash.svg` |
| `mister_bean` | Mieux vaut tard que jamais | `mister_bean.svg` |
| `gatsby` | La cerise sur le gâteau | `gatsby.svg` |

26 succès.
