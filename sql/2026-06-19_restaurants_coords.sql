-- =============================================================================
-- Coordonnées des restaurants — 2026-06-19
-- Stocke lat/lng pour la minimap des fiches restaurant, afin de NE PLUS
-- géocoder via Nominatim à chaque ouverture de fiche (politique d'usage,
-- lenteur, cache volatil). Le géocodage se fait désormais une seule fois, à
-- l'enregistrement côté admin (RestaurantDialog), et un backfill remplit les
-- restos existants (scripts/backfill-coords.mjs).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

alter table public.restaurants
  add column if not exists lat double precision,
  add column if not exists lng double precision;
