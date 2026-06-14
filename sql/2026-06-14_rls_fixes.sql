-- =============================================================================
-- Correctifs RLS — 2026-06-14
-- Objectif : corriger 2 failles d'accès détectées lors de l'audit RLS.
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) FAVORITES : chaque utilisateur ne gère QUE ses propres favoris
-- -----------------------------------------------------------------------------
-- Avant : policy "ALL ... using(true)" => tout utilisateur connecté pouvait
--         lire ET modifier les favoris de TOUT LE MONDE.
-- Après : accès limité aux lignes où user_id = l'utilisateur courant.

drop policy if exists "Enable all for authenticated users only" on public.favorites;

create policy "Users manage own favorites"
on public.favorites
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- (optionnel mais recommandé) empêche les doublons de favoris au niveau base
alter table public.favorites
  add constraint favorites_user_restaurant_key unique (user_id, restaurant_id);


-- -----------------------------------------------------------------------------
-- 2) WAITING_LIST : ne plus exposer les emails au public
-- -----------------------------------------------------------------------------
-- Avant : policy SELECT "for all users" (rôle public) => n'importe qui avec la
--         clé publishable (présente dans le bundle) pouvait lister TOUS les emails.
-- Le code (useJoinWaitingList) faisait un SELECT anon pour dédoublonner avant
-- insertion : c'est CE besoin qui justifiait la lecture publique.
--
-- Solution : on déplace le dédoublonnage au niveau base (contrainte UNIQUE),
-- ce qui permet de supprimer la lecture publique. La lecture devient admin-only.
-- L'INSERT reste public (formulaire d'inscription, utilisateur non connecté).
--
-- ⚠️ Ce changement EXIGE la modif de code associée dans useJoinWaitingList.ts
--    (supprimer le pré-check SELECT, gérer l'erreur 23505 = déjà inscrit).

-- Dédoublonnage garanti côté base
alter table public.waiting_list
  add constraint waiting_list_email_key unique (email);

-- Supprime la lecture publique des emails
drop policy if exists "Enable read access for all users" on public.waiting_list;

-- Lecture réservée aux admins (cohérent avec UPDATE/DELETE déjà admin-only)
create policy "Enable read for admins only"
on public.waiting_list
for select
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- NB : la policy INSERT publique existante ("Enable insert access for all users")
--      est conservée telle quelle — nécessaire pour le formulaire d'inscription.
