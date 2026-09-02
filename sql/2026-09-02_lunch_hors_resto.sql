-- =============================================================================
-- Déjeuner « pas au restaurant » — 2026-09-02
-- Gamelle, télétravail, déjeuner sauté… : peu importe la raison, l'application
-- n'a besoin que de savoir qu'on ne mange pas au restaurant aujourd'hui. On
-- garde donc UNE seule intention par personne et par jour (la clé primaire
-- user_id + day fait toujours foi) et on rend simplement `restaurant_id`
-- facultatif : une ligne sans restaurant = « pas au resto ce midi ».
--
-- Pas de nouvelle table, pas de colonne de type, et surtout pas de faux
-- restaurants « Gamelle » / « Télétravail » qui pollueraient la liste, la
-- carte, la roue et les notes.
--
-- Les policies RLS sont inchangées (chacun n'écrit que sa propre ligne), la
-- publication Realtime aussi.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

alter table public.lunch_plans
  alter column restaurant_id drop not null;

comment on column public.lunch_plans.restaurant_id is
  'Restaurant du jour. NULL = la personne a déclaré ne pas manger au restaurant.';

-- Contrôle :
--   select day, count(*) filter (where restaurant_id is not null) as au_resto,
--          count(*) filter (where restaurant_id is null)          as hors_resto
--   from public.lunch_plans
--   group by day
--   order by day desc;
