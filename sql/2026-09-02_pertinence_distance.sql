-- =============================================================================
-- Pertinence : la proximité se calcule sur la DISTANCE, plus sur le temps de
-- marche — 2026-09-02
--
-- Pourquoi : `walk_minutes` est un entier (souvent une estimation vol d'oiseau
-- × 1,3 quand ORS ne répond pas) et la franchise de 10 minutes couvrait ~830 m.
-- Résultat : tout le quartier touchait les 15 points de proximité pleins et se
-- retrouvait à égalité — d'où les scores tous à 64,00 pour les restos sans avis
-- ni favori (49 de qualité + 0 de popularité + 15 de proximité).
-- La distance en kilomètres est continue et exacte : elle sépare 300 m de
-- 700 m, ce que des minutes arrondies ne faisaient pas.
--
-- Ce qui change, uniquement dans le bloc `p` et le calcul de `prox_01` :
--     avant   walk_free 10 min  →  walk_max 30 min  (sur walk_minutes)
--     après   dist_free 0,15 km →  dist_max 1,60 km (sur distance)
-- Les poids (qualité 0,70 / popularité 0,15 / proximité 0,15), le prior
-- bayésien et le reste de la formule sont inchangés.
--
-- `walk_minutes` reste calculé et affiché (pastille « 8 min à pied »), il
-- n'entre simplement plus dans le score.
--
-- ⚠️ Le score STOCKÉ (`restaurants.relevance`) ne se met pas à jour tout seul
-- quand une distance change : seuls les triggers d'avis et `recalc_relevance()`
-- l'écrivent. D'où l'appel en fin de script.
--
-- Simulation avant/après : `sql/2026-09-02_pertinence_simulation.sql`
-- (lecture seule, à lancer AVANT celui-ci pour régler les deux molettes).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

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
         -- Proximité en KILOMÈTRES (vol d'oiseau depuis INFFLUX) : la
         -- distance est continue et exacte, là où `walk_minutes` est un entier
         -- souvent estimé — deux restos de 300 et 700 m tombaient sur la même
         -- valeur. Molettes à ajuster ici, la simulation les reprend.
         0.15::real as dist_free,  -- km sans aucun malus (~2 min de marche)
         1.60::real as dist_max,   -- au-delà, proximité = 0
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
  r.walk_minutes,                              -- informatif : n'entre PAS dans le score
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
    -- Distance à vol d'oiseau depuis INFFLUX (km). Plein score jusqu'à
    -- dist_free, décroissance linéaire jusqu'à 0 à dist_max. Distance inconnue
    -- (resto pas encore géocodé) : pas de malus — et de toute façon invisible
    -- aux non-admins tant qu'elle manque.
    -- `walk_minutes` n'entre plus dans le score : il reste affiché sur les
    -- cards et les fiches, mais son arrondi à la minute écrasait les écarts.
    case
      when r.distance is null then 1.0
      else greatest(0.0, least(1.0,
             (p.dist_max - r.distance) / (p.dist_max - p.dist_free)))
    end as prox_01
) c;

-- La vue reste réservée à l'éditeur SQL / service_role, pas à l'API.
revoke all on public.relevance_components from anon, authenticated;

-- Réécrit les scores stockés avec la nouvelle proximité.
select public.recalc_relevance();

-- Contrôle :
--   select name, distance_km, walk_minutes, proximity_01, pts_proximity, score
--   from public.relevance_components
--   where closed is not true
--   order by score desc, name;
