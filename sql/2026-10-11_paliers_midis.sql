-- =============================================================================
-- Paliers des midis déclarés : 1 / 5 / 15 — 2026-10-11
--   lunches_1  « Pour la science »   (Einstein)
--   lunches_5  « Ventre sur pattes » (Kirby)
--   lunches_15 « Gratiné »           (Garfield)
--
-- Attribution RÉTROACTIVE depuis lunch_plans : chaque palier est daté de la
-- n-ième déclaration (created_at). Comme le front (métrique `lunches`) et le
-- `lunches_count` du profil public, seuls les midis en SEMAINE comptent, au
-- resto ou non. Ceux qui atteignent un palier le reçoivent à cette date, même
-- s'ils ne se sont pas reconnectés.
-- Le Banquet final (all_achievements) n'est pas touché ici : c'est le front
-- qui le retire jusqu'à obtention des trois nouveaux, comme d'habitude.
--
-- ORDRE : déployer le front PUIS jouer ce script. Entre les deux, le nouveau
-- front peut débloquer un palier daté du jour : le recalage ci-dessous le
-- corrige.
-- Idempotent : à rejouer sans risque.
-- =============================================================================

begin;

-- 0. Sauvegarde (à supprimer une fois vérifié :
--    drop table public.user_achievements_bak_20261011;).
create table if not exists public.user_achievements_bak_20261011 as
  select * from public.user_achievements;
alter table public.user_achievements_bak_20261011 enable row level security;

-- 1. Vérité terrain : 1er, 5e et 15e midis déclarés en semaine.
create temporary table palier_truth on commit drop as
with decl as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at, day) n
    from public.lunch_plans
   where extract(isodow from day) < 6)
          select user_id, 'lunches_1' as achievement_id, created_at as at
            from decl where n = 1
union all select user_id, 'lunches_5', created_at from decl where n = 5
union all select user_id, 'lunches_15', created_at from decl where n = 15;

-- 2. Recalage de ceux que le front aurait déjà débloqués (datés du jour).
update public.user_achievements ua
   set unlocked_at = t.at
  from palier_truth t
 where ua.user_id = t.user_id
   and ua.achievement_id = t.achievement_id
   and ua.unlocked_at <> t.at;

-- 3. Attribution.
insert into public.user_achievements (user_id, achievement_id, unlocked_at)
select user_id, achievement_id, at from palier_truth
on conflict (user_id, achievement_id) do nothing;

commit;

-- Contrôle : répartition des paliers de midis.
--   select achievement_id, count(*), min(unlocked_at), max(unlocked_at)
--     from public.user_achievements
--    where achievement_id like 'lunches_%'
--    group by 1 order by 1;
