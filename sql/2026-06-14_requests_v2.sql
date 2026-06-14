-- =============================================================================
-- Demandes v2 — 2026-06-14
-- La table waiting_list gère désormais 2 types de demandes (création de compte,
-- réinitialisation de mot de passe) et conserve l'historique (statut via l'enum
-- `state` existant : Waiting / Accepted / Rejected).
-- =============================================================================

-- Type de demande
alter table public.waiting_list
  add column if not exists type text not null default 'creation';

alter table public.waiting_list
  drop constraint if exists waiting_list_type_check;
alter table public.waiting_list
  add constraint waiting_list_type_check check (type in ('creation', 'password_reset'));

-- L'unicité globale sur l'email empêchait l'historique et les demandes répétées.
-- On la remplace par une unicité des seules demandes EN ATTENTE (par email + type).
alter table public.waiting_list
  drop constraint if exists waiting_list_email_key;
drop index if exists waiting_list_pending_unique;
create unique index waiting_list_pending_unique
  on public.waiting_list (email, type)
  where state = 'Waiting';

-- Trigger d'insertion : filtre hors domaine (silencieux) + force le statut à
-- "Waiting" et un type valide (le client ne peut pas injecter Accepted/Rejected).
create or replace function public.filter_waiting_list_domain()
returns trigger
language plpgsql
as $$
begin
  if lower(new.email) not like '%@infflux.com' then
    return null; -- ignoré silencieusement
  end if;
  new.state := 'Waiting';
  if new.type is null or new.type not in ('creation', 'password_reset') then
    new.type := 'creation';
  end if;
  return new;
end;
$$;
-- (le trigger filter_waiting_list_before_insert est déjà attaché)
