-- Classement par mois : sans les inscrits d'après — 2026-10-08
-- Un mois passé n'affiche plus les collègues inscrits après sa fin (ils y
-- figuraient avec des tirets). Inscription = auth.users.created_at, comme la
-- table admin. « Depuis toujours » : tout le monde, inchangé.
-- Même signature : create or replace suffit.

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
  join auth.users au on au.id = u.id
  left join public.profiles p on p.id = u.id
  where u.email <> 'test@infflux.com'
    -- Mois passé : pas ceux qui se sont inscrits après.
    and (b.until is null or au.created_at < b.until);
$$;

revoke all on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;
