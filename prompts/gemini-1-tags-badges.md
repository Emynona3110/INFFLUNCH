# Prompt Gemini — enquêter sur les restaurants, puis parfaire tags et badges

> À coller dans Gemini **avec les CSV** produits par `sql/2026-09-01_export_pour_gemini.sql`
> (`tags.csv`, `badges.csv`, `restaurants.csv`), ou avec le bloc de la requête 4 collé à la suite.
> Le SQL renvoyé se relit avant d'être joué dans l'éditeur Supabase, puis on termine par
> `sql/2026-09-01_apres_import.sql`.

---

Tu as accès à Google Search et Google Maps. **Enquête réellement** sur chaque établissement du
fichier `restaurants.csv` avant de le taguer : fiche Google Maps (catégorie, photos,
questions/réponses), **la carte et le menu** (site officiel, Deliveroo, Uber Eats, TheFork,
Instagram, photos de la devanture), et **les avis récents** — ce que les clients disent avoir
mangé, la formule du midi, s'il y a une salle ou seulement de la vente à emporter.

Si une information n'est pas vérifiable, ne l'invente pas : laisse le tag de côté et signale-le.

## Contexte

INFFLUNCH est une application interne pour environ 100 collaborateurs d'INFFLUX, dont le bureau
est à **48.8487433, 2.4280408**. Elle sert à choisir où déjeuner à pied autour du bureau.
Les **tags** sont l'outil de filtrage principal : ils répondent à « j'ai envie de quoi ce midi ? ».
Les **badges** sont des pictogrammes affichés sur la fiche : ils décrivent le mode de consommation.

## Données jointes

- `tags.csv` — les tags existants (colonne `label`).
- `badges.csv` — les badges existants (colonne `label`).
- `restaurants.csv` — un restaurant par ligne : `name`, `slug`, `address`, `website`, `lat`,
  `lng`, `walk_minutes`, `tags`, `badges`, `closed`. Les listes y sont écrites `Italien | À Emporter`.
  Le **slug** est l'identifiant à utiliser dans le SQL de retour : **recopie-le tel quel depuis la
  colonne `slug`, ne le recalcule jamais à partir du nom**. Un slug inexact produit un `update` qui
  ne touche aucune ligne, sans erreur ni avertissement (pièges déjà rencontrés : « Durum & Brunch »
  → `durum-brunch` et non `durum--brunch` ; « Bill's Burger » → `bill-s-burger` et non `bills-burger`).
  Les lignes `closed = true` sont des établissements définitivement fermés : ne les retague pas.

  Traite **tous** les restaurants non fermés du fichier, sans exception : à la fin, vérifie que ton
  SQL contient autant d'`update` que de lignes avec `closed = false`, et liste ceux que tu aurais
  volontairement laissés de côté.

## ⚠️ Les badges sont figés

Seuls ces six badges ont une icône dans l'application et sont donc affichables. Tout autre badge
serait silencieusement ignoré à l'écran — n'en invente aucun :

- Option Végétarienne
- Sur Place
- À Emporter
- Bar
- TooGoodToGo
- Magasin

Les **tags**, eux, peuvent être créés autant que nécessaire.

## Ce que j'attends, dans cet ordre

**1. Une fiche d'enquête par restaurant** (2 à 4 lignes) : type de cuisine, plats emblématiques
relevés sur la carte ou dans les avis, formule du midi si elle existe, sur place / à emporter, et
**tes sources** (liens). C'est ce qui justifie les tags — je dois pouvoir te contredire.

**2. La taxonomie de tags révisée** : la plus exhaustive possible, mais sans doublons ni
quasi-synonymes, organisée par familles — type de cuisine, format d'établissement, régime
alimentaire, usage. Pour chaque tag : libellé exact, famille, quand l'appliquer, et son statut
(nouveau / existant / fusionne tel tag existant).

Forme des libellés : **en français**, **une majuscule à chaque mot** (« Fast Food », « À Emporter »),
au singulier. Un tag qui ne concernera jamais qu'un seul restaurant ne sert à rien comme filtre :
ne le propose pas.

**3. Le SQL**, en respectant les règles ci-dessous, dans cet ordre :

- a. les `insert` de **tous** les tags que tu utilises et qui ne sont pas déjà dans `tags.csv` —
  attention, la colonne `restaurants.tags` n'a aucune contrainte vers la table `tags` : un tag
  oublié s'affichera sur la fiche mais ne sera jamais proposé dans les filtres ;
- b. **un `update` par restaurant**, identifié par son `slug`, qui réécrit `tags` **et** `badges`
  en entier (la liste finale, pas un ajout) — vise 3 à 6 tags par restaurant, et des badges pris
  uniquement dans la liste figée ci-dessus ;
- c. en commentaire final, la liste des tags existants devenus inutiles : je les supprimerai
  moi-même après vérification.

## Règles ABSOLUES pour le SQL (relis-les avant de répondre)

La base est en production et contient des contributions d'utilisateurs (avis, photos, menus,
favoris, déjeuners, succès). Ton SQL doit être strictement additif ou correctif.

**Interdit, sans aucune exception :**

- `delete`, `truncate`, `drop`, `alter`, `create`, `grant`, `revoke` ;
- toute écriture dans `reviews`, `restaurant_photos`, `restaurant_menus`, `favorites`,
  `lunch_plans`, `user_achievements`, `users`, `profiles`, `waiting_list` ;
- toute modification des colonnes `rating`, `reviews`, `relevance`, `bayes_rating`, `image`,
  `slug`, `name`, `created_at` d'un restaurant existant ;
- supprimer une ligne de `tags` ou de `badges`.

**Autorisé, et rien d'autre :**

```sql
insert into public.tags (label) values ('Coréen') on conflict (label) do nothing;

update public.restaurants
set tags   = array['Coréen','Bibimbap','À Emporter']::text[],
    badges = array['Sur Place','À Emporter']::text[]
where slug = 'nom-du-resto';
```

**Forme attendue** : un seul bloc SQL encadré par `begin;` et `commit;`, chaque instruction
commentée en une ligne (ce que tu changes et pourquoi). Les apostrophes se doublent :
`'L''Atelier'`.
