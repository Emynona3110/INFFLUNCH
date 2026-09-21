-- Succès secret « Cookie » : condition hors bundle (table achievement_secrets).
-- Déclenché côté client (CookieWord, page confidentialité) : un clic sur le mot
-- « cookie » — le seul du site.
insert into public.achievement_secrets (id, condition) values
  ('cookie', 'Manger le seul cookie du site')
on conflict (id) do update set condition = excluded.condition;
