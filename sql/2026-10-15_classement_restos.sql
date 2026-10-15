-- =============================================================================
-- Classement des restaurants — 2026-10-15
-- Page /classement, bascule « Restaurants » : une ligne par resto, avec ses
-- compteurs sur la période choisie (mêmes règles que public.leaderboard) :
--   - midis déclarés chez lui (jours de semaine seulement) ;
--   - avis et photos publiés ;
--   - favoris : le nombre ACTUEL de collègues qui l'ont en favori, quelle
--     que soit la période (favorites n'a pas de date).
-- Le compte test ne compte pas, le resto de test est écarté. Mois passé : pas
-- les restos ajoutés après sa fin (comme les inscrits du classement des
-- collègues). Les fermés restent : ils ont un historique.
-- Agrégats seulement (SECURITY DEFINER : lunch_plans et favorites ne sont pas
-- lisibles en entier par chacun) — jamais qui ni quand.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- Signature de retour modifiée depuis la 1re version (note → favoris).
drop function if exists public.restaurant_leaderboard(text);

create or replace function public.restaurant_leaderboard(period text)
returns table (
  id       bigint,
  slug     text,
  name     text,
  image    text,
  closed   boolean,
  favorites integer,
  reviews  integer,
  photos   integer,
  lunches  integer
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
  ),
  test_user as (
    select u.id from public.users u where u.email = 'test@infflux.com'
  )
  select
    r.id,
    r.slug,
    r.name::text,
    r.image,
    coalesce(r.closed, false),
    (select count(*)::int from public.favorites f
      where f.restaurant_id = r.id
        and f.user_id not in (select id from test_user)),
    (select count(*)::int from public.reviews rv
      where rv.restaurant_id = r.id
        and rv.user_id not in (select id from test_user)
        and (b.since is null
             or (rv.created_at >= b.since and rv.created_at < b.until))),
    (select count(*)::int from public.restaurant_photos ph
      where ph.restaurant_id = r.id
        and ph.user_id not in (select id from test_user)
        and (b.since is null
             or (ph.created_at >= b.since and ph.created_at < b.until))),
    (select count(*)::int from public.lunch_plans lp
      where lp.restaurant_id = r.id
        and lp.user_id not in (select id from test_user)
        and extract(isodow from lp.day) < 6
        and (b.since_day is null
             or (lp.day >= b.since_day and lp.day < b.until_day)))
  from public.restaurants r
  cross join b
  where coalesce(r.slug, '') <> 'test'
    -- Mois passé : pas ceux ajoutés après.
    and (b.until is null or r.created_at < b.until);
$$;

revoke all on function public.restaurant_leaderboard(text) from public, anon;
grant execute on function public.restaurant_leaderboard(text) to authenticated;

-- Contrôle :
--   select name, lunches, reviews, photos, favorites
--     from public.restaurant_leaderboard('2026-10') order by lunches desc;
