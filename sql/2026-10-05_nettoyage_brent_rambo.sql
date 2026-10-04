-- =============================================================================
-- Nettoyage après sql/2026-10-05_succes_louvre_cesar.sql — 2026-10-05
-- Ce script a été joué AVANT le déploiement du front. Dans l'intervalle,
-- l'ancien front (pour qui brent_rambo = « réagir à une photo ») a pu
-- redébloquer brent_rambo, daté du jour, chez ceux qui avaient réagi — alors
-- que brent_rambo veut désormais dire « 5 réactions reçues ».
--
-- Ces lignes parasites se reconnaissent sans ambiguïté :
--   - créées APRÈS le passage du script de renommage (public.sql_runs) ;
--   - brent_rambo est désactivé dans le nouveau front, qui n'en crée aucune ;
--   - les vraies « 5 réactions reçues » (ex-approuve) gardent leur date
--     d'origine, forcément antérieure.
-- On ne les supprime que si la personne a bien jules_cesar (son vrai succès
-- « réagir à une photo »), par sécurité.
--
-- À exécuter UNE FOIS le nouveau front déployé (sinon l'ancien en recrée).
-- Idempotent : à rejouer sans risque.
-- =============================================================================

-- Aperçu : lignes qui vont partir.
select ua.user_id, ua.unlocked_at
from public.user_achievements ua
where ua.achievement_id = 'brent_rambo'
  and ua.unlocked_at >= (select run_at from public.sql_runs
                          where name = '2026-10-05_succes_louvre_cesar')
  and exists (select 1 from public.user_achievements j
               where j.user_id = ua.user_id and j.achievement_id = 'jules_cesar');

delete from public.user_achievements ua
where ua.achievement_id = 'brent_rambo'
  and ua.unlocked_at >= (select run_at from public.sql_runs
                          where name = '2026-10-05_succes_louvre_cesar')
  and exists (select 1 from public.user_achievements j
               where j.user_id = ua.user_id and j.achievement_id = 'jules_cesar');
