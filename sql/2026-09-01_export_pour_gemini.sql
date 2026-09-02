-- =============================================================================
-- Export pour Gemini — 2026-09-01
-- Requêtes de LECTURE SEULE à jouer dans l'éditeur SQL Supabase, une par une,
-- puis « Download CSV » sur le résultat. Les CSV obtenus se joignent au prompt
-- (prompts/gemini-1-tags-badges.md et prompts/gemini-2-nouveaux-restaurants.md).
--
-- L'éditeur n'affiche que le résultat de la DERNIÈRE requête exécutée :
-- sélectionne le bloc voulu avant de lancer (Ctrl+Entrée sur la sélection).
--
-- Rien n'est modifié ici.
-- =============================================================================


-- 1) TAGS ---------------------------------------------------------------------
-- → tags.csv
select label
from public.tags
order by label;


-- 2) BADGES -------------------------------------------------------------------
-- → badges.csv
-- ⚠️ Rappel : seuls les badges ayant une icône dans l'app s'affichent
-- (src/services/badgeMap.ts) — Option Végétarienne, Sur Place, À Emporter, Bar,
-- TooGoodToGo, Magasin. Un badge inconnu est silencieusement ignoré à l'écran.
select label
from public.badges
order by label;


-- 3) RESTAURANTS --------------------------------------------------------------
-- → restaurants.csv
-- Les tableaux sont aplatis en texte (« Italien | À Emporter ») : plus lisible
-- pour un LLM que la notation Postgres {a,b}.
select
  r.name,
  r.slug,                                   -- identifiant à utiliser dans le SQL de retour
  r.address,
  r.website,
  r.lat,
  r.lng,
  r.walk_minutes,
  array_to_string(r.tags, ' | ')   as tags,
  array_to_string(r.badges, ' | ') as badges,
  r.closed
from public.restaurants r
order by r.name;


-- 4) VARIANTE TOUT-EN-UN (optionnelle) ----------------------------------------
-- Renvoie une seule cellule contenant les trois listes déjà mises en forme :
-- à copier-coller directement dans Gemini si tu préfères éviter les pièces
-- jointes. Le « Download CSV » fonctionne aussi sur cette requête.
select
  '## Tags existants (' || (select count(*) from public.tags) || E')\n'
  || coalesce((select string_agg(label, ', ' order by label) from public.tags), '(aucun)')
  || E'\n\n## Badges existants (' || (select count(*) from public.badges) || E')\n'
  || coalesce((select string_agg(label, ', ' order by label) from public.badges), '(aucun)')
  || E'\n\n## Restaurants (' || (select count(*) from public.restaurants) || E')\n'
  || coalesce(
       (select string_agg(
          '### ' || r.name || E'\n'
          || '- slug : ' || coalesce(r.slug, '?') || E'\n'
          || '- adresse : ' || coalesce(r.address, 'inconnue') || E'\n'
          || '- site web : ' || coalesce(r.website, 'inconnu') || E'\n'
          || '- coordonnées : ' || coalesce(r.lat::text, '?') || ', ' || coalesce(r.lng::text, '?') || E'\n'
          || '- tags actuels : ' || coalesce(nullif(array_to_string(r.tags, ', '), ''), 'aucun') || E'\n'
          || '- badges actuels : ' || coalesce(nullif(array_to_string(r.badges, ', '), ''), 'aucun')
          || case when r.closed then E'\n- FERMÉ définitivement (ne pas retaguer)' else '' end,
          E'\n\n' order by r.name)
        from public.restaurants r),
       '(aucun)')
  as donnees_pour_gemini;
