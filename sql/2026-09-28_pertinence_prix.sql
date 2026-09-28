-- =============================================================================
-- Pertinence : le PRIX entre dans le score — 2026-09-28
-- ⚠️ À exécuter APRÈS `2026-09-28_restaurant_prices.sql` (colonnes de prix).
--
-- Ce qui est ajouté : un BONUS « rapport qualité-prix », jamais un malus.
--
--     abordable_01 = (plafond - price_ref) / (plafond - plancher), borné 0..1
--     pts_value    = 100 * w_value * qualite_01 * abordable_01
--
-- Deux partis pris, importants pour comprendre la formule :
--
--  1) PRIX INCONNU = 0, pas 0,5. Un neutre à mi-chemin ferait passer un
--     restaurant dont on connaît le prix élevé SOUS un restaurant dont on ne
--     sait rien : déclarer ferait alors baisser le score du resto, exactement
--     le contraire du signal qu'on veut envoyer. Ici, déclarer ne peut que
--     faire monter — jamais descendre.
--
--  2) Le bonus est MULTIPLIÉ par la qualité, il ne s'y ajoute pas : « pas
--     cher » ne compte que si c'est bon. Un resto médiocre à 9 € ne doit pas
--     doubler un bon resto à 18 €.
--
-- Les trois poids historiques (qualité 0,70 / popularité 0,15 / proximité
-- 0,15) sont conservés tels quels mais ramenés à 95 % de leur part, w_value
-- prenant les 5 % restants : le score reste donc borné à 0..100 et son échelle
-- ne change pas. Concrètement, le prix ne peut déplacer un restaurant que de
-- quelques points — de quoi départager deux restos comparables, pas de quoi
-- renverser le classement.
--
-- Le RECALCUL : `recalc_restaurant_prices()` appelle désormais
-- `recalc_relevance()` après avoir écrit les agrégats. C'est nécessaire, et
-- pas redondant avec le trigger sur `restaurants` : ce dernier passe par
-- `tg_recalc_relevance()`, qui sort immédiatement si `pg_trigger_depth() > 1`
-- (garde anti-récursion de 2026-09-02_relevance_auto.sql). Or l'écriture des
-- agrégats de prix vient elle-même d'un trigger : la cascade se ferait donc à
-- la profondeur 2 et serait avalée par la garde. Sans cet appel explicite, une
-- nouvelle déclaration de prix ne toucherait jamais la pertinence.
--
-- `price_low` / `price_high` sont ajoutées aux colonnes surveillées du trigger
-- de `restaurants` pour les écritures de premier niveau (backfill à la main,
-- corrections en SQL). `price_ref` n'y figure pas : c'est une colonne générée,
-- jamais écrite directement.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) La formule, décomposée ----------------------------------------------------
-- DROP puis CREATE, et non CREATE OR REPLACE : les colonnes de prix s'insèrent
-- au MILIEU de la liste (à côté des autres entrées, pour que la vue reste
-- lisible), or `create or replace view` n'autorise que l'ajout de colonnes à la
-- fin — sinon « cannot change name of view column ». Rien ne dépend de cette
-- vue : `recalc_relevance()` la référence depuis du plpgsql, résolu à
-- l'exécution. Les droits sont reposés juste après (le revoke).
drop view if exists public.relevance_components;
create view public.relevance_components as
with p as (
  -- ---- Paramètres (à ajuster ici, la fonction suit) ----
  select 3.5::real  as prior_c,   -- note supposée d'un resto SANS avis
         3.0::real  as m_conf,    -- nb d'avis où la note réelle pèse autant
         0.15::real as dist_free, -- km sans aucun malus de proximité
         1.60::real as dist_max,  -- km où la proximité tombe à 0
         0.70::real as w_quality,
         0.15::real as w_pop,
         0.15::real as w_prox,
         -- Prix par personne (price_ref = milieu de la fourchette publiée) en
         -- dessous duquel le bonus est plein, au-dessus duquel il est nul.
         -- Calés sur le marché local : le midi tourne autour de 10 à 25 €.
         10.0::real as price_floor,
         25.0::real as price_ceiling,
         -- Part du score réservée au rapport qualité-prix. 0 = comportement
         -- d'avant ce script.
         0.05::real as w_value
),
fav as (
  select restaurant_id, count(*)::real as favorites
  from public.favorites
  group by restaurant_id
),
g as (
  -- Stat globale (le resto "test" est exclu pour ne pas la fausser).
  select
    (select coalesce(max(r.reviews + coalesce(f.favorites, 0)), 0)::real
       from public.restaurants r
       left join fav f on f.restaurant_id = r.id
      where r.slug is distinct from 'test') as max_pop
)
select
  r.id,
  r.name,
  r.closed,
  -- ---- Entrées ----
  r.rating,
  r.reviews,
  coalesce(f.favorites, 0)::int                as favorites,
  r.walk_minutes,                              -- informatif : n'entre PAS dans le score
  round(r.distance::numeric, 3)                as distance_km,
  r.price_low,
  r.price_high,
  r.price_count,
  round(r.price_ref::numeric, 2)               as price_ref,
  round(p.prior_c::numeric, 2)                 as prior_c,
  round(g.max_pop::numeric, 0)                 as max_pop,
  -- ---- Composantes normalisées (0..1) ----
  round(c.q_bayes::numeric, 2)                 as q_bayes,      -- note corrigée /5
  round((c.q_bayes / 5.0)::numeric, 3)         as quality_01,
  round(c.pop_01::numeric, 3)                  as popularity_01,
  round(c.prox_01::numeric, 3)                 as proximity_01,
  round(c.value_01::numeric, 3)                as value_01,
  -- ---- Points marqués (somme = score) ----
  round((100 * (1 - p.w_value) * p.w_quality * c.q_bayes / 5.0)::numeric, 2) as pts_quality,
  round((100 * (1 - p.w_value) * p.w_pop * c.pop_01)::numeric, 2)            as pts_popularity,
  round((100 * (1 - p.w_value) * p.w_prox * c.prox_01)::numeric, 2)          as pts_proximity,
  round((100 * p.w_value * (c.q_bayes / 5.0) * c.value_01)::numeric, 2)      as pts_value,
  round((100 * ((1 - p.w_value) * (p.w_quality * c.q_bayes / 5.0
                                 + p.w_pop * c.pop_01
                                 + p.w_prox * c.prox_01)
              + p.w_value * (c.q_bayes / 5.0) * c.value_01))::numeric, 2)    as score,
  -- Score actuellement stocké : doit coller après recalc_relevance().
  r.relevance                                  as relevance_stockee
