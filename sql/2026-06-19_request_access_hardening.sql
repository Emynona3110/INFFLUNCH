-- =============================================================================
-- Durcissement des demandes d'accès — 2026-06-19
-- Option B : Turnstile + Edge Function (request-access) + throttle global en base.
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
--
-- Contexte : avant, waiting_list acceptait un INSERT anonyme direct
-- (policy "Enable insert access for all users" WITH CHECK(true)) → n'importe qui
-- pouvait flooder la table avec des emails @infflux.com aléatoires.
-- Après : l'écriture ne passe plus que par l'Edge Function request-access
-- (service_role, après validation Turnstile). Filet anti-flood en base.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) Plus d'INSERT direct anonyme : seul l'Edge Function (service_role) écrit.
-- -----------------------------------------------------------------------------
drop policy if exists "Enable insert access for all users" on public.waiting_list;
-- (Pas de nouvelle policy INSERT : le service_role contourne la RLS. Aucun
--  rôle anon/authenticated ne peut donc plus insérer directement.)


-- -----------------------------------------------------------------------------
-- 2) Filet anti-flood : throttle GLOBAL des insertions (indépendant de l'IP).
-- -----------------------------------------------------------------------------
-- Refuse si plus de N lignes ont été créées dans la dernière minute.
-- S'applique AUSSI au service_role : le bypass RLS ne contourne pas les triggers
-- → cap dur sur la croissance de la table même si la clé service_role fuit.
-- Indépendant de l'IP → pas de faux positif sur le NAT @infflux.com.
create or replace function public.throttle_waiting_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  max_per_minute constant integer := 30;
begin
  select count(*) into recent_count
  from public.waiting_list
  where created_at > now() - interval '1 minute';

  if recent_count >= max_per_minute then
    raise exception 'WAITING_LIST_THROTTLE: trop de demandes, réessayez plus tard'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Nom volontairement après "filter_..." : le filtre domaine
-- (filter_waiting_list_before_insert) s'exécute en premier (ordre alphabétique)
-- et écarte les emails hors domaine AVANT qu'ils ne comptent dans le throttle.
drop trigger if exists throttle_waiting_list_before_insert on public.waiting_list;
create trigger throttle_waiting_list_before_insert
  before insert on public.waiting_list
  for each row execute function public.throttle_waiting_list();
