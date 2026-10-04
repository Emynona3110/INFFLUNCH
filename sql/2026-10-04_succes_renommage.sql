-- =============================================================================
-- Succès : refonte pop-culture, renommage des ids — 2026-10-04
-- Règle du 2026-10-04 : l'id d'un succès (et son fichier d'icône `{id}.svg`)
-- nomme la RÉFÉRENCE pop-culture de son illustration, pas son intitulé. Un
-- intitulé peut ainsi passer d'un succès à l'autre (« Gardez la monnaie »)
-- sans qu'un id ne désigne jamais deux succès différents.
--
-- Les obtentions et leurs dates ne bougent PAS : seule la colonne
-- achievement_id est réécrite. Le front lit déjà les anciens ids sous les
-- nouveaux (ACHIEVEMENT_ALIASES dans src/data/achievements.ts) : rien n'est
-- redébloqué entre le déploiement et ce script.
-- Garde-fou si une ligne existe malgré tout sous les deux ids : on garde la
-- plus ancienne date. Idempotent : à rejouer sans risque.
--
-- À exécuter APRÈS le déploiement (avant, l'ancien front redébloquerait les
-- anciens ids), sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

begin;

do $$
declare r record;
begin
  for r in select * from (values
      ('critique_en_herbe',   'ratatouille'),
      ('palais_aguerri',      'death_note'),   -- 5 avis
      ('plume_gastronomique', 'naruto'),       -- 20 avis
      ('photographe',         'duck_face'),
      ('inffluenceur',        'salt_bae'),
      ('addition',            'take_my_money'),
      ('gardez_la_monnaie',   'stonks'),
      -- 2026-10-05 : « réagir à une photo » est devenu jules_cesar
      -- (brent_rambo désigne désormais « 5 réactions reçues »).
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
      ('completionniste',     'gatsby')
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

    -- Condition secrète éventuelle : suit l'id.
    update public.achievement_secrets
       set id = r.new_id
     where id = r.old_id
       and not exists (select 1 from public.achievement_secrets s where s.id = r.new_id);
  end loop;
end $$;

commit;
