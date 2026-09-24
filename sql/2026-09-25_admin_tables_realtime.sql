-- =============================================================================
-- Realtime sur users et tags — 2026-09-25
-- Les tables admin « Utilisateurs » et « Tags » ne se rafraîchissaient qu'au
-- changement d'onglet : un compte créé ou supprimé depuis un autre poste (ou
-- par l'acceptation d'une demande) n'apparaissait pas tout seul. Les deux
-- autres tables admin (waiting_list, feedback) étaient déjà diffusées.
-- Côté client : src/hooks/useUsers.ts et src/admin/AdminTable.tsx, via
-- src/hooks/useRealtimeTable.ts.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- Realtime applique les mêmes policies RLS que la lecture ordinaire, et le
-- client ne fait qu'un refetch sur événement : rien de neuf n'est exposé.
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array['users', 'tags'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
