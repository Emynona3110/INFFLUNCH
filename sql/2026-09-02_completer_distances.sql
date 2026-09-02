-- =============================================================================
-- Compléter distance / distanceLabel / walk_minutes — 2026-09-02
-- Remplit ce qui manque, sans rien écraser de ce qui existe déjà.
--
-- Ce que SQL peut faire seul : tout ce qui se déduit de `lat`/`lng`.
--   • `distance`      = vol d'oiseau depuis INFFLUX (48.8487433, 2.4280408)
--   • `distanceLabel` = « 1.2km » / « 350m », même format que le front
--   • `walk_minutes`  = estimation 5 km/h × 1,3 (le détour réel du trottoir),
--                       exactement le repli de `scripts/backfill-walk-minutes.mjs`
--                       quand ORS ne répond pas.
--
-- Ce que SQL ne peut PAS faire : trouver les coordonnées (géocodage Nominatim)
-- ni le temps de marche réel (routage ORS) — ce sont des appels réseau. Un
-- restaurant sans `lat`/`lng` n'est donc pas traité ici : il reste réservé aux
-- admins (policy du 2026-09-02) jusqu'à `node scripts/backfill-coords.mjs` ou
-- un pin posé à la main depuis le crayon de la fiche.
--
-- ⚠️ Ordre conseillé si tu veux les VRAIS temps de marche : lancer d'abord
-- `node scripts/backfill-walk-minutes.mjs` (ORS), puis ce script pour boucher
-- les trous. L'inverse fonctionne aussi, mais le script Node ne traite que les
-- `walk_minutes` nuls : les estimations posées ici ne seraient plus affinées.
-- Sans conséquence sur le classement depuis que la proximité se calcule sur la
-- distance (`2026-09-02_pertinence_distance.sql`) : le temps de marche n'est
-- plus qu'un affichage.
--
-- Relançable sans risque.
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Fonctions (idempotentes — déjà posées par le script d'import) ------------
create or replace function public.distance_km_from_infflux(
  p_lat double precision,
  p_lng double precision
)
returns double precision
language sql
immutable
as $$
  select 6371.0 * 2 * asin(sqrt(
      power(sin(radians(p_lat - 48.8487433) / 2), 2)
    + cos(radians(48.8487433)) * cos(radians(p_lat))
      * power(sin(radians(p_lng - 2.4280408) / 2), 2)));
$$;

create or replace function public.format_distance(km double precision)
returns text
language sql
immutable
as $$
  select case
    when km is null then null
    when km >= 1 then to_char(round(km::numeric, 1), 'FM990.0') || 'km'
    else (round(km * 1000 / 10) * 10)::int::text || 'm'
  end;
$$;

create or replace function public.refresh_distances()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.restaurants r
  set distance        = public.distance_km_from_infflux(r.lat, r.lng)::real,
      "distanceLabel" = public.format_distance(
                          public.distance_km_from_infflux(r.lat, r.lng))
  where r.lat is not null
    and r.lng is not null
    and (r.distance is null or r."distanceLabel" is null);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- 2) Distances manquantes ------------------------------------------------------
select public.refresh_distances() as distances_completees;

-- 3) Temps de marche manquants -------------------------------------------------
-- Même repli que le script Node : 5 km/h, majoré de 30 % pour le trottoir réel
-- (≈ 15,6 min/km), minimum 1 minute. Les valeurs venant d'ORS ne sont jamais
-- touchées, puisqu'on ne remplit que les lignes nulles.
update public.restaurants
set walk_minutes = greatest(1, round(distance::numeric * 15.6))::int
where walk_minutes is null
  and distance is not null;

-- 4) Scores ---------------------------------------------------------------------
select public.recalc_relevance();

-- 5) Ce qu'il reste à faire à la main ------------------------------------------
-- Ces restaurants n'ont pas de coordonnées : ils restent invisibles aux
-- non-admins. Soit `node scripts/backfill-coords.mjs` (si l'adresse est
-- géocodable), soit un pin posé depuis le crayon de la fiche.
select name, address, slug
from public.restaurants
where lat is null or lng is null
order by name;

-- Contrôle général :
--   select
--     count(*) filter (where lat is null)                              as sans_coords,
--     count(*) filter (where lat is not null and distance is null)     as sans_distance,
--     count(*) filter (where walk_minutes is null)                     as sans_marche,
--     count(*)                                                         as total
--   from public.restaurants;
