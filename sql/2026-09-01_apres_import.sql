-- =============================================================================
-- Après import — 2026-09-01
-- À jouer APRÈS le SQL renvoyé par Gemini (surtout après des insertions de
-- nouveaux restaurants). Complète ce que l'import ne peut pas calculer, sans
-- rien détruire :
--   1) distance à vol d'oiseau depuis le bureau + libellé affiché ;
--   2) recalcul des scores de pertinence.
--
-- Le temps de marche réel (walk_minutes) se remplit à part, via l'Edge Function
-- ORS — il ne traite que les lignes où walk_minutes est null :
--   $env:ADMIN_EMAIL="…"; $env:ADMIN_PASSWORD="…"; node scripts/backfill-walk-minutes.mjs
--
-- Idempotent : ne touche que les lignes dont la distance manque.
-- =============================================================================

-- 1) Distance depuis INFFLUX (48.8487433, 2.4280408) ---------------------------
-- Même calcul que l'application : vol d'oiseau, libellé "1.2km" au-delà du
-- kilomètre, sinon "350m" arrondi à la dizaine.
update public.restaurants r
set distance = d.km::real,
    "distanceLabel" = case
      when d.km >= 1 then trim(to_char(round(d.km::numeric, 1), 'FM990.0')) || 'km'
      else ((round(d.km * 1000 / 10) * 10)::int)::text || 'm'
    end
from (
  select id,
         6371 * 2 * asin(sqrt(
           power(sin(radians(lat - 48.8487433) / 2), 2)
           + cos(radians(48.8487433)) * cos(radians(lat))
             * power(sin(radians(lng - 2.4280408) / 2), 2)
         )) as km
  from public.restaurants
  where lat is not null and lng is not null
) d
where r.id = d.id
  and (r.distance is null or r."distanceLabel" is null);

-- 2) Scores de pertinence ------------------------------------------------------
select public.recalc_relevance();

-- Contrôle ---------------------------------------------------------------------
--   select name, slug, tags, badges, distance, "distanceLabel", walk_minutes
--   from public.restaurants
--   order by name;
--
--   -- restos importés qu'il reste à compléter (image, temps de marche) :
--   select name, slug, image, walk_minutes
--   from public.restaurants
--   where image is null or walk_minutes is null
--   order by name;
