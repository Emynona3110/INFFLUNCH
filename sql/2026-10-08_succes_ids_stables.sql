-- =============================================================================
-- Succès : ids STABLES, nommés par la condition — 2026-10-08
-- Jusqu'ici l'id nommait la référence de l'illustration (ratatouille, gatsby…) :
-- changer d'illustration obligeait à renommer l'id, avec alias et migration.
-- Désormais l'id nomme la CONDITION (reviews_1, photos_15, lunch_table_4…) et
-- ne change plus ; titre et image se modifient sans toucher à la base.
-- Correspondance complète : ACHIEVEMENT_ALIASES (src/data/achievements.ts),
-- reprise telle quelle ci-dessous (ids de référence ET ids plus anciens).
--
-- Ce script :
--   1. renomme les obtentions (user_achievements) — les DATES NE BOUGENT PAS ;
--      si une ligne existe sous l'ancien et le nouvel id, on garde la date la
--      plus ancienne et une seule ligne ;
--   2. renomme les conditions secrètes (achievement_secrets), qui suivent l'id
--      (leur policy de lecture compare les ids) ;
--   3. fait décerner « Cowabunga ! » sous son nouvel id par le trigger serveur ;
--   4. pose un garde-fou à l'INSERTION : tout ancien id est réécrit en nouvel
--      id. Un onglet resté sur l'ancien front, qui ne reconnaît plus ses succès
--      et tenterait de les réinsérer, heurte alors la contrainte d'unicité
--      (23505) : ni doublon daté du jour, ni second toast.
--
-- ⚠️ ORDRE : déployer le front PUIS jouer ce script aussitôt. Le nouveau front
-- lit déjà les anciens ids (alias) : il fonctionne avant comme après.
-- Un seul passage (verrou public.sql_runs) ; les étapes 3 et 4 sont de toute
-- façon idempotentes.
-- Reste à faire de ton côté : recharger tes propres onglets ouverts (admin) —
-- un ancien onglet admin pourrait sinon retirer le Banquet final, seule
-- suppression autorisée et réservée aux admins.
-- =============================================================================

begin;

-- Journal des scripts à exécution unique (créé le 2026-10-05, au cas où).
create table if not exists public.sql_runs (
  name   text primary key,
  run_at timestamptz not null default now()
);
alter table public.sql_runs enable row level security;

-- 0. Sauvegarde intégrale avant toute écriture (à supprimer une fois le
-- résultat vérifié : drop table public.user_achievements_bak_20261008, …).
-- `if not exists` : un second passage ne remplace pas la sauvegarde d'origine.
create table if not exists public.user_achievements_bak_20261008 as
  select * from public.user_achievements;
create table if not exists public.achievement_secrets_bak_20261008 as
  select * from public.achievement_secrets;
alter table public.user_achievements_bak_20261008 enable row level security;
alter table public.achievement_secrets_bak_20261008 enable row level security;

