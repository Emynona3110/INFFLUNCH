-- =============================================================================
-- Succès : nouvelles conditions de « Dégustez-les tous » et « Choix cornélien »
-- — 2026-10-04
-- `pokeball` (Dégustez-les tous) : 5 → 6 favoris (une équipe Pokémon). Condition
--   publique (ACHIEVEMENT_GOALS côté front) : rien en base, les détenteurs
--   actuels GARDENT le succès et sa date.
-- `matrix` (Choix cornélien, secret) : « 3 lancers de suite » → « lancer la roue
--   avec 2 restaurants ». Nouvelle condition sans rapport avec l'ancienne : on
--   RÉINITIALISE les obtentions.
--
-- À exécuter APRÈS le déploiement (avant, l'ancien front redébloquerait
-- l'ancienne condition), sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- Idempotent.
-- =============================================================================

begin;

delete from public.user_achievements where achievement_id = 'matrix';

insert into public.achievement_secrets (id, condition) values
  ('matrix', 'Lancer la roue avec 2 restaurants')
on conflict (id) do update set condition = excluded.condition;

commit;
