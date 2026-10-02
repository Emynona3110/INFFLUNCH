-- =============================================================================
-- Succès : lot de modifications du 2026-10-02 — à exécuter EN UNE FOIS
-- Tout ce que la session touche aux succès est réuni ici, dans l'ordre.
-- Le catalogue (titres, images, conditions non secrètes) vit côté front
-- (src/data/achievements.ts) : ce script ne s'occupe QUE de la base, soit les
-- obtentions (user_achievements) et les conditions secrètes
-- (achievement_secrets).
--
-- RÈGLE DU LOT : personne ne perd un succès, et personne ne perd sa DATE
-- d'obtention. Les identifiants qui changent de nom sont renommés, jamais
-- supprimés.
--
-- ⚠️ Le front tourne déjà avec les nouveaux ids pendant que la base a encore
-- les anciens : `useAchievementTriggers` a donc pu REDÉBLOQUER des succès à la
-- date du jour, sous le nouvel id, à côté de l'ancienne ligne restée intacte.
-- Chaque renommage ci-dessous commence donc par une FUSION : des deux lignes,
-- c'est la date la PLUS ANCIENNE qui est conservée, et le doublon disparaît.
-- Le script est idempotent : le rejouer ne change plus rien.
--
-- À exécuter dans le SQL editor du projet Supabase (ref ilonqaqyqmvsfskwgqka) :
-- user_achievements est en RLS sans policy update/delete, donc rien de tout
-- ceci n'est faisable côté client.
-- =============================================================================

begin;

-- 1) Prix déclarés : le palier 5 d'abord ---------------------------------------
--   1 prix : `note_de_frais` « Note de frais » → `addition` « L'addition ! »
--   5 prix : `addition` « L'addition ! »       → `gardez_la_monnaie`
--                                                « Gardez la monnaie »
-- Les paliers ne bougent pas, seuls le nom et l'image changent. Le cas tordu :
-- l'id `addition` existe des DEUX côtés — ancien palier 5, nouveau palier 1 —
-- donc une ligne `addition` en base est l'ancienne (palier 5) chez qui a
-- déclaré ≥ 5 prix, et la nouvelle (palier 1, posée aujourd'hui par le front)
-- chez les autres. On tranche sur la VÉRITÉ, le nombre de prix déclarés, jamais
-- sur la date.
--
-- 1a) Chez qui a ≥ 5 prix, la ligne `gardez_la_monnaie` éventuellement créée
--     aujourd'hui est en trop : c'est l'ancienne ligne `addition` qui porte la
--     bonne date, et c'est elle qui devient `gardez_la_monnaie`.
delete from public.user_achievements g
 where g.achievement_id = 'gardez_la_monnaie'
   and exists (
     select 1 from public.user_achievements a
      where a.user_id = g.user_id and a.achievement_id = 'addition'
   )
   and (select count(*) from public.restaurant_prices p
         where p.user_id = g.user_id) >= 5;

update public.user_achievements a
   set achievement_id = 'gardez_la_monnaie'
 where a.achievement_id = 'addition'
   and (select count(*) from public.restaurant_prices p
         where p.user_id = a.user_id) >= 5;

-- 2) Renommages : fusion puis bascule ------------------------------------------
-- Pour chaque paire, dans l'ordre : la ligne nouvelle (s'il y en a une) récupère
-- la date de l'ancienne quand celle-ci est antérieure, l'ancienne est retirée,
-- puis les anciennes lignes restantes (users que le front n'a pas encore
-- retouchés) sont simplement renommées.
--   • note_de_frais  → addition           : palier 1 prix (cf. section 1)
--   • speedrunner    → sprinter           : condition assouplie 8 h → 10 h
--   • les 7 suivants : l'id rejoint le titre. Règle posée ce jour — un succès
--     porte UN seul nom : l'id, le fichier d'icône (`{id}.svg`) et l'intitulé
--     disent la même chose. Ces ids étaient des restes d'anciens intitulés
--     (« Premier avis » devenu « Critique en herbe », « Troupeau complet »
--     devenu « Complétionniste »…).
do $$
declare r record;
begin
  for r in select * from (values
      ('note_de_frais',     'addition'),
      ('speedrunner',       'sprinter'),
      ('premier_avis',      'critique_en_herbe'),
      ('critique_confirme', 'palais_aguerri'),
      ('premiere_photo',    'photographe'),
      -- Deux étapes dans la même journée : « Apprenti photographe » est devenu
      -- « Photographe ». La ligne posée entre-temps par le front sous
      -- `apprenti_photographe` fusionne donc aussi vers `photographe`.
      ('apprenti_photographe', 'photographe'),
      ('objectif_midi',     'inffluenceur'),
      ('paparazzi_pause',   'pizzarazzi'),
      ('premiere_reaction', 'petit_geste'),
      ('troupeau_complet',  'completionniste')
    ) as t(old_id, new_id)
  loop
    -- La date la plus ancienne gagne.
    update public.user_achievements n
       set unlocked_at = o.unlocked_at
      from public.user_achievements o
     where o.user_id = n.user_id
       and o.achievement_id = r.old_id
       and n.achievement_id = r.new_id
       and o.unlocked_at < n.unlocked_at;

    -- L'ancienne ligne a livré sa date : le doublon part.
    delete from public.user_achievements o
     where o.achievement_id = r.old_id
       and exists (
         select 1 from public.user_achievements n
          where n.user_id = o.user_id and n.achievement_id = r.new_id
       );

    -- Le reste : simple renommage, date conservée.
    update public.user_achievements
       set achievement_id = r.new_id
     where achievement_id = r.old_id;
  end loop;
end $$;

-- 3) Conditions des succès secrets ---------------------------------------------
-- `sprinter` : nouveau nom + condition assouplie (avant 8 h → avant 10 h).
-- `indecis`  : 5 → 3 lancers de roue (INDECIS_SPINS dans RestaurantRoulette).
-- Les deux sont des assouplissements : leurs détenteurs actuels remplissent
-- toujours la condition, ils gardent le succès ET sa date.
-- `retardataire` et `gouts_et_couleurs` sont nouveaux : rien à insérer dans
-- user_achievements, les obtentions arrivent à l'usage (déclenchées par
-- useLunchToday pour l'un, par le palier reactionEmojisDistinct pour l'autre).
delete from public.achievement_secrets where id = 'speedrunner';

insert into public.achievement_secrets (id, condition) values
  ('sprinter',          'Choisir son restaurant du midi avant 10 h'),
  ('retardataire',      'Choisir son restaurant du midi après 14 h'),
  ('gouts_et_couleurs', 'Utiliser 3 réactions différentes'),
  ('indecis',           'Lancer la roue 3 fois de suite')
on conflict (id) do update set condition = excluded.condition;

commit;

-- Contrôles --------------------------------------------------------------------
-- a) Aucun id obsolète ne doit plus apparaître :
--    note_de_frais, speedrunner, premier_avis, critique_confirme,
--    premiere_photo, apprenti_photographe, objectif_midi, paparazzi_pause,
--    premiere_reaction, troupeau_complet
-- select achievement_id, count(*) as obtentions, min(unlocked_at) as plus_ancienne
--   from public.user_achievements group by achievement_id order by 1;
--
-- b) Aucune date ne doit avoir été repoussée à aujourd'hui : les lignes datées
--    du jour ne devraient concerner que les succès réellement nouveaux
--    (retardataire, gouts_et_couleurs).
-- select achievement_id, count(*) from public.user_achievements
--  where unlocked_at::date = current_date group by achievement_id order by 1;
--
-- select id, condition from public.achievement_secrets order by id;
