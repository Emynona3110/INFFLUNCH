-- =============================================================================
-- Déjeuner hors restaurant : distinguer « pas de restaurant » de « pas sur site »
-- 2026-09-25 (demande D.Chevillard du 2026-09-21 : « pas au restaurant » est
-- fourre-tout).
--
-- Jusqu'ici une ligne sans restaurant (cf. sql/2026-09-02_lunch_hors_resto.sql)
-- mélangeait deux situations qui n'ont pas le même intérêt pour les collègues :
--   'on_site' — « pas de restaurant » : présent sur site, mais déjeune
--               autrement (gamelle, plat apporté, resto de son côté) — on peut
--               encore le croiser, lui rapporter quelque chose, grouper un
--               click & collect ;
--   'away'    — « pas sur site » (peu importe la raison) : aucune interaction
--               possible ce midi.
--
-- On garde UNE intention par personne et par jour (clé primaire user_id + day)
-- et on ajoute une simple qualification de l'absence de restaurant. Pas de
-- nouvelle table, et surtout PAS de motif d'absence (télétravail, congé,
-- déplacement…) : Infflunch n'est pas un registre de présence, et ces motifs
-- seraient visibles de tous les collègues.
--
-- Les policies RLS sont inchangées (chacun n'écrit que sa propre ligne), la
-- publication Realtime aussi.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

alter table public.lunch_plans
  add column if not exists off_reason text;

comment on column public.lunch_plans.off_reason is
  'Qualification du « pas au restaurant » : on_site (sur site, déjeune autrement) ou away (pas sur site). NULL quand un restaurant est choisi, ou pour les lignes antérieures au 2026-09-25 (non précisé).';

-- Valeurs admises.
alter table public.lunch_plans
  drop constraint if exists lunch_plans_off_reason_valid;
alter table public.lunch_plans
  add constraint lunch_plans_off_reason_valid
  check (off_reason is null or off_reason in ('on_site', 'away'));

-- Cohérence : une raison ne se justifie que sans restaurant. On ne peut PAS
-- exiger l'inverse (restaurant nul ⇒ raison non nulle) : les lignes des jours
-- passés n'en ont pas, et on ne va pas leur inventer une valeur. Côté appli,
-- toute nouvelle déclaration sans restaurant en fournit une.
alter table public.lunch_plans
  drop constraint if exists lunch_plans_off_reason_coherent;
alter table public.lunch_plans
  add constraint lunch_plans_off_reason_coherent
  check (off_reason is null or restaurant_id is null);

-- Contrôle :
--   select day,
--          count(*) filter (where restaurant_id is not null)   as au_resto,
--          count(*) filter (where off_reason = 'on_site')      as sans_resto,
--          count(*) filter (where off_reason = 'away')         as absents,
--          count(*) filter (where restaurant_id is null
--                             and off_reason is null)          as non_precise
--   from public.lunch_plans
--   group by day
--   order by day desc;
