-- Profil public d'un collaborateur : ce que n'importe quel utilisateur connecté
-- peut voir de n'importe quel autre. Une seule fonction SECURITY DEFINER, qui
-- ne rend que le strict nécessaire :
--   - la date d'inscription vient d'auth.users (inaccessible au client, et
--     profiles.created_at ne date que du premier passage sur « Mon compte ») ;
--   - les succès des autres restent protégés par leur RLS (select own) : on
--     ne les livre qu'agrégés ici, sans ouvrir la table.
-- Les photos, elles, sont lues normalement (RLS déjà ouverte à tous).

create or replace function public.public_profile(target uuid)
returns table (
  email          text,
  avatar_path    text,
  member_since   timestamptz,
  reviews_count  integer,
  photos_count   integer,
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
