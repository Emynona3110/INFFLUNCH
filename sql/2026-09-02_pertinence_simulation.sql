-- =============================================================================
-- Simulation : proximité calculée sur la DISTANCE (km) — 2026-09-02
-- LECTURE SEULE : ce fichier n'écrit rien. Il montre le classement tel qu'il
-- serait avec la règle en kilomètres, pour régler les deux molettes AVANT
-- d'appliquer avec `sql/2026-09-02_pertinence_distance.sql`.
--
-- Seule la proximité change : on repart des colonnes déjà calculées par la vue
-- `relevance_components` (aucune formule dupliquée) et on remplace les points
-- de proximité par ceux de la règle en distance.
--
-- Avant : marche = `walk_minutes` (ou distance × 12), plein score ≤ 10 min
--         (≈ 830 m), zéro à 30 min → tout le quartier à égalité.
-- Après : plein score ≤ `dist_free`, décroissance linéaire jusqu'à 0 à
--         `dist_max`. Distance inconnue = pas de malus (et resto invisible aux
--         non-admins de toute façon).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

with params as (
  select 0.15::numeric as dist_free,  -- ← molette 1 : km sans aucun malus
         1.60::numeric as dist_max,   -- ← molette 2 : km où la proximité tombe à 0
         0.15::numeric as w_prox      -- poids de la proximité (inchangé)
),
base as (
  select
    c.name,
    c.distance_km,
    c.walk_minutes,
    c.proximity_01  as prox_avant,
    c.pts_proximity as pts_prox_avant,
    c.score         as score_avant,
    c.relevance_stockee
  from public.relevance_components c
  where c.closed is not true
),
sim as (
  select
    b.*,
    case
      when b.distance_km is null then 1.0
      else greatest(0.0, least(1.0,
             (p.dist_max - b.distance_km) / (p.dist_max - p.dist_free)))
    end as prox_apres,
    p.w_prox
  from base b
  cross join params p
)
select
  name,
  distance_km,
  walk_minutes,
  prox_avant,
  round(prox_apres, 3)                                              as prox_apres,
  score_avant,
  round(score_avant - pts_prox_avant + 100 * w_prox * prox_apres, 2) as score_apres,
  round(100 * w_prox * prox_apres - pts_prox_avant, 2)              as delta,
  relevance_stockee
from sim
order by score_apres desc, name;

-- Lectures utiles :
--   • `delta` = 0 → resto à moins de `dist_free` : rien ne change pour lui.
--   • `delta` < 0 → il recule ; c'est l'effet recherché pour les plus éloignés.
--   • Si presque tous les `score_apres` restent identiques, `dist_free` est
--     trop généreux : le baisser (0,15 → 0,10) resserre encore.
--   • Si tout s'écrase vers 49, `dist_max` est trop court : l'allonger.
--   • `score_avant` ≠ `relevance_stockee` → les scores stockés datent d'avant
--     l'écriture des distances : `select public.recalc_relevance();` suffit,
--     indépendamment de cette molette.
--   • `distance_km` vide → resto pas encore géocodé.
--
-- Étalement obtenu, une fois le changement appliqué (plus il y a de scores
-- distincts, moins il y a d'ex æquo) :
--   select count(distinct relevance) as scores_distincts, count(*) as restos
--   from public.restaurants where closed is not true;