from public.restaurants r
cross join p
cross join g
left join fav f on f.restaurant_id = r.id
cross join lateral (
  select
    -- Note bayésienne 0..5 : corrige le faible nombre d'avis.
    ((r.reviews * r.rating + p.m_conf * p.prior_c)
      / nullif(r.reviews + p.m_conf, 0)) as q_bayes,
    -- Popularité écrasée par un log (anti-monopole), normalisée par le max.
    case when g.max_pop > 0
      then ln(1 + r.reviews + coalesce(f.favorites, 0)) / ln(1 + g.max_pop)
      else 0 end as pop_01,
    -- Distance à vol d'oiseau depuis INFFLUX (km). Plein score jusqu'à
    -- dist_free, décroissance linéaire jusqu'à 0 à dist_max. Distance inconnue
    -- (resto pas encore géocodé) : pas de malus.
    case
      when r.distance is null then 1.0
      else greatest(0.0, least(1.0,
             (p.dist_max - r.distance) / (p.dist_max - p.dist_free)))
    end as prox_01,
    -- Abordabilité : 1 au plancher, 0 au plafond. Prix INCONNU = 0 : pas de
    -- bonus, mais pas de malus non plus — un restaurant sans déclaration garde
    -- exactement le score qu'il aurait eu sans ce critère.
    case
      when r.price_ref is null then 0.0
      else greatest(0.0, least(1.0,
             (p.price_ceiling - r.price_ref)
               / (p.price_ceiling - p.price_floor)))
    end as value_01
) c;

-- La vue reste réservée à l'éditeur SQL / service_role, pas à l'API.
revoke all on public.relevance_components from anon, authenticated;

-- 2) Déclenchement -------------------------------------------------------------
-- Colonnes surveillées : on ajoute les agrégats de prix, pour les écritures de
-- premier niveau (backfill, correction à la main).
drop trigger if exists trg_restaurants_relevance on public.restaurants;
create trigger trg_restaurants_relevance
after insert or delete or update of distance, rating, reviews, price_low, price_high
on public.restaurants
for each statement execute function public.tg_recalc_relevance();

-- Une déclaration de prix doit rejouer la pertinence. L'appel est EXPLICITE :
-- la cascade via le trigger de `restaurants` se produirait à la profondeur 2 et
-- serait avalée par la garde anti-récursion de `tg_recalc_relevance()`.
create or replace function public.recalc_restaurant_prices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid bigint := coalesce(new.restaurant_id, old.restaurant_id);
begin
  perform public.apply_restaurant_prices(rid);

  -- Si un update a déplacé la déclaration vers un autre resto, recalculer l'ancien.
  if tg_op = 'UPDATE' and new.restaurant_id is distinct from old.restaurant_id then
    perform public.apply_restaurant_prices(old.restaurant_id);
  end if;

  -- Le prix entre dans le score : les fourchettes viennent de changer.
  perform public.recalc_relevance();

  return null; -- trigger AFTER
end;
$$;

-- 3) Remise à niveau immédiate --------------------------------------------------
select public.recalc_relevance();

-- Contrôles :
--   -- ce que le prix rapporte, restaurant par restaurant :
--   select name, price_low, price_high, price_count, value_01,
--          pts_quality, pts_popularity, pts_proximity, pts_value, score
--   from public.relevance_components
--   where closed is not true
--   order by score desc, name;
--
--   -- le score stocké doit coller au score calculé, partout :
--   select name, score, relevance_stockee
--   from public.relevance_components
--   where score is distinct from relevance_stockee;   -- doit renvoyer 0 ligne
--
--   -- caler price_floor / price_ceiling sur la réalité observée :
--   select min(price_ref), max(price_ref),
--          percentile_cont(0.5) within group (order by price_ref)
--   from public.restaurants where price_ref is not null;
