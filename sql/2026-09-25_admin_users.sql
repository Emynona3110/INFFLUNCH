-- Liste des utilisateurs pour la table admin, avec leur date d'inscription.
-- Celle-ci vit dans auth.users.created_at, inaccessible au client (et
-- profiles.created_at ne date que du premier passage sur « Mon compte ») :
-- d'où une fonction SECURITY DEFINER, comme public_profile.
-- Réservée aux admins : un non-admin n'obtient aucune ligne.

create or replace function public.admin_users()
returns table (
  id         uuid,
  email      text,
  role       text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email, u.role::text, au.created_at
    from public.users u
    join auth.users au on au.id = u.id
   where exists (
     select 1 from public.users me
      where me.id = auth.uid() and me.role = 'admin'
   )
   order by u.email;
$$;

revoke all on function public.admin_users() from public;
grant execute on function public.admin_users() to authenticated;
