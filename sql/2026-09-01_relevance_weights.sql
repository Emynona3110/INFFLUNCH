-- =============================================================================
-- Pertinence : rééquilibrage + vue de contrôle — 2026-09-01
-- Reprend sql/2026-06-20_relevance.sql avec quatre changements :
--
--   1) poids     qualité   popularité   proximité
--        avant     0,50       0,20        0,30
--        après     0,70       0,15        0,15
--
--      + le PRIOR bayésien passe de « moyenne des restos notés » à une
--        constante 3,5 et le seuil de confiance de 5 à 3 avis : avec 4 restos
--        notés 5 / 4,5 / 4 / 4, le prior montait à 4,33, si bien qu'un resto
--        SANS avis (supposé 4,33) devançait un vrai 4/5. Voir le bloc `p`.
--
--   2) le BONUS NOUVEAUTÉ est SUPPRIMÉ : un resto récent ne monte plus
--      artificiellement les 14 premiers jours, il se classe sur ses seuls
--      mérites. Le score reste donc borné à 0..100.
--
--   3) la PROXIMITÉ est APLATIE : à midi, 3 ou 9 minutes de marche revient au
--      même. On abandonne la décroissance continue sur le vol d'oiseau au
--      profit du TEMPS DE MARCHE réel (`walk_minutes`, déjà en base) avec une
--      franchise : aucun malus jusqu'à `walk_free` minutes, puis décroissance
--      linéaire jusqu'à 0 à `walk_max`. Tous les restos « à côté » sont donc à
--      égalité sur ce critère, seuls les vraiment loin sont pénalisés.
--
--   4) le calcul déménage dans une VUE `relevance_components`, qui expose
--      chaque composante (et les entrées qui la produisent) restaurant par
--      restaurant. `recalc_relevance()` ne fait plus que recopier ses colonnes
--      `score` / `q_bayes` dans la table → une seule définition de la formule,
--      inspectable directement en SQL :
--
--        select * from public.relevance_components order by score desc;
--
--      La vue n'est PAS exposée à l'API (revoke plus bas) : elle se lit depuis
--      l'éditeur SQL Supabase. Elle tourne avec les droits du propriétaire, ce
--      qui est nécessaire pour compter les favoris de tout le monde (la RLS de
--      `favorites` ne laisse voir que les siens).
--
-- Les triggers en place continuent d'appeler `recalc_relevance()` : rien
-- d'autre à réexécuter. Le `select` final rafraîchit les scores existants.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Vue : la formule, décomposée -------------------------------------------
create or replace view public.relevance_components as
with p as (
  -- ---- Paramètres (à ajuster ici, la fonction suit) ----
  -- Prior : note supposée d'un resto SANS avis. Volontairement FIXE et au
  -- milieu de l'échelle. La moyenne des restos notés (l'usage classique) ne
  -- marche pas ici : nos quatre seuls restos notés le sont 5 / 4,5 / 4 / 4, ce
  -- qui donnait un prior de 4,33 — un resto sans le moindre avis passait donc
  -- devant un vrai 4/5. Avec 3,5, un bon avis fait monter, un mauvais descend.
  select 3.5::real  as prior_c,
         -- Seuil de confiance : nb d'avis à partir duquel la note réelle pèse
         -- autant que le prior. À notre échelle (1-2 avis par resto), 5 rendait
         -- les avis quasi invisibles → 3.
         3.0::real  as m_conf,
         10.0::real as walk_free,  -- minutes de marche sans aucun malus
         30.0::real as walk_max,   -- au-delà, proximité = 0
         0.70::real as w_quality,
         0.15::real as w_pop,
         0.15::real as w_prox
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
  r.walk_minutes,
  round(r.distance::numeric, 3)                as distance_km,
  round(p.prior_c::numeric, 2)                 as prior_c,
  round(g.max_pop::numeric, 0)                 as max_pop,
  -- ---- Composantes normalisées (0..1) ----
  round(c.q_bayes::numeric, 2)                 as q_bayes,      -- note corrigée /5
  round((c.q_bayes / 5.0)::numeric, 3)         as quality_01,
  round(c.pop_01::numeric, 3)                  as popularity_01,
  round(c.prox_01::numeric, 3)                 as proximity_01,
  -- ---- Points marqués (somme = score) ----
  round((100 * p.w_quality * c.q_bayes / 5.0)::numeric, 2) as pts_quality,
  round((100 * p.w_pop * c.pop_01)::numeric, 2)            as pts_popularity,
  round((100 * p.w_prox * c.prox_01)::numeric, 2)          as pts_proximity,
  round((100 * (p.w_quality * c.q_bayes / 5.0
              + p.w_pop * c.pop_01
              + p.w_prox * c.prox_01))::numeric, 2)        as score,
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
    -- Temps de marche réel (ORS) si connu, sinon estimé depuis le vol d'oiseau
    -- (12 min/km ≈ 5 km/h). Plein score jusqu'à walk_free, décroissance
    -- linéaire jusqu'à 0 à walk_max. Ni l'un ni l'autre connus : pas de malus.
    case
      when coalesce(r.walk_minutes, r.distance * 12) is null then 1.0
      else greatest(0.0, least(1.0,
             (p.walk_max - coalesce(r.walk_minutes, r.distance * 12))
             / (p.walk_max - p.walk_free)))
    end as prox_01
) c;

-- Vue de diagnostic : réservée à l'éditeur SQL / service_role, pas à l'API.
revoke all on public.relevance_components from anon, authenticated;

-- 2) La fonction ne fait plus que recopier la vue ------------------------------
create or replace function public.recalc_relevance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.restaurants r
  set relevance    = c.score::real,
      bayes_rating = c.q_bayes::real
  from public.relevance_components c
  where r.id = c.id;
end;
$$;

-- 3) Recalcul immédiat ---------------------------------------------------------
select public.recalc_relevance();

-- Contrôle (à lancer à la main) :
--   select name, rating, reviews, favorites, walk_minutes,
--          pts_quality, pts_popularity, pts_proximity, score
--   from public.relevance_components
--   order by score desc;
