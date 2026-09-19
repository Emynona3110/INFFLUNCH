-- Succès secret « Shooting Stars » : condition hors bundle (table achievement_secrets).
insert into public.achievement_secrets (id, condition) values
  ('shooting_stars', 'Faire filer les étoiles d''un restaurant')
on conflict (id) do update set condition = excluded.condition;
