-- =============================================================================
-- Paliers revus — 2026-10-05 (stonks, absolute_cinema, naruto)
--   stonks          « Du beurre dans les épinards » : 5 -> 10 prix déclarés.
--                   Retiré à qui en a déclaré moins de 10 (décision du user,
--                   exception assumée à « un succès ne s'annule jamais »).
--   absolute_cinema « Du grand art » : 20 -> 10 photos différentes réagies.
--                   Daté de la 10e photo réagie (première réaction posée sur
--                   chaque photo, comme la métrique du front) : recalé chez
--                   ceux qui l'avaient, créé chez ceux qui atteignent 10.
--   naruto          « Ramen ta science » : 20 -> 15 avis publiés.
--                   Même règle : daté du 15e avis, recalé ou créé.
--
-- À exécuter APRÈS le déploiement : avant, l'ancien front redébloquerait
-- stonks dès 5 prix. Entre le déploiement et ce script, le nouveau front peut
-- débloquer absolute_cinema / naruto datés du jour : le recalage ci-dessous le
-- corrige.
-- Idempotent : à rejouer sans risque.
-- =============================================================================

begin;

-- 1) stonks : moins de 10 prix déclarés -> retiré.
delete from public.user_achievements ua
 where ua.achievement_id = 'stonks'
   and (select count(*) from public.restaurant_prices p
         where p.user_id = ua.user_id) < 10;

-- 2) Dates de palier : 10e photo DIFFÉRENTE réagie (absolute_cinema), 15e avis
--    publié (naruto).
create temporary table palier_truth on commit drop as
with targets as (
  select user_id, target_id, min(created_at) as created_at
    from public.reactions
   where target_type = 'photo'
   group by user_id, target_id),
targets_n as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at) n
    from targets),
revs as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at) n
    from public.reviews)
          select user_id, 'absolute_cinema' as achievement_id, created_at as at
            from targets_n where n = 10
union all select user_id, 'naruto', created_at from revs where n = 15;

-- Recaler les lignes existantes (anciennement datées du palier précédent, ou
-- du jour si le nouveau front l'a débloqué avant ce script).
update public.user_achievements ua
   set unlocked_at = t.at
  from palier_truth t
 where ua.user_id = t.user_id
   and ua.achievement_id = t.achievement_id
   and ua.unlocked_at <> t.at;

-- Créer, à la bonne date, celles qui manquent.
insert into public.user_achievements (user_id, achievement_id, unlocked_at)
select user_id, achievement_id, at from palier_truth
on conflict (user_id, achievement_id) do nothing;

commit;