-- 1 + 2. Renommage des obtentions et des conditions secrètes -------------------
do $$
declare r record;
begin
  insert into public.sql_runs (name) values ('2026-10-08_succes_ids_stables')
  on conflict (name) do nothing;
  if not found then
    raise notice 'Renommage déjà exécuté : rien à faire.';
    return;
  end if;

  for r in select * from (values
      ('eat_me',               'reviews_1'),
      ('death_note',           'reviews_5'),
      ('naruto',               'reviews_15'),
      ('jerry',                'photos_1'),
      ('delamama',             'photos_5'),
      ('joconde',              'photos_15'),
      ('take_my_money',        'prices_1'),
      ('stonks',               'prices_10'),
      ('jules_cesar',          'reactions_given_1'),
      ('absolute_cinema',      'reactions_given_10'),
      ('brent_rambo',          'reactions_received_5'),
      ('gouts_et_couleurs',    'reaction_kinds_3'),
      ('pokeball',             'favorites_6'),
      ('new_vegas',            'roulette_spin'),
      ('matrix',               'roulette_two_restaurants'),
      ('magritte',             'roulette_one_restaurant'),
      ('michael_scott',        'login_streak_5'),
      ('johnny_hallyday',      'lunch_streak_5'),
      ('flash',                'lunch_early'),
      ('mister_bean',          'lunch_late'),
      ('cowabunga',            'lunch_table_4'),
      ('jacquouille',          'theme_toggle'),
      ('johnny_bravo',         'react_own_photo'),
      ('shooting_stars',       'star_cursor'),
      ('cookie_clicker',       'privacy_cookie'),
      ('nemo',                 'feedback_open'),
      ('petit_prince',         'sheep_found'),
      ('minecraft',            'sheep_fed'),
      ('seigneur_des_anneaux', 'sheep_ring'),
      ('gatsby',               'all_achievements'),
      ('critique_en_herbe',    'reviews_1'),
      ('palais_aguerri',       'reviews_5'),
      ('plume_gastronomique',  'reviews_15'),
      ('photographe',          'photos_1'),
      ('inffluenceur',         'photos_5'),
      ('addition',             'prices_1'),
      ('gardez_la_monnaie',    'prices_10'),
      ('petit_geste',          'reactions_given_1'),
      ('public_conquis',       'reactions_given_10'),
      ('quinte_gagnant',       'favorites_6'),
      ('gambling',             'roulette_spin'),
      ('indecis',              'roulette_two_restaurants'),
      ('de_pipe',              'roulette_one_restaurant'),
      ('fidele_au_poste',      'login_streak_5'),
      ('flambe',               'lunch_streak_5'),
      ('sprinter',             'lunch_early'),
      ('retardataire',         'lunch_late'),
      ('jour_nuit',            'theme_toggle'),
      ('narcisse',             'react_own_photo'),
      ('cookie',               'privacy_cookie'),
      ('pas_de_sushi',         'feedback_open'),
      ('anti_panurgisme',      'sheep_found'),
      ('berger_dun_jour',      'sheep_fed'),
      ('completionniste',      'all_achievements'),
      ('pizzarazzi',           'photos_15'),
      ('approuve',             'reactions_received_5'),
      ('ratatouille',          'reviews_1'),
      ('duck_face',            'photos_1'),
      ('salt_bae',             'photos_5'),
      ('louvre',               'photos_15')
    ) as t(old_id, new_id)
  loop
    -- Doublon : la date la plus ancienne l'emporte, sur la ligne du nouvel id.
    update public.user_achievements n
       set unlocked_at = o.unlocked_at
      from public.user_achievements o
     where o.user_id = n.user_id
       and o.achievement_id = r.old_id
       and n.achievement_id = r.new_id
       and o.unlocked_at < n.unlocked_at;

    delete from public.user_achievements o
     where o.achievement_id = r.old_id
       and exists (
         select 1 from public.user_achievements n
          where n.user_id = o.user_id and n.achievement_id = r.new_id
       );

    update public.user_achievements
       set achievement_id = r.new_id
     where achievement_id = r.old_id;

    -- Condition secrète : suit l'id (une seule ligne par id).
    update public.achievement_secrets
       set id = r.new_id
     where id = r.old_id
       and not exists (select 1 from public.achievement_secrets s where s.id = r.new_id);
    delete from public.achievement_secrets where id = r.old_id;
  end loop;
end $$;

-- 3. « Cowabunga ! » décerné sous son nouvel id --------------------------------
-- (reprend sql/2026-10-06_cowabunga_serveur.sql, seul l'id change)
create or replace function public.grant_cowabunga()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.restaurant_id is null then
    return new;
  end if;

  if (select count(*) from public.lunch_plans
       where day = new.day and restaurant_id = new.restaurant_id) >= 4 then
    insert into public.user_achievements (user_id, achievement_id, seen)
    select user_id, 'lunch_table_4', false
      from public.lunch_plans
     where day = new.day and restaurant_id = new.restaurant_id
    on conflict (user_id, achievement_id) do nothing;
  end if;

  return new;
end;
$fn$;

-- 4. Garde-fou : tout ancien id inséré est réécrit en id actuel ----------------
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
    when 'stonks' then 'prices_10'
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
    when 'gardez_la_monnaie' then 'prices_10'
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
    else new.achievement_id
  end;
  return new;
end;
$fn$;

drop trigger if exists user_achievements_canonical_id on public.user_achievements;
create trigger user_achievements_canonical_id
before insert on public.user_achievements
for each row execute function public.user_achievements_canonical_id();

commit;

-- Contrôle : ne doit lister que des ids du catalogue actuel.
--   select achievement_id, count(*) from public.user_achievements
--    group by 1 order by 1;
--   select id from public.achievement_secrets order by 1;
