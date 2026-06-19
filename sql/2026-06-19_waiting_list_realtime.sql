-- =============================================================================
-- Realtime sur waiting_list — 2026-06-19
-- Active la diffusion temps réel des changements de la table waiting_list pour
-- que la section "Demandes" (et la puce navbar) se mettent à jour instantanément
-- sans recharger la page (cf. hook src/hooks/useAccessRequests.ts).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- La lecture reste protégée par la RLS (waiting_list SELECT = admin only) :
-- côté client on ne fait qu'un refetch sur événement, aucune donnée n'est
-- exposée à un non-admin.
-- =============================================================================

-- Ajoute la table à la publication realtime de Supabase (idempotent : ne rien
-- faire si elle y est déjà).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'waiting_list'
  ) then
    alter publication supabase_realtime add table public.waiting_list;
  end if;
end $$;
