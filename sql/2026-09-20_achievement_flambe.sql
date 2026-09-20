-- Succès secret « Flambé » : condition hors bundle (table achievement_secrets).
-- Seuil (10 jours ouvrés d'affilée) dans useAchievementTriggers.
insert into public.achievement_secrets (id, condition) values
  ('flambe', 'Déclarer son midi 10 jours ouvrés d''affilée')
on conflict (id) do update set condition = excluded.condition;
