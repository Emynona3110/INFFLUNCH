-- =============================================================================
-- Contrôle d'inscription — 2026-06-14
-- Réserve la création de compte aux collaborateurs, sans dépendre de l'email
-- (les emails de confirmation tombent en quarantaine M365, tenant non admin).
--
-- 2 barrières, vérifiées côté serveur à l'INSERT dans auth.users :
--   1) l'email doit être @infflux.com
--   2) un code d'accès secret (partagé en interne) doit correspondre
--
-- Le code est passé par le client dans options.data.access_code (signUp) →
-- atterrit dans raw_user_meta_data. Le trigger le valide PUIS le retire des
-- métadonnées (on ne le stocke pas). Le secret est gardé dans un schéma
-- `private` non exposé à l'API Data (illisible via PostgREST).
--
-- ⚠️ La valeur ci-dessous est un PLACEHOLDER. Le vrai code est défini hors git
--    via :  update private.app_secrets set value='<CODE>' where key='signup_access_code';
-- =============================================================================

create schema if not exists private;

create table if not exists private.app_secrets (
  key text primary key,
  value text not null
);

insert into private.app_secrets (key, value)
values ('signup_access_code', 'REMPLACER_CE_CODE')
on conflict (key) do nothing;

create or replace function private.enforce_signup_rules()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  expected_code text;
begin
  -- Barrière 1 : domaine
  if lower(new.email) not like '%@infflux.com' then
    raise exception 'SIGNUP_DOMAIN: adresse non autorisée (réservé à @infflux.com)';
  end if;

  -- Barrière 2 : code d'accès
  select value into expected_code
  from private.app_secrets
  where key = 'signup_access_code';

  if new.raw_user_meta_data->>'access_code' is distinct from expected_code then
    raise exception 'SIGNUP_CODE: code d''accès invalide';
  end if;

  -- Ne pas conserver le code dans les métadonnées de l'utilisateur
  new.raw_user_meta_data = new.raw_user_meta_data - 'access_code';

  return new;
end;
$$;

drop trigger if exists enforce_signup_rules_before_insert on auth.users;
create trigger enforce_signup_rules_before_insert
  before insert on auth.users
  for each row execute function private.enforce_signup_rules();
