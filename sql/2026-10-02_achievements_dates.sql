-- =============================================================================
-- Dates d'obtention : recalage sur la source — 2026-10-02 (après coup)
--
-- Entre le déploiement et l'exécution de sql/2026-10-02_achievements.sql, le
-- front a écrit des lignes que la fusion (qui ne tourne qu'UNE fois) n'a pas
-- vues : des obtentions datées du jour, et des lignes sous d'anciens ids que le
-- catalogue ne connaît plus — donc invisibles dans la galerie.
--
-- « Daté d'aujourd'hui » n'est pas une anomalie en soi : certains ont pu gagner
-- le succès aujourd'hui. Ce qui compte, c'est l'ÉCART entre la date stockée et
-- la date du contenu qui a déclenché le palier. Cette date-là est dans les
-- tables sources, qui horodatent tout : restaurant_prices, reviews,
-- restaurant_photos, reactions. On recalcule, on ne devine pas.
--
-- NON reconstructible, laissé tel quel : `quinte_gagnant` (favorites n'a pas de
-- created_at), les séries `flambe` / `fidele_au_poste`, `completionniste`, et
-- les secrets d'interaction (mouton, roue, thème, cookie, shooting_stars,
-- sprinter, retardataire).
--
-- Idempotent : il réécrit toujours la même valeur, à rejouer sans risque.
-- Pour VOIR l'écart avant de corriger : commenter `begin;`, les deux `update`,
-- les deux `insert` et `commit;` — le select final donne la photo d'avant.
--
-- ATTENTION : ne pas rejouer sql/2026-10-02_achievements.sql. Sa section 1
-- supprime la ligne `gardez_la_monnaie` de qui possède aussi une ligne
-- `addition` : c'était juste avant que le front recrée des lignes, ça ne l'est
-- plus.
--
-- À exécuter dans le SQL editor du projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

begin;

-- 1) Les lignes écrites sous un ancien id après la fusion : on les ramène vers
--    le nouvel id en gardant la date la plus ancienne des deux, puis on retire
--    l'ancienne. La paire ambiguë `addition` -> `gardez_la_monnaie` est
--    volontairement absente : les deux ids existent des deux côtés, c'est la
--    section 2 qui tranche, sur les prix réellement déclarés.
do $$
declare r record;
begin
  for r in select * from (values
      ('note_de_frais',        'addition'),
      ('speedrunner',          'sprinter'),
      ('premier_avis',         'critique_en_herbe'),
      ('critique_confirme',    'palais_aguerri'),
      ('premiere_photo',       'photographe'),
      ('apprenti_photographe', 'photographe'),
      ('objectif_midi',        'inffluenceur'),
      ('paparazzi_pause',      'pizzarazzi'),
      ('premiere_reaction',    'petit_geste'),
      ('troupeau_complet',     'completionniste')
    ) as t(old_id, new_id)
  loop
    update public.user_achievements n
       set unlocked_at = o.unlocked_at
      from public.user_achievements o
     where o.user_id = n.user_id
       and o.achievement_id = r.old_id
       and n.achievement_id = r.new_id
       and o.unlocked_at < n.unlocked_at;

    delete from public.user_achievements o
     where o.achievement_id = r.old_id
       and exists (select 1 from public.user_achievements n
                    where n.user_id = o.user_id and n.achievement_id = r.new_id);

    update public.user_achievements
       set achievement_id = r.new_id
     where achievement_id = r.old_id;
  end loop;
end $$;

-- 2) La vérité : pour chaque palier reconstructible, la date du contenu qui l'a
--    déclenché.
create temporary table truth as
with prices as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at) n
    from public.restaurant_prices),
revs as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at) n
    from public.reviews),
photos as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at) n
    from public.restaurant_photos),
-- Photos DIFFÉRENTES sur lesquelles la personne a réagi : sa première réaction
-- sur chacune, puis on les numérote.
targets as (
  select user_id, target_id, min(created_at) as created_at
    from public.reactions where target_type = 'photo'
   group by user_id, target_id),
targets_n as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at) n
    from targets),
-- Emojis DIFFÉRENTS posés (photos et avis confondus, comme la métrique).
emojis as (
  select user_id, emoji, min(created_at) as created_at
    from public.reactions group by user_id, emoji),
