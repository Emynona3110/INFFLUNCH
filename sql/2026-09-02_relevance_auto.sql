-- =============================================================================
-- Pertinence recalculée automatiquement quand une distance change — 2026-09-02
-- ⚠️ À exécuter APRÈS `2026-09-02_pertinence_distance.sql`.
--
-- Le problème : `restaurants.relevance` n'était réécrit que par les triggers
-- des avis et des favoris. Écrire une `distance` (géocodage, backfill, pin posé
-- à la main dans l'admin) ne recalculait rien — d'où des scores qui restaient
-- figés à 64,00 alors que les distances étaient bien en base.
--
-- On branche donc le même wrapper `tg_recalc_relevance()` sur `restaurants`.
-- Comme `recalc_relevance()` écrit dans cette même table, il faut une garde
-- anti-récursion : `pg_trigger_depth() > 1` → on ne fait rien. Sans elle, le
-- recalcul se redéclencherait lui-même jusqu'à l'erreur de pile.
--
-- `walk_minutes` n'est VOLONTAIREMENT pas dans la liste des colonnes
-- surveillées : le temps de marche n'entre plus dans le score (proximité
-- calculée sur la distance), il ne sert plus qu'à l'affichage.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Wrapper : même fonction qu'en 2026-06-20, avec la garde anti-récursion ---
-- Les triggers existants (`trg_reviews_relevance`, `trg_favorites_relevance`)
-- continuent de l'utiliser sans changement de comportement : ils s'exécutent au
-- premier niveau, la garde ne les concerne pas.
create or replace function public.tg_recalc_relevance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Appelé en cascade depuis le UPDATE de recalc_relevance() lui-même :
  -- on sort tout de suite, le calcul est déjà en cours.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  perform public.recalc_relevance();
  return null;
end;
$$;

-- 2) Branchement sur les restaurants ------------------------------------------
-- Statement-level : une seule passe par requête, même pour un import de 90
-- lignes. Colonnes surveillées = celles qui entrent dans le score.
drop trigger if exists trg_restaurants_relevance on public.restaurants;
create trigger trg_restaurants_relevance
after insert or delete or update of distance, rating, reviews
on public.restaurants
for each statement execute function public.tg_recalc_relevance();

-- 3) Remise à niveau immédiate --------------------------------------------------
select public.recalc_relevance();

-- Contrôles :
--   -- le score stocké doit désormais coller au score calculé, partout :
--   select name, distance_km, proximity_01, score, relevance_stockee
--   from public.relevance_components
--   where score is distinct from relevance_stockee
--   order by name;   -- doit renvoyer 0 ligne
--
--   -- vérifier que le déclenchement marche : poser une distance à la main
--   -- (dans une transaction annulée, pour ne rien casser)
--   begin;
--     update public.restaurants set distance = distance where id = (
--       select id from public.restaurants where distance is not null limit 1
--     );
--     select count(*) from public.relevance_components
--     where score is distinct from relevance_stockee;   -- 0
--   rollback;
