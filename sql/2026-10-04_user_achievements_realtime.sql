-- =============================================================================
-- Realtime sur user_achievements — 2026-10-04
-- Un succès débloqué apparaît aussitôt dans la galerie « Succès » et la
-- section Succès du profil, y compris sur un autre appareil ou onglet
-- (src/hooks/useAchievements.ts, via src/hooks/useRealtimeTable.ts).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- Realtime applique la RLS (select own) : chacun ne reçoit que ses lignes.
-- =============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_achievements'
  ) then
    alter publication supabase_realtime add table public.user_achievements;
  end if;
end $$;
