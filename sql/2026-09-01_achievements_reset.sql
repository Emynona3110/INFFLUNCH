-- =============================================================================
-- Reverrouiller ses propres succès (admin) — 2026-09-01
-- La table `user_achievements` n'avait ni update ni delete : un succès était
-- définitif (reset = SQL manuel). On ouvre un DELETE strictement limité à
--   * ses PROPRES lignes (user_id = auth.uid()) ;
--   * et aux comptes admin (public.users.role = 'admin'),
-- pour la corbeille posée sur CHAQUE succès débloqué de la galerie « Succès »
-- (outil de test : refaire apparaître les toasts et la future pastille
-- « non vus », un succès à la fois).
-- Personne ne peut effacer les succès d'un autre utilisateur.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

drop policy if exists "user_achievements delete own admin" on public.user_achievements;
create policy "user_achievements delete own admin"
on public.user_achievements for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);
