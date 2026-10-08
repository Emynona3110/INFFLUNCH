-- Nom affiché et trigramme stockés dans public.users — 2026-10-08
-- Jusqu'ici recalculés côté client depuis l'email (src/utils/authorName.ts) :
-- impossible de départager deux trigrammes identiques ou de corriger un nom.
-- Désormais calculés à la création du compte (même règle que le front), puis
-- modifiables par un admin. Vider un champ le recalcule depuis l'email.

alter table public.users
  add column if not exists display_name text,
  add column if not exists trigram      text;

-- « cdubois@infflux.com » → « C.Dubois » (miroir de formatAuthorName).
create or replace function public.default_display_name(p_email text)
returns text
language sql
immutable
as $$
  select case
           when p_email is null then null
           when l = '' then p_email
           else upper(left(l, 1)) || '.' || upper(substr(l, 2, 1)) || substr(l, 3)
         end
    from (select split_part(coalesce(p_email, ''), '@', 1) as l) s;
$$;

-- « cdubois » → « CDS » : initiale du prénom, 1re et dernière lettre du nom
-- (miroir de authorTrigram).
create or replace function public.default_trigram(p_email text)
returns text
language sql
immutable
as $$
  select case
           when p_email is null then null
           else upper(left(l, 1) || substr(l, 2, 1)
                      || case when length(l) > 2 then right(l, 1) else '' end)
         end
    from (select split_part(coalesce(p_email, ''), '@', 1) as l) s;
$$;

-- Remplit (ou recalcule si vidé) à l'insertion comme à chaque mise à jour ;
-- le trigramme est normalisé en majuscules.
create or replace function public.users_fill_names()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.display_name := nullif(btrim(new.display_name), '');
  new.trigram      := upper(nullif(btrim(new.trigram), ''));
  if new.display_name is null then
    new.display_name := public.default_display_name(new.email);
  end if;
  if new.trigram is null then
    new.trigram := public.default_trigram(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_users_fill_names on public.users;
create trigger trigger_users_fill_names
  before insert or update of display_name, trigram, email on public.users
  for each row execute function public.users_fill_names();

-- Comptes existants.
update public.users
   set display_name = public.default_display_name(email),
       trigram      = public.default_trigram(email)
 where display_name is null or trigram is null;

alter table public.users
  drop constraint if exists users_display_name_len,
  add  constraint users_display_name_len check (char_length(display_name) <= 60),
  drop constraint if exists users_trigram_len,
  add  constraint users_trigram_len check (char_length(trigram) between 1 and 4);

-- Table admin : la rpc rend aussi les deux champs (type de retour modifié →
-- drop préalable).
drop function if exists public.admin_users();
create function public.admin_users()
returns table (
  id           uuid,
  email        text,
  role         text,
  created_at   timestamptz,
  display_name text,
  trigram      text
)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email, u.role::text, au.created_at, u.display_name, u.trigram
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

-- Mise à jour : la policy « Enable update for admins only » existante suffit.
