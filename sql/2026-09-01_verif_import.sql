-- =============================================================================
-- Contrôles autour d'un import de tags / badges — 2026-09-01
-- À jouer AVANT (§0 à §2) et APRÈS (§3 à §5) le SQL produit par Gemini.
-- Tout est en lecture seule, sauf les blocs explicitement commentés (opt-in).
--
-- Le piège principal : un `update ... where slug = '…'` dont le slug est faux
-- ne touche AUCUNE ligne et ne lève AUCUNE erreur. D'où le §2.
--
-- Le caractère de nettoyage se note chr(10) = saut de ligne, chr(13) = retour
-- chariot, chr(9) = tabulation : pas d'antislash, donc rien à échapper.
-- =============================================================================


-- 0) SAUVEGARDE avant import (recommandé) -------------------------------------
-- Copie des seules colonnes que l'import réécrit. Permet un retour arrière
-- ciblé sans jamais toucher aux contributions. À décommenter pour l'exécuter.
--
-- create table public.restaurants_tags_backup_20260901 as
-- select id, slug, tags, badges, now() as saved_at
-- from public.restaurants;
--
-- Retour arrière (si besoin) :
-- update public.restaurants r
-- set tags = b.tags, badges = b.badges
-- from public.restaurants_tags_backup_20260901 b
-- where r.id = b.id;


-- 1) AVANT : libellés de tags pollués par un caractère invisible ---------------
-- Constaté le 2026-09-01 : « Bento », « Donburi », « Indien » et « Japonais »
-- se terminent par un saut de ligne. Si on ne corrige pas d'abord, un import
-- qui écrit proprement 'Japonais' ne correspond pas à la ligne existante :
-- l'`on conflict (label)` ne joue pas et on se retrouve avec deux tags pour un
-- seul — celui porté par les restaurants, et celui visible dans les filtres.
select id, label, length(label) as longueur
from public.tags
where label <> trim(both chr(10) || chr(13) || chr(9) || ' ' from label)
order by label;

-- Le nettoyage créerait-il un doublon ? (résultat attendu : aucune ligne)
select trim(both chr(10) || chr(13) || chr(9) || ' ' from label) as label_propre,
       count(*)
from public.tags
group by 1
having count(*) > 1;

-- Nettoyage — à décommenter une fois les deux requêtes ci-dessus vérifiées.
-- Corrige la table ET les libellés recopiés dans les tableaux des restaurants.
--
-- begin;
--
-- update public.tags
-- set label = trim(both chr(10) || chr(13) || chr(9) || ' ' from label)
-- where label <> trim(both chr(10) || chr(13) || chr(9) || ' ' from label);
--
-- update public.restaurants r
-- set tags = (
--   select array_agg(trim(both chr(10) || chr(13) || chr(9) || ' ' from t))
--   from unnest(r.tags) t
-- )
-- where r.tags is not null
--   and exists (
--     select 1 from unnest(r.tags) t
--     where t <> trim(both chr(10) || chr(13) || chr(9) || ' ' from t)
--   );
--
-- commit;


-- 2) AVANT : les slugs visés existent-ils ? ------------------------------------
-- Colle ici la liste des slugs du SQL à jouer. Tout `existe = false` est un
-- update qui ne ferait rien : corrige le slug AVANT de lancer l'import.
-- (Liste ci-dessous = celle du premier retour de Gemini, 2026-09-01.)
with cibles(slug) as (
  values
    ('anamour'), ('authentic-bento'), ('bills-burger'), ('boulangerie-patisserie'),
    ('boun'), ('chez-les-soeurs'), ('durum--brunch'), ('fa-fa'), ('g20'), ('hercule'),
    ('egalite'), ('cantine'), ('genesis'), ('nid-a-frango'), ('loliva'),
    ('maison-des-laitieres'), ('napoli-gang-by-big-mama'), ('o-five-pizza'),
    ('oyama-sushi'), ('pousses'), ('titan')
)
select c.slug,
       (r.id is not null) as existe,
       r.name
from cibles c
left join public.restaurants r on r.slug = c.slug
order by existe, c.slug;

-- L'inverse : restaurants de la base absents de la liste (oubliés par l'import).
-- Les seuls attendus ici sont les établissements fermés.
with cibles(slug) as (
  values
    ('anamour'), ('authentic-bento'), ('bills-burger'), ('boulangerie-patisserie'),
    ('boun'), ('chez-les-soeurs'), ('durum--brunch'), ('fa-fa'), ('g20'), ('hercule'),
    ('egalite'), ('cantine'), ('genesis'), ('nid-a-frango'), ('loliva'),
    ('maison-des-laitieres'), ('napoli-gang-by-big-mama'), ('o-five-pizza'),
    ('oyama-sushi'), ('pousses'), ('titan')
)
select r.name, r.slug, r.closed
from public.restaurants r
where r.slug not in (select slug from cibles)
order by r.closed, r.name;


-- 3) APRÈS : tags posés sur un resto mais absents de la table `tags` -----------
-- Ils s'affichent sur la fiche mais ne sont PAS proposés dans les filtres
-- (la liste des filtres vient de `tags`). Résultat attendu : aucune ligne.
select distinct t.label as tag_orphelin
from public.restaurants r
cross join lateral unnest(coalesce(r.tags, '{}')) as t(label)
where not exists (select 1 from public.tags g where g.label = t.label)
order by 1;

-- Correctif éventuel, une fois la liste vérifiée :
-- insert into public.tags (label)
-- select distinct t.label
-- from public.restaurants r
-- cross join lateral unnest(coalesce(r.tags, '{}')) as t(label)
-- where not exists (select 1 from public.tags g where g.label = t.label)
-- on conflict (label) do nothing;


-- 4) APRÈS : badges non affichables -------------------------------------------
-- Seuls ces six ont une icône (src/services/badgeMap.ts) ; les autres sont
-- ignorés silencieusement à l'écran. Résultat attendu : aucune ligne.
select r.name, b.label as badge_invisible
from public.restaurants r
cross join lateral unnest(coalesce(r.badges, '{}')) as b(label)
where b.label not in (
  'Option Végétarienne', 'Sur Place', 'À Emporter', 'Bar', 'TooGoodToGo', 'Magasin'
)
order by r.name;


-- 5) APRÈS : vue d'ensemble ----------------------------------------------------
select name, slug, closed,
       coalesce(array_length(tags, 1), 0)   as nb_tags,
       coalesce(array_length(badges, 1), 0) as nb_badges,
       array_to_string(tags, ' | ')   as tags,
       array_to_string(badges, ' | ') as badges
from public.restaurants
order by nb_tags, name;

-- Tags de la table devenus inutilisés (candidats à suppression manuelle).
select g.label
from public.tags g
where not exists (
  select 1 from public.restaurants r where g.label = any(coalesce(r.tags, '{}'))
)
order by g.label;
