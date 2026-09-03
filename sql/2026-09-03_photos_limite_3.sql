-- Limite de photos par personne et par restaurant : 1 → 3 -----------------------
-- Remplace le trigger posé par sql/2026-06-20_restaurant_photos.sql. Le nom de
-- la fonction reste `enforce_one_photo_per_user` (le trigger y fait référence) ;
-- seule la règle change. Les admins restent exemptés, et l'exemption porte
-- toujours sur l'UPLOADEUR réel (auth.uid()), pas sur l'auteur attribué.

create or replace function public.enforce_one_photo_per_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_photos constant int := 3;
  already int;
begin
  if exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) then
    return new;
  end if;

  select count(*) into already
  from public.restaurant_photos
  where restaurant_id = new.restaurant_id and user_id = new.user_id;

  if already >= max_photos then
    raise exception 'Maximum % photos par personne et par restaurant', max_photos
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
