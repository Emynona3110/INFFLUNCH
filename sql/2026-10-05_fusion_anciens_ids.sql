-- =============================================================================
-- Fusion des obtentions encore stockées sous un ANCIEN id — 2026-10-05
-- Constat : un onglet resté ouvert sur une ancienne version du front a
-- redébloqué, sous leurs anciens ids, des succès que la personne avait déjà
-- sous le nouvel id (ex. petit_geste @ 2026-10-05 à côté de jules_cesar @
-- 2026-09-10). Le profil comptait les deux (31/30).
--
-- Pour chaque ancien id (= ACHIEVEMENT_ALIASES) : la date la plus ancienne
-- gagne, l'ancienne ligne disparaît si le nouvel id existe, sinon elle est
-- renommée. Ne touche pas aux ids actuels entre eux : idempotent, à rejouer
-- sans risque (par exemple si l'onglet périmé en recrée avant d'être rechargé).
--
-- ⚠️ ENSUITE, rejouer sql/2026-10-05_paliers_succes.sql : une ligne
-- gardez_la_monnaie / plume_gastronomique / public_conquis renommée en stonks /
-- naruto / absolute_cinema garde la date (ou le droit) de l'ANCIEN palier.
-- =============================================================================

begin;

do $$
declare r record;
begin
  for r in select * from (values
      ('critique_en_herbe',   'ratatouille'),
      ('palais_aguerri',      'death_note'),
      ('plume_gastronomique', 'naruto'),
      ('photographe',         'duck_face'),
      ('inffluenceur',        'salt_bae'),
      ('addition',            'take_my_money'),
      ('gardez_la_monnaie',   'stonks'),
      ('petit_geste',         'jules_cesar'),
      ('public_conquis',      'absolute_cinema'),
      ('quinte_gagnant',      'pokeball'),
      ('gambling',            'new_vegas'),
      ('indecis',             'matrix'),
      ('de_pipe',             'magritte'),
      ('fidele_au_poste',     'michael_scott'),
      ('flambe',              'johnny_hallyday'),
      ('sprinter',            'flash'),
      ('retardataire',        'mister_bean'),
      ('jour_nuit',           'jacquouille'),
      ('narcisse',            'johnny_bravo'),
      ('cookie',              'cookie_clicker'),
      ('pas_de_sushi',        'nemo'),
      ('anti_panurgisme',     'petit_prince'),
      ('berger_dun_jour',     'minecraft'),
      ('completionniste',     'gatsby'),
      ('pizzarazzi',          'louvre'),
      ('approuve',            'brent_rambo')
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
       and exists (
         select 1 from public.user_achievements n
          where n.user_id = o.user_id and n.achievement_id = r.new_id
       );

    update public.user_achievements
       set achievement_id = r.new_id
     where achievement_id = r.old_id;
  end loop;
end $$;

-- Lignes fantômes d'une session de développement jamais commitée (même
-- horodatage à la microseconde, un seul compte) : aucune vraie obtention.
delete from public.user_achievements
 where achievement_id in ('ramen_ta_science', 'premiers_pas');

commit;
