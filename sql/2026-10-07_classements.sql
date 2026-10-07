-- =============================================================================
-- Classements — 2026-10-07
-- Page /classement : une ligne par collègue, avec ses compteurs sur la
-- période choisie. `user_achievements` n'est lisible que pour ses propres
-- lignes (RLS) : cette fonction SECURITY DEFINER renvoie des AGRÉGATS (et les
-- ids des succès, pour que le client écarte ceux hors catalogue et fusionne
-- les anciens ids) — jamais de date ni de contenu.
--
-- Période : un mois CALENDAIRE au format 'AAAA-MM' (heure de Paris, du 1er
-- 00h00 au 1er du mois suivant), toute autre valeur = depuis toujours.
-- leaderboard_first_month() donne le premier mois ayant du contenu : le
-- sélecteur de mois du client s'arrête là.
-- Midis : jours de semaine seulement, comme public_profile(). La série
-- (lunch_streak, en cours quelle que soit la période) sert à l'effet de
-- flamme sur la pp, pas de colonne.
-- Le compte test est écarté, comme dans achievement_stats().
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- Signature de retour modifiée depuis la 1re version : on repart de zéro.
drop function if exists public.leaderboard(text);

create or replace function public.leaderboard(period text)
returns table (
  user_id       uuid,
  email         text,
  avatar_path   text,
  achievements  text[],
  reviews       integer,
  photos        integer,
  lunches       integer,
  streak        integer
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select case when period ~ '^\d{4}-\d{2}$'
             then to_timestamp(period || '-01', 'YYYY-MM-DD')::timestamp
           end as local_start
  ),
  b as (
    select (local_start at time zone 'Europe/Paris') as since,
           ((local_start + interval '1 month') at time zone 'Europe/Paris') as until,
           local_start::date as since_day,
           (local_start + interval '1 month')::date as until_day
    from bounds
  )
  select
    u.id,
    u.email,
    p.avatar_path,
    coalesce(
      (select array_agg(ua.achievement_id)
         from public.user_achievements ua
        where ua.user_id = u.id
          and (b.since is null
               or (ua.unlocked_at >= b.since and ua.unlocked_at < b.until))),
      '{}'
    ),
    (select count(*)::int from public.reviews r
      where r.user_id = u.id
        and (b.since is null
             or (r.created_at >= b.since and r.created_at < b.until))),
    (select count(*)::int from public.restaurant_photos ph
      where ph.user_id = u.id
        and (b.since is null
             or (ph.created_at >= b.since and ph.created_at < b.until))),
    (select count(*)::int from public.lunch_plans lp
      where lp.user_id = u.id
        and extract(isodow from lp.day) < 6
        and (b.since_day is null
             or (lp.day >= b.since_day and lp.day < b.until_day))),
    public.lunch_streak(u.id)
  from public.users u
  cross join b
  left join public.profiles p on p.id = u.id
  where u.email <> 'test@infflux.com';
$$;

revoke all on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;

-- Premier mois (1er jour, heure de Paris) où l'un des compteurs du classement
-- a du contenu ; null si rien du tout.
create or replace function public.leaderboard_first_month()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc('month', min(t))::date
  from (
    select min(ua.unlocked_at at time zone 'Europe/Paris') as t
      from public.user_achievements ua
      join public.users u on u.id = ua.user_id
     where u.email <> 'test@infflux.com'
    union all
    select min(r.created_at at time zone 'Europe/Paris')
      from public.reviews r
      join public.users u on u.id = r.user_id
     where u.email <> 'test@infflux.com'
    union all
    select min(ph.created_at at time zone 'Europe/Paris')
      from public.restaurant_photos ph
      join public.users u on u.id = ph.user_id
     where u.email <> 'test@infflux.com'
    union all
    select min(lp.day)::timestamp
      from public.lunch_plans lp
      join public.users u on u.id = lp.user_id
     where u.email <> 'test@infflux.com'
       and extract(isodow from lp.day) < 6
  ) firsts;
$$;

revoke all on function public.leaderboard_first_month() from public, anon;
grant execute on function public.leaderboard_first_month() to authenticated;

-- Temps réel ------------------------------------------------------------------
-- La page se met à jour sur tout changement des tables comptées (client :
-- src/sections/Leaderboard.tsx via useRealtimeTable). lunch_plans et
-- user_achievements sont déjà diffusées ; on ajoute avis et photos.
-- replica identity full : sans elle, un DELETE ne transporte que la clé, et
-- Realtime ne peut pas vérifier la RLS — les suppressions ne seraient pas
-- diffusées (même raison que pour lunch_plans).
-- Realtime applique la RLS de lecture, et le client ne fait qu'un refetch :
-- rien de neuf n'est exposé.
alter table public.reviews replica identity full;
alter table public.restaurant_photos replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array['reviews', 'restaurant_photos'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Contrôle :
--   select email, cardinality(achievements), reviews, photos, lunches, streak
--     from public.leaderboard('2026-10') order by 2 desc;
--   select public.leaderboard_first_month();
