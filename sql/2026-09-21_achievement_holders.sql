-- =============================================================================
-- Qui a débloqué un succès — 2026-09-21
-- Cliquer sur un succès (galerie de Mon compte, profil d'un collègue) ouvre une
-- popup qui liste les collègues l'ayant obtenu. `user_achievements` n'est
-- lisible que pour ses propres lignes (RLS) : cette fonction SECURITY DEFINER
-- renvoie, pour UN succès, la liste des détenteurs (les plus récents en
-- premier) — et rien d'autre.
-- Le compte test est écarté, comme dans achievement_stats().
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

create or replace function public.achievement_holders(achievement text)
returns table (
  user_id     uuid,
  email       text,
  avatar_path text,
  unlocked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ua.user_id, u.email, p.avatar_path, ua.unlocked_at
  from public.user_achievements ua
  join public.users u on u.id = ua.user_id
  left join public.profiles p on p.id = ua.user_id
  where ua.achievement_id = achievement
    and u.email <> 'test@infflux.com'
  order by ua.unlocked_at desc;
$$;

revoke all on function public.achievement_holders(text) from public;
grant execute on function public.achievement_holders(text) to authenticated;
