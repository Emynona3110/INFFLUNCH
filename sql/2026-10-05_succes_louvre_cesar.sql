-- =============================================================================
-- Succès : renommage des ids — 2026-10-05
--   pizzarazzi              -> louvre       « La cerise sur le gâteau » (15 photos)
--   petit_geste/brent_rambo -> jules_cesar  « Veni, vidi, amavi » (réagir à une photo)
--   approuve                -> brent_rambo  « Coup de pouce » (5 réactions reçues)
-- Même règle que sql/2026-10-04_succes_renommage.sql : l'id nomme la référence
-- de l'illustration. Les illustrations de « réagir à une photo » et « 5
-- réactions reçues » ont été échangées : l'obtention suit la CONDITION.
--
-- ⚠️ `brent_rambo` CHANGE DE SENS : jusqu'ici « réagir à une photo », désormais
-- « 5 réactions reçues ». L'ORDRE des étapes est donc essentiel : on vide
-- d'abord brent_rambo vers jules_cesar, puis seulement approuve le remplit.
--
-- Les dates ne bougent PAS : seule la colonne achievement_id est réécrite.
-- Si une ligne existe sous l'ancien et le nouvel id (le front a pu redébloquer
-- jules_cesar entre le déploiement et ce script), on garde la plus ancienne
-- date.
--
-- ⚠️ PAS idempotent (rejoué, l'étape 2 déplacerait les « 5 réactions reçues »
-- vers jules_cesar) : un verrou dans public.sql_runs l'empêche de tourner deux
-- fois — une seconde exécution ne fait rien et le signale.
--
-- À exécuter JUSTE APRÈS le déploiement, sur le projet Supabase.
-- =============================================================================

begin;

-- Journal des scripts à exécution unique (lecture/écriture : SQL editor seul).
create table if not exists public.sql_runs (
  name   text primary key,
  run_at timestamptz not null default now()
);
alter table public.sql_runs enable row level security;

do $$
declare r record;
begin
  insert into public.sql_runs (name) values ('2026-10-05_succes_louvre_cesar')
  on conflict (name) do nothing;
  if not found then
    raise notice 'Déjà exécuté : rien à faire.';
    return;
  end if;

  for r in select * from (values
      -- 1. « Réagir à une photo » quitte brent_rambo (et son ancien id).
      (1, 'petit_geste', 'jules_cesar'),
      (2, 'brent_rambo', 'jules_cesar'),
      -- 2. brent_rambo vide : « 5 réactions reçues » peut s'y installer.
      (3, 'approuve',    'brent_rambo'),
      (4, 'pizzarazzi',  'louvre')
    ) as t(step, old_id, new_id)
    order by step
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

commit;
