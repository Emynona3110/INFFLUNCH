# Prompt Gemini — trouver les restaurants manquants dans un rayon d'environ 1 km

> À coller dans Gemini **avec les CSV** produits par `sql/2026-09-01_export_pour_gemini.sql`
> (`restaurants.csv` au minimum, plus `tags.csv` et `badges.csv`).
> Le SQL renvoyé se relit avant d'être joué dans l'éditeur Supabase, puis on termine par
> `sql/2026-09-01_apres_import.sql` et le backfill du temps de marche.

---

Tu as accès à Google Search et Google Maps. Utilise-les réellement : chaque établissement proposé
doit exister aujourd'hui et être vérifiable. N'invente aucune adresse ni coordonnée.

## Point de référence

Bureau INFFLUX : **latitude 48.8487433, longitude 2.4280408**.
Rayon de recherche : **1 000 m à vol d'oiseau** (environ 12 minutes à pied). Ratisse large : rues
adjacentes, galeries et centres commerciaux, food-courts, abords des stations et des gares.

## Objectif

Lister le plus exhaustivement possible les endroits où déjeuner **le midi en semaine** :
restaurants, fast-foods, sandwicheries, boulangeries avec formule, traiteurs, kebabs, sushis,
pizzerias, food-courts, cantines ouvertes au public.

Pour chacun, enquête avant de proposer des tags : fiche Google Maps, **carte et menu** (site
officiel, Deliveroo, Uber Eats, TheFork, Instagram), **avis récents** (ce que les clients ont mangé,
la formule du midi, sur place ou à emporter).

Exclure : bars sans nourriture, épiceries sans offre préparée, établissements définitivement
fermés, et **tout ce qui figure déjà dans `restaurants.csv`** (compare sur le nom ET l'adresse).

## Tags et badges

Réutilise en priorité les tags de `tags.csv`. Tu peux en proposer de nouveaux : libellés **en
français**, **une majuscule à chaque mot** (« Fast Food », « À Emporter »), au singulier ; ils
devront être créés par un `insert into public.tags` en tête de ton SQL.

⚠️ Les **badges sont figés** — seuls ces six ont une icône dans l'application, tout autre serait
ignoré à l'écran : Option Végétarienne · Sur Place · À Emporter · Bar · TooGoodToGo · Magasin.

## Ce que j'attends, dans cet ordre

**1. Un tableau récapitulatif**, trié par distance croissante au bureau : nom · adresse complète ·
lat · lng · type · ce qu'on y mange (d'après la carte et les avis) · horaires du midi · lien Google
Maps · confiance (haute / moyenne / faible). Signale à part ceux dont tu n'es pas certain qu'ils
soient encore ouverts.

**2. Le SQL d'insertion** :

```sql
insert into public.restaurants (name, slug, address, website, phone, lat, lng, tags, badges)
values ('Nom Du Resto', 'nom-du-resto', '12 Rue Exemple, 93170 Bagnolet', null, null,
        48.848000, 2.428000, array['Italien','À Emporter']::text[], array['Sur Place']::text[])
on conflict (slug) do nothing;
```

Le **slug** doit être calculé exactement comme l'application le fait, sinon j'aurai des doublons.
Règles, dans cet ordre : passer en minuscules → retirer l'article défini de tête (« la », « le »,
« les », « the ») → retirer l'élision de tête (« l' », « d' », « qu' »…) → retirer les accents →
remplacer les apostrophes restantes par un tiret → espaces en tirets → supprimer tout caractère
qui n'est ni lettre, ni chiffre, ni tiret → pas de tirets multiples, ni en début ou fin.

Exemples tirés de la base : « L'Atelier Du Naan » → `atelier-du-naan` · « O'Five Pizza » →
`o-five-pizza` · « Le Nid À Frango » → `nid-a-frango` · « Chez Les Sœurs » → `chez-les-soeurs`.

`name` est unique lui aussi : n'insère pas deux fois le même nom et n'écrase jamais une ligne
existante — `on conflict (slug) do nothing`, jamais `do update`.

Laisse de côté `distance`, `distanceLabel`, `walk_minutes` et `image` : je les remplis après
l'import avec mes propres outils.

## Règles ABSOLUES pour le SQL (relis-les avant de répondre)

La base est en production et contient des contributions d'utilisateurs (avis, photos, menus,
favoris, déjeuners, succès). Ton SQL doit être strictement additif.

**Interdit, sans aucune exception :**

- `delete`, `truncate`, `drop`, `alter`, `create`, `grant`, `revoke` ;
- toute écriture dans `reviews`, `restaurant_photos`, `restaurant_menus`, `favorites`,
  `lunch_plans`, `user_achievements`, `users`, `profiles`, `waiting_list` ;
- toute modification d'un restaurant **existant** (aucun `update` sur `public.restaurants` dans
  cette mission) ;
- supprimer une ligne de `tags` ou de `badges`.

**Forme attendue** : un seul bloc SQL encadré par `begin;` et `commit;`, chaque instruction
commentée en une ligne. Les apostrophes se doublent : `'L''Atelier'`.
