-- =============================================================================
-- Chasse aux bonbons d'Halloween 2026 + trophées — 2026-10-17
-- Quatre bonbons cachés sur le site pendant Halloween 2026 SEULEMENT
-- (src/events/halloween). Les trouver tous donne le trophée « Trick or
-- Treat », À PART des succès (aucune incidence sur « Banquet final »),
-- affiché sur le profil.
--
-- event_candies : une ligne par bonbon trouvé. Chacun ne lit et n'écrit que
--   les siennes ; il peut aussi les effacer (remise à zéro depuis
--   Admin › Évènements, pour tester).
-- user_trophies : trophées obtenus, lisibles par tous (profils) à partir du
--   début de leur évènement (avant : par leur propriétaire seulement). Personne ne
--   les écrit directement : le 4e bonbon les décerne (trigger). Le
--   propriétaire peut effacer les siens (même remise à zéro de test).
--
-- Le front reste débranché tant que `CANDIES_DB` vaut false
-- (src/events/candiesDb.ts) : passer à true APRÈS avoir joué ce script.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Rejouable.
-- =============================================================================

-- 1) Bonbons trouvés -----------------------------------------------------------
create table if not exists public.event_candies (
  user_id  uuid not null default auth.uid()
           references auth.users(id) on delete cascade,
  event_id text not null check (event_id in ('halloween')),
  season   int  not null check (season = 2026),
  candy_id text not null
           check (candy_id in ('papillote', 'sucette', 'menthe', 'mais')),
  found_at timestamptz not null default now(),
  primary key (user_id, event_id, season, candy_id)
);

alter table public.event_candies enable row level security;

drop policy if exists "event candies select own" on public.event_candies;
create policy "event candies select own"
on public.event_candies for select to authenticated
using (user_id = auth.uid());

drop policy if exists "event candies insert own" on public.event_candies;
create policy "event candies insert own"
on public.event_candies for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "event candies delete own" on public.event_candies;
create policy "event candies delete own"
on public.event_candies for delete to authenticated
using (user_id = auth.uid());

-- 2) Trophées ------------------------------------------------------------------
create table if not exists public.user_trophies (
  user_id   uuid not null references auth.users(id) on delete cascade,
  trophy_id text not null check (trophy_id in ('halloween_2026_candies')),
  earned_at timestamptz not null default now(),
  primary key (user_id, trophy_id)
);

alter table public.user_trophies enable row level security;

-- Lisible par tous, mais chez les autres seulement à partir du début de son
-- évènement (un trophée obtenu avant, en test, reste privé). Même règle côté
-- front (src/data/trophies.ts, visibleFrom).
drop policy if exists "user trophies select all" on public.user_trophies;
drop policy if exists "user trophies select own or started" on public.user_trophies;
create policy "user trophies select own or started"
on public.user_trophies for select to authenticated
using (
  user_id = auth.uid()
  or (trophy_id = 'halloween_2026_candies'
      and now() >= timestamptz '2026-10-21 00:00:00 Europe/Paris')
);

drop policy if exists "user trophies delete own" on public.user_trophies;
create policy "user trophies delete own"
on public.user_trophies for delete to authenticated
using (user_id = auth.uid());

-- 3) Le 4e bonbon décerne le trophée -------------------------------------------
create or replace function public.award_candy_trophy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_id = 'halloween' and new.season = 2026 and (
    select count(distinct candy_id) from public.event_candies
    where user_id = new.user_id and event_id = 'halloween' and season = 2026
  ) = 4 then
    insert into public.user_trophies (user_id, trophy_id)
    values (new.user_id, 'halloween_2026_candies')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists event_candies_award_trophy on public.event_candies;
create trigger event_candies_award_trophy
after insert on public.event_candies
for each row execute function public.award_candy_trophy();
