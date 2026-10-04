-- =============================================================================
-- Succès secret « Le Seigneur des agneaux » — 2026-10-04
-- Easter egg mouton (Beeeh) : 1 chance sur 100, à partir du deuxième clic, que
-- le mouton fasse tomber l'Anneau unique au lieu d'une nourriture ; l'attraper
-- débloque le succès. Nouveau : rien à reprendre dans user_achievements.
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Idempotent.
-- =============================================================================

insert into public.achievement_secrets (id, condition) values
  ('seigneur_des_anneaux', 'Attraper l''Anneau unique du mouton')
on conflict (id) do update set condition = excluded.condition;
