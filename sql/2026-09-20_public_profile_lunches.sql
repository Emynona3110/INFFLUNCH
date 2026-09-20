-- Profil public : nombre de midis déclarés (« Qui déjeune où »). On compte les
-- jours de semaine où la personne a indiqué son restaurant OU « pas au
-- restaurant » (restaurant_id null) ; les week-ends sont exclus (personne ne
-- déjeune au bureau, une déclaration ce jour-là est un test ou une erreur).
-- Remplace la fonction de sql/2026-09-14_public_profile.sql (colonnes ajoutées).
--
-- Série (« streak ») : nombre de jours OUVRÉS consécutifs avec une déclaration,
-- arrêtée au DERNIER JOUR OUVRÉ ÉCOULÉ. La déclaration du jour ne compte qu'à
-- minuit (heure de Paris) : la série s'incrémente à 00h00, pas au clic.
-- Vendredi → lundi compte comme consécutif (samedi/dimanche sautés). Si le
-- dernier jour ouvré écoulé n'a pas de déclaration, la série est à 0.
-- 0 ou 1 = pas de série à afficher.

create or replace function public.lunch_streak(target uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    -- Dernier jour ouvré strictement avant aujourd'hui (heure de Paris) :
    -- lundi → vendredi, samedi/dimanche → vendredi, sinon → la veille.
    select
      case extract(isodow from today)::int
        when 1 then today - 3
        when 7 then today - 2
        else today - 1
      end as prev
    from (select (now() at time zone 'Europe/Paris')::date as today) t
  ),
  -- Indice « jour ouvré » : le nombre de jours depuis un lundi de référence,
  -- moins 2 par semaine écoulée ; deux jours ouvrés qui se suivent (samedi et
  -- dimanche sautés) ont des indices consécutifs.
  days as (
    select distinct
      (lp.day - date '2024-01-01') - 2 * ((lp.day - date '2024-01-01') / 7) as n
    from public.lunch_plans lp, params
    where lp.user_id = target
      and extract(isodow from lp.day) < 6
      and lp.day <= params.prev
  ),
  -- Îlots de jours consécutifs (gaps and islands).
  islands as (
    select n, n - row_number() over (order by n) as grp from days
  ),
  last_island as (
    select max(n) as last_n, count(*)::int as len
    from islands
    where grp = (select grp from islands order by n desc limit 1)
  )
  -- Vivante seulement si elle inclut le dernier jour ouvré écoulé.
  select coalesce(
    (select len
       from last_island, params
       where last_n = (params.prev - date '2024-01-01')
                      - 2 * ((params.prev - date '2024-01-01') / 7)),
    0);
$$;

revoke all on function public.lunch_streak(uuid) from public;
grant execute on function public.lunch_streak(uuid) to authenticated;

drop function if exists public.public_profile(uuid);

create or replace function public.public_profile(target uuid)
returns table (
  email          text,
  avatar_path    text,
  member_since   timestamptz,
  reviews_count  integer,
  photos_count   integer,
  lunches_count  integer,
  lunch_streak   integer,
  achievements   jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    u.email,
    p.avatar_path,
    au.created_at as member_since,
    (select count(*)::int from public.reviews r where r.user_id = target) as reviews_count,
    (select count(*)::int from public.restaurant_photos ph where ph.user_id = target) as photos_count,
    (select count(*)::int from public.lunch_plans lp
       where lp.user_id = target
         and extract(isodow from lp.day) < 6) as lunches_count,
    public.lunch_streak(target) as lunch_streak,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
                 'achievement_id', ua.achievement_id,
                 'unlocked_at', ua.unlocked_at)
               order by ua.unlocked_at)
         from public.user_achievements ua where ua.user_id = target),
      '[]'::jsonb
    ) as achievements
  from public.users u
  join auth.users au on au.id = u.id
  left join public.profiles p on p.id = u.id
  where u.id = target;
$$;

revoke all on function public.public_profile(uuid) from public;
grant execute on function public.public_profile(uuid) to authenticated;
