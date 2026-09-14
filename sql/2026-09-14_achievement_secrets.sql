-- =============================================================================
-- Conditions des succès SECRETS — 2026-09-14
-- Les conditions des succès secrets ne sont plus dans le bundle JS (des
-- collègues les lisaient dans le code du navigateur). Elles vivent ici, et la
-- RLS ne les rend lisibles qu'à ceux qui ont DÉJÀ débloqué le succès.
-- Les intitulés restent en dur côté front (ils s'affichent avant déblocage).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

create table if not exists public.achievement_secrets (
  id        text primary key,
  condition text not null
);

alter table public.achievement_secrets enable row level security;

drop policy if exists "achievement_secrets select unlocked" on public.achievement_secrets;
create policy "achievement_secrets select unlocked"
on public.achievement_secrets for select to authenticated
using (
  exists (
    select 1 from public.user_achievements ua
    where ua.user_id = auth.uid() and ua.achievement_id = achievement_secrets.id
  )
);
-- Pas d'insert/update/delete : édition via le SQL editor uniquement.

insert into public.achievement_secrets (id, condition) values
  ('anti_panurgisme',    'Vous avez trouvé un mouton'),
  ('berger_dun_jour',    'Nourrir un mouton'),
  ('gourou_du_troupeau', 'Nourrir un mouton 20 fois d''affilée'),
  ('indecis',            'Lancer la roue 5 fois de suite'),
  ('de_pipe',            'Lancer la roue avec un seul restaurant'),
  ('jour_nuit',          'Basculer le thème 8 fois d''affilée'),
  ('narcisse',           'Réagir à sa propre photo')
on conflict (id) do update set condition = excluded.condition;
