-- =============================================================================
-- Realtime sur feedback — 2026-09-04
-- Sans ça, la boîte de réception « Demandes » de l'admin (et sa puce) n'était
-- rafraîchie qu'au changement d'onglet : une demande envoyée par un collègue
-- n'apparaissait pas toute seule (cf. src/hooks/useFeedback.ts, qui écoute la
-- table via src/hooks/useRealtimeTable.ts).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- La lecture reste protégée par la RLS (chacun ses demandes, tout pour les
-- admins) : Realtime applique les mêmes policies, et côté client on ne fait
-- qu'un refetch sur événement.
-- =============================================================================

-- Ajoute la table à la publication realtime de Supabase (idempotent).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'feedback'
  ) then
    alter publication supabase_realtime add table public.feedback;
  end if;
end $$;
