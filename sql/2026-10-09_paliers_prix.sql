-- =============================================================================
-- Paliers des prix déclarés : 1 / 10 -> 1 / 5 / 15 — 2026-10-09
--   prices_10 « Du beurre dans les épinards » devient prices_5 (5 prix) ;
--   nouveau prices_15 « Pièce montée » (15 prix, Picsou).
--
-- Obtentions et DATES recalculées depuis restaurant_prices (décision du user) :
-- chaque palier est daté de la n-ième déclaration (created_at, une ligne par
-- personne et par resto). Ceux qui l'avaient sont recalés, ceux qui
-- atteignent le palier le reçoivent à cette date — même s'ils ne se sont pas
-- reconnectés.
-- Un succès ne s'annule jamais : un ancien prices_10 dont les déclarations
-- auraient depuis été supprimées (moins de 5 aujourd'hui) devient prices_5 à
-- sa date d'origine.
-- Le Banquet final (all_achievements) n'est pas touché ici : c'est le front
-- qui le retire jusqu'à obtention de « Pièce montée », comme d'habitude.
--
-- ORDRE : déployer le front PUIS jouer ce script. Entre les deux, le nouveau
-- front peut débloquer prices_5 / prices_15 datés du jour : le recalage
-- ci-dessous le corrige.
-- Idempotent : à rejouer sans risque.
-- =============================================================================

begin;

-- 0. Sauvegarde (à supprimer une fois vérifié :
--    drop table public.user_achievements_bak_20261009;).
create table if not exists public.user_achievements_bak_20261009 as
  select * from public.user_achievements;
alter table public.user_achievements_bak_20261009 enable row level security;

-- 1. prices_10 -> prices_5 (la date la plus ancienne l'emporte en cas de
--    doublon ; elle est de toute façon recalée à l'étape 2 si possible).
update public.user_achievements n
   set unlocked_at = o.unlocked_at
  from public.user_achievements o
 where o.user_id = n.user_id
   and o.achievement_id = 'prices_10'
   and n.achievement_id = 'prices_5'
   and o.unlocked_at < n.unlocked_at;

delete from public.user_achievements o
 where o.achievement_id = 'prices_10'
   and exists (select 1 from public.user_achievements n
                where n.user_id = o.user_id and n.achievement_id = 'prices_5');

update public.user_achievements
   set achievement_id = 'prices_5'
 where achievement_id = 'prices_10';

-- 2. Vérité terrain : 5e et 15e prix déclarés.
create temporary table palier_truth on commit drop as
with decl as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at) n
    from public.restaurant_prices)
          select user_id, 'prices_5' as achievement_id, created_at as at
            from decl where n = 5
union all select user_id, 'prices_15', created_at from decl where n = 15;

update public.user_achievements ua
   set unlocked_at = t.at
  from palier_truth t
 where ua.user_id = t.user_id
   and ua.achievement_id = t.achievement_id
   and ua.unlocked_at <> t.at;

insert into public.user_achievements (user_id, achievement_id, unlocked_at)
select user_id, achievement_id, at from palier_truth
on conflict (user_id, achievement_id) do nothing;

-- 3. Garde-fou : un onglet resté sur l'ancien front qui insère prices_10 (ou
--    stonks / gardez_la_monnaie) écrit en fait prices_5.
--    (reprend sql/2026-10-08_succes_ids_stables.sql, étape 4)
create or replace function public.user_achievements_canonical_id()
returns trigger
language plpgsql
as $fn$
begin
  new.achievement_id := case new.achievement_id
    when 'eat_me' then 'reviews_1'
    when 'death_note' then 'reviews_5'
    when 'naruto' then 'reviews_15'
    when 'jerry' then 'photos_1'
    when 'delamama' then 'photos_5'
    when 'joconde' then 'photos_15'
    when 'take_my_money' then 'prices_1'
    when 'stonks' then 'prices_5'
    when 'jules_cesar' then 'reactions_given_1'
    when 'absolute_cinema' then 'reactions_given_10'
    when 'brent_rambo' then 'reactions_received_5'
    when 'gouts_et_couleurs' then 'reaction_kinds_3'
    when 'pokeball' then 'favorites_6'
    when 'new_vegas' then 'roulette_spin'
    when 'matrix' then 'roulette_two_restaurants'
    when 'magritte' then 'roulette_one_restaurant'
    when 'michael_scott' then 'login_streak_5'
    when 'johnny_hallyday' then 'lunch_streak_5'
    when 'flash' then 'lunch_early'
    when 'mister_bean' then 'lunch_late'
    when 'cowabunga' then 'lunch_table_4'
    when 'jacquouille' then 'theme_toggle'
    when 'johnny_bravo' then 'react_own_photo'
    when 'shooting_stars' then 'star_cursor'
    when 'cookie_clicker' then 'privacy_cookie'
    when 'nemo' then 'feedback_open'
    when 'petit_prince' then 'sheep_found'
    when 'minecraft' then 'sheep_fed'
    when 'seigneur_des_anneaux' then 'sheep_ring'
    when 'gatsby' then 'all_achievements'
    when 'critique_en_herbe' then 'reviews_1'
    when 'palais_aguerri' then 'reviews_5'
    when 'plume_gastronomique' then 'reviews_15'
    when 'photographe' then 'photos_1'
    when 'inffluenceur' then 'photos_5'
    when 'addition' then 'prices_1'
    when 'gardez_la_monnaie' then 'prices_5'
    when 'petit_geste' then 'reactions_given_1'
    when 'public_conquis' then 'reactions_given_10'
    when 'quinte_gagnant' then 'favorites_6'
    when 'gambling' then 'roulette_spin'
    when 'indecis' then 'roulette_two_restaurants'
    when 'de_pipe' then 'roulette_one_restaurant'
    when 'fidele_au_poste' then 'login_streak_5'
    when 'flambe' then 'lunch_streak_5'
    when 'sprinter' then 'lunch_early'
    when 'retardataire' then 'lunch_late'
    when 'jour_nuit' then 'theme_toggle'
    when 'narcisse' then 'react_own_photo'
    when 'cookie' then 'privacy_cookie'
    when 'pas_de_sushi' then 'feedback_open'
    when 'anti_panurgisme' then 'sheep_found'
    when 'berger_dun_jour' then 'sheep_fed'
    when 'completionniste' then 'all_achievements'
    when 'pizzarazzi' then 'photos_15'
    when 'approuve' then 'reactions_received_5'
    when 'ratatouille' then 'reviews_1'
    when 'duck_face' then 'photos_1'
    when 'salt_bae' then 'photos_5'
    when 'louvre' then 'photos_15'
    when 'prices_10' then 'prices_5'
    else new.achievement_id
  end;
  return new;
end;
$fn$;


commit;

-- Contrôle : plus aucun prices_10 ; répartition des paliers de prix.
--   select achievement_id, count(*), min(unlocked_at), max(unlocked_at)
--     from public.user_achievements
--    where achievement_id like 'prices_%'
--    group by 1 order by 1;
