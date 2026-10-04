-- =============================================================================
-- Deux succès secrets : « Cowabunga ! » et « Pas de sushi » — 2026-10-04
-- Conditions lisibles une fois le succès débloqué (cf. 2026-09-14).
-- Les obtentions arrivent à l'usage (useLunchToday, FeedbackDialog).
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

insert into public.achievement_secrets (id, condition) values
  ('cowabunga',    'Déjeuner à au moins 4 dans le même restaurant'),
  ('nemo',         'Ouvrir la fenêtre des demandes')
on conflict (id) do update set condition = excluded.condition;

-- « Pas de sushi » rétroactif : qui a déjà soumis une demande l'obtient, daté
-- de sa PREMIÈRE demande. Qui l'a déjà débloqué depuis (en ouvrant la fenêtre)
-- voit sa date ramenée à cette première demande si elle est plus ancienne.
-- Idempotent : à rejouer sans risque.
insert into public.user_achievements (user_id, achievement_id, unlocked_at)
select author_id, 'nemo', min(created_at)
  from public.feedback
 group by author_id
on conflict (user_id, achievement_id) do update
   set unlocked_at = least(public.user_achievements.unlocked_at, excluded.unlocked_at);
