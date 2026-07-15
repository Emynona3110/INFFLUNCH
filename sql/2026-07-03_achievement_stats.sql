-- =============================================================================
-- Statistiques globales de succès (style Steam) — 2026-07-03
-- Renvoie, par succès, le POURCENTAGE d'utilisateurs l'ayant débloqué.
-- La table user_achievements est en RLS « own-read » : impossible de compter les
-- autres users côté client. On expose donc UNIQUEMENT l'agrégat via une fonction
-- SECURITY DEFINER (aucune identité divulguée → sûr).
--
-- Dénominateur = nombre total d'utilisateurs (table public.users).
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

create or replace function public.achievement_stats()
returns table (achievement_id text, percent real)
language sql
security definer
set search_path = public
as $$
  select ua.achievement_id,
         (count(distinct ua.user_id)::real
            / nullif((select count(*) from public.users), 0) * 100)::real as percent
  from public.user_achievements ua
  group by ua.achievement_id;
$$;

-- Seuls les utilisateurs authentifiés peuvent lire les stats.
revoke all on function public.achievement_stats() from public;
grant execute on function public.achievement_stats() to authenticated;
