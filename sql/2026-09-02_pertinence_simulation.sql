-- =============================================================================
-- Pertinence : composantes et score, restaurant par restaurant — 2026-09-02
-- LECTURE SEULE. La formule est recopiée ici en entier avec ses paramètres en
-- tête : le résultat ne dépend PAS de la définition actuelle de la vue, on voit
-- donc ce que donnerait le calcul avec les réglages ci-dessous, qu'ils soient
-- déjà appliqués en base ou non.
--
-- Lecture : les trois `pts_*` s'additionnent pour faire `score` (sur 100).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

with p as (
  select 3.5::numeric  as prior_c,    -- note supposée d'un resto sans avis
         3.0::numeric  as m_conf,     -- nb d'avis où la note réelle pèse autant
         0.15::numeric as dist_free,  -- km sans aucun malus de proximité
         1.60::numeric as dist_max,   -- km où la proximité tombe à 0
         0.70::numeric as w_quality,
         0.15::numeric as w_pop,
         0.15::numeric as w_prox
),
fav as (
  select restaurant_id, count(*)::numeric as favorites
  from public.favorites
  group by restaurant_id
),
g as (
  select coalesce(max(r.reviews + coalesce(f.favorites, 0)), 0)::numeric as max_pop
  from public.restaurants r
  left join fav f on f.restaurant_id = r.id
  where r.slug is distinct from 'test'
),
calc as (
  select
    r.name,
    r.rating::numeric                  as note,
    r.reviews                          as avis,
    coalesce(f.favorites, 0)::int      as favoris,
    round(r.distance::numeric, 3)      as distance_km,
    -- Qualité : note bayésienne 0..5, tirée vers le prior tant qu'il y a peu
    -- d'avis. Sans aucun avis : vaut exactement le prior (3,5).
    (r.reviews * r.rating::numeric + p.m_conf * p.prior_c)
      / nullif(r.reviews + p.m_conf, 0) as q_bayes,
    -- Popularité : avis + favoris, écrasés par un log, normalisés par le max.
    case when g.max_pop > 0
      then ln(1 + r.reviews + coalesce(f.favorites, 0))::numeric / ln(1 + g.max_pop)
      else 0
    end                                as pop_01,
    -- Proximité : 1 jusqu'à dist_free, décroissance linéaire jusqu'à 0 à
    -- dist_max. Distance inconnue (resto non géocodé) : pas de malus, donc 1
    -- aussi — la colonne `distance_km` vide permet de les distinguer.
    case when r.distance is null then 1.0
      else greatest(0.0, least(1.0,
             (p.dist_max - r.distance::numeric) / (p.dist_max - p.dist_free)))
    end                                as prox_01,
    p.w_quality, p.w_pop, p.w_prox
  from public.restaurants r
  cross join p
  cross join g
  left join fav f on f.restaurant_id = r.id
  where r.closed is not true
)
select
  name,
  -- ---- Entrées ----
  note,
  avis,
  favoris,
  distance_km,
  -- ---- Composantes normalisées (0..1) ----
  round(q_bayes, 2)                                  as note_bayes,
  round(q_bayes / 5, 3)                              as qualite_01,
  round(pop_01, 3)                                   as popularite_01,
  round(prox_01, 3)                                  as proximite_01,
  -- ---- Points marqués (la somme fait le score) ----
  round(100 * w_quality * q_bayes / 5, 2)            as pts_qualite,
  round(100 * w_pop * pop_01, 2)                     as pts_popularite,
  round(100 * w_prox * prox_01, 2)                   as pts_proximite,
  round(100 * (w_quality * q_bayes / 5
             + w_pop * pop_01
             + w_prox * prox_01), 2)                 as score
from calc
order by score desc, name;
