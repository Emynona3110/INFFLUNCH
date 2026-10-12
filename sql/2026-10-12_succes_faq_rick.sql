-- =============================================================================
-- Deux succès secrets — 2026-10-12
--   faq_all_open      « Tiré par les cheveux »     (Rémy, Ratatouille)
--   leaderboard_rick  « Rickroll »                 (Rick Astley)
-- Conditions hors bundle (cf. 2026-09-14_achievement_secrets.sql) : lisibles
-- seulement une fois le succès débloqué. Rien d'autre à créer : les obtentions
-- vont dans user_achievements comme les autres.
-- Idempotent : à rejouer sans risque.
-- =============================================================================

insert into public.achievement_secrets (id, condition) values
  ('faq_all_open',     'Ouvrir toutes les questions de la FAQ'),
  ('leaderboard_rick', 'Retrouver Rick Astley dans le classement')
on conflict (id) do update set condition = excluded.condition;
