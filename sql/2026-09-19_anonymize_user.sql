-- =============================================================================
-- Suppression de compte = contributions anonymisées — 2026-09-19
-- Décision (politique de confidentialité, registre) : un compte n'est supprimé
-- qu'à la demande de la personne ; ses avis, photos et menus restent alors,
-- anonymisés (« Ancien collaborateur »), sauf si elle demande aussi leur
-- effacement.
--
-- Mise en œuvre : sur ces trois tables, `user_id` devient nullable et la clé
-- étrangère passe de `on delete cascade` à `on delete set null`. Supprimer le
-- compte auth (Edge Function admin-delete-user) anonymise donc de lui-même ;
-- le mode « effacer aussi » de la fonction supprime les lignes (et les
-- fichiers) avant. Tout le reste (favoris, votes, réactions, succès, tablées,
-- profil, demandes, messages…) continue de partir en cascade : ce sont des
-- données de la personne, pas des contributions utiles aux autres.
--
-- Effets à connaître :
--   - unique (restaurant_id, user_id) sur reviews : plusieurs NULL cohabitent,
--     donc plusieurs avis anonymes par restaurant — voulu ;
--   - les policies « own » (user_id = auth.uid()) ne matchent jamais NULL :
--     une contribution anonymisée ne se modifie plus, l'admin peut la
--     supprimer ;
--   - `enforce_one_photo_per_user` compte `where user_id = new.user_id` :
--     les photos anonymes ne comptent pour personne.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Rejouable.
-- =============================================================================
do $$
declare
  t text;
  fk text;
begin
  foreach t in array array['reviews', 'restaurant_photos', 'restaurant_menus'] loop
    execute format('alter table public.%I alter column user_id drop not null', t);

    -- Nom réel de la contrainte FK sur user_id (posée sans nom explicite).
    select c.conname into fk
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.conrelid = ('public.' || t)::regclass
       and c.contype = 'f'
       and a.attname = 'user_id';
    if fk is not null then
      execute format('alter table public.%I drop constraint %I', t, fk);
    end if;
    execute format(
      'alter table public.%I add constraint %I foreign key (user_id) '
      'references auth.users (id) on delete set null',
      t, t || '_user_id_fkey'
    );
  end loop;
end $$;

-- Vérification :
--   select conrelid::regclass, conname, confdeltype   -- 'n' = set null
--     from pg_constraint
--    where conname in ('reviews_user_id_fkey', 'restaurant_photos_user_id_fkey',
--                      'restaurant_menus_user_id_fkey');