emojis_n as (
  select user_id, created_at,
         row_number() over (partition by user_id order by created_at) n
    from emojis),
-- Réactions reçues sur ses propres photos, posées par quelqu'un d'autre.
received as (
  select p.user_id, r.created_at,
         row_number() over (partition by p.user_id order by r.created_at) n
    from public.reactions r
    join public.restaurant_photos p
      on p.id = r.target_id and r.target_type = 'photo'
   where r.user_id <> p.user_id),
-- Réagir à SA propre photo.
self_react as (
  select p.user_id, min(r.created_at) as created_at
    from public.reactions r
    join public.restaurant_photos p
      on p.id = r.target_id and r.target_type = 'photo'
   where r.user_id = p.user_id
   group by p.user_id)
select user_id, achievement_id, at from (
            select user_id, 'addition' as achievement_id, created_at as at
              from prices where n = 1
  union all select user_id, 'gardez_la_monnaie',   created_at from prices    where n = 5
  union all select user_id, 'critique_en_herbe',   created_at from revs      where n = 1
  union all select user_id, 'palais_aguerri',      created_at from revs      where n = 5
  union all select user_id, 'plume_gastronomique', created_at from revs      where n = 20
  union all select user_id, 'photographe',         created_at from photos    where n = 1
  union all select user_id, 'inffluenceur',        created_at from photos    where n = 5
  union all select user_id, 'pizzarazzi',          created_at from photos    where n = 15
  union all select user_id, 'petit_geste',         created_at from targets_n where n = 1
  union all select user_id, 'public_conquis',      created_at from targets_n where n = 20
  union all select user_id, 'gouts_et_couleurs',   created_at from emojis_n  where n = 3
  union all select user_id, 'approuve',            created_at from received  where n = 5
  union all select user_id, 'narcisse',            created_at from self_react
) u;

-- 3) Recaler les lignes existantes.
update public.user_achievements ua
   set unlocked_at = t.at
  from truth t
 where ua.user_id = t.user_id
   and ua.achievement_id = t.achievement_id
   and ua.unlocked_at <> t.at;

-- 4) Créer à la bonne date celles qui manquent : le palier est atteint, la ligne
--    n'a jamais été écrite (ou vient d'être retirée en section 1).
insert into public.user_achievements (user_id, achievement_id, unlocked_at)
select user_id, achievement_id, at from truth
on conflict (user_id, achievement_id) do nothing;

-- 5) Une dernière ligne fantôme : `cookie_monster`, l'id que portait le succès
--    « Cookie » pendant la soirée où il a été codé (2026-09-21). Il n'existe
--    dans aucun commit, donc le catalogue ne le connaît pas et la ligne est
--    invisible dans la galerie — mais c'est bien la MÊME action, faite une heure
--    plus tôt que la ligne `cookie`. On récupère donc la date, puis on jette.
update public.user_achievements c
   set unlocked_at = m.unlocked_at
  from public.user_achievements m
 where m.user_id = c.user_id
   and m.achievement_id = 'cookie_monster'
   and c.achievement_id = 'cookie'
   and m.unlocked_at < c.unlocked_at;

update public.user_achievements
   set achievement_id = 'cookie'
 where achievement_id = 'cookie_monster'
   and not exists (select 1 from public.user_achievements c
                    where c.user_id = user_achievements.user_id
                      and c.achievement_id = 'cookie');

delete from public.user_achievements where achievement_id = 'cookie_monster';

commit;

-- Contrôle : l'écart doit être nul partout où une vérité existe. Les succès non
-- reconstructibles (quinte_gagnant, flambe, fidele_au_poste, completionniste,
-- secrets d'interaction) sortent avec date_vraie à null : normal, on n'y a pas
-- touché.
select u.email, ua.achievement_id, ua.unlocked_at, t.at as date_vraie,
       ua.unlocked_at - t.at as ecart
  from public.user_achievements ua
  join public.users u on u.id = ua.user_id
  left join truth t
    on t.user_id = ua.user_id and t.achievement_id = ua.achievement_id
 order by ecart desc nulls last, u.email, ua.achievement_id;
