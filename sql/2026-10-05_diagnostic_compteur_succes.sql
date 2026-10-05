-- =============================================================================
-- Diagnostic du compteur de succès (31/30) — 2026-10-05. LECTURE SEULE.
-- Cause suspectée : des obtentions encore stockées sous un ANCIEN id (renommage
-- du 2026-10-04 pas encore joué) cohabitent avec le nouvel id, que le front a
-- redébloqué. Le profil comptait les deux.
-- =============================================================================

-- Table de correspondance ancien id -> id actuel (= ACHIEVEMENT_ALIASES).
with aliases(old_id, new_id) as (values
  ('critique_en_herbe','ratatouille'), ('palais_aguerri','death_note'),
  ('plume_gastronomique','naruto'),    ('photographe','duck_face'),
  ('inffluenceur','salt_bae'),         ('addition','take_my_money'),
  ('gardez_la_monnaie','stonks'),      ('petit_geste','jules_cesar'),
  ('public_conquis','absolute_cinema'),('quinte_gagnant','pokeball'),
  ('gambling','new_vegas'),            ('indecis','matrix'),
  ('de_pipe','magritte'),              ('fidele_au_poste','michael_scott'),
  ('flambe','johnny_hallyday'),        ('sprinter','flash'),
  ('retardataire','mister_bean'),      ('jour_nuit','jacquouille'),
  ('narcisse','johnny_bravo'),         ('cookie','cookie_clicker'),
  ('pas_de_sushi','nemo'),             ('anti_panurgisme','petit_prince'),
  ('berger_dun_jour','minecraft'),     ('completionniste','gatsby'),
  ('pizzarazzi','louvre'),             ('approuve','brent_rambo')
)
-- 1) Lignes encore sous un ancien id, et si le nouvel id existe aussi (doublon).
select a.old_id, a.new_id,
       count(*) as lignes_ancien_id,
       count(n.user_id) as dont_doublons
  from public.user_achievements o
  join aliases a on a.old_id = o.achievement_id
  left join public.user_achievements n
    on n.user_id = o.user_id and n.achievement_id = a.new_id
 group by a.old_id, a.new_id
 order by lignes_ancien_id desc;

-- 2) Ids inconnus du catalogue actuel (ni actuel, ni alias).
select achievement_id, count(*)
  from public.user_achievements
 where achievement_id not in (
   'ratatouille','death_note','naruto','duck_face','salt_bae','louvre',
   'take_my_money','stonks','jules_cesar','absolute_cinema','brent_rambo',
   'gouts_et_couleurs','pokeball','new_vegas','matrix','magritte','jacquouille',
   'johnny_bravo','shooting_stars','cookie_clicker','michael_scott',
   'johnny_hallyday','flash','mister_bean','cowabunga','nemo','petit_prince',
   'minecraft','seigneur_des_anneaux','gatsby',
   'critique_en_herbe','palais_aguerri','plume_gastronomique','photographe',
   'inffluenceur','addition','gardez_la_monnaie','petit_geste','public_conquis',
   'quinte_gagnant','gambling','indecis','de_pipe','fidele_au_poste','flambe',
   'sprinter','retardataire','jour_nuit','narcisse','cookie','pas_de_sushi',
   'anti_panurgisme','berger_dun_jour','completionniste','pizzarazzi','approuve')
 group by achievement_id;
