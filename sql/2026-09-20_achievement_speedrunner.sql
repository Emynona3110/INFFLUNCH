-- Succès secret « Speedrunner » : condition hors bundle (table achievement_secrets).
-- Déclenché côté client (useLunchToday) : restaurant choisi avant 8 h, heure de Paris.
insert into public.achievement_secrets (id, condition) values
  ('speedrunner', 'Choisir son restaurant du midi avant 8 h')
on conflict (id) do update set condition = excluded.condition;
