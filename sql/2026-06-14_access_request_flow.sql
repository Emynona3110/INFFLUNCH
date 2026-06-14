-- =============================================================================
-- Flux "demande d'accès + provisioning admin" — 2026-06-14
-- Remplace l'auto-inscription par code (cf. 2026-06-14_signup_guard.sql, abandonné).
--
-- Nouveau modèle :
--   - un visiteur dépose une DEMANDE d'accès (email seul) dans waiting_list
--   - un admin crée le compte (Edge Function) + transmet un mot de passe temporaire
--   - l'utilisateur change son mot de passe à la 1ère connexion
-- =============================================================================

-- 1) Garde d'inscription : on ne conserve QUE la barrière domaine.
--    (Les comptes sont créés par l'admin via service_role, sans code d'accès.)
create or replace function private.enforce_signup_rules()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
begin
  if lower(new.email) not like '%@infflux.com' then
    raise exception 'SIGNUP_DOMAIN: adresse non autorisée (réservé à @infflux.com)';
  end if;
  return new;
end;
$$;
-- le trigger enforce_signup_rules_before_insert (sur auth.users) reste en place.

-- 2) Le secret de code d'accès n'est plus utilisé.
drop table if exists private.app_secrets;

-- 3) Demande d'accès : filtrage SILENCIEUX des emails hors domaine.
--    RETURN NULL => la ligne n'est pas insérée, sans erreur => le front affiche
--    un succès dans tous les cas (anti-énumération).
create or replace function public.filter_waiting_list_domain()
returns trigger
language plpgsql
as $$
begin
  if lower(new.email) not like '%@infflux.com' then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists filter_waiting_list_before_insert on public.waiting_list;
create trigger filter_waiting_list_before_insert
  before insert on public.waiting_list
  for each row execute function public.filter_waiting_list_domain();
