-- =============================================================================
-- Images jointes aux demandes — 2026-09-18
-- Fait suite à `2026-09-04_feedback_cycle.sql`.
--
-- Une demande (bug surtout) se comprend mieux avec une capture : jusqu'à
-- 3 images par demande. Les fichiers vivent dans un bucket dédié
-- `feedback-images` (public, comme les photos de restos), rangés par auteur :
-- `{userId}/{horodatage}-{court}.webp`. La table `feedback` ne porte que les
-- chemins (`images text[]`), dans l'ordre choisi par l'auteur.
--
-- Les images suivent le même cycle que le texte : une correction qui change
-- les images archive la version d'avant (avec SES images) et remet la demande
-- en attente ; une demande figée (terminée, refusée, retirée) garde les siennes.
--
-- Les notes du carnet de backlog (`admin_notes`) en ont aussi : celles qu'un
-- admin joint à sa note, ou celles de la demande acceptée (mêmes fichiers).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Rejouable.
-- =============================================================================

-- 1) Colonnes ------------------------------------------------------------------
alter table public.feedback
  add column if not exists images text[] not null default '{}';

alter table public.feedback drop constraint if exists feedback_images_max;
alter table public.feedback add constraint feedback_images_max
  check (cardinality(images) <= 3);

alter table public.feedback_revisions
  add column if not exists images text[] not null default '{}';

alter table public.admin_notes
  add column if not exists images text[] not null default '{}';

alter table public.admin_notes drop constraint if exists admin_notes_images_max;
alter table public.admin_notes add constraint admin_notes_images_max
  check (cardinality(images) <= 3);

-- 2) Trigger : les images comptent comme le texte ------------------------------
create or replace function public.feedback_touch_handled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) into actor_is_admin;

  if not actor_is_admin then
    -- Seule décision qui lui appartient : retirer sa demande.
    if new.cancelled_at is null then
      new.cancelled_at := old.cancelled_at;
    end if;
    new.status := old.status;
    new.note_id := old.note_id;

    -- Figée : classée sans retour possible (terminée ou refusée), ou retirée
    -- par son auteur. Elle ne se lit plus qu'en consultation.
    if old.status in ('termine', 'refuse') or old.cancelled_at is not null then
      new.message := old.message;
      new.type := old.type;
      new.images := old.images;
    end if;
  end if;

  -- Le contenu (texte, nature ou images) a changé : version archivée et
  -- retour en attente si la demande avait déjà été classée, retouche en place
  -- sinon (cf. `2026-09-04_feedback_cycle.sql`).
  if new.message is distinct from old.message
     or new.type is distinct from old.type
     or new.images is distinct from old.images then
    if old.status <> 'nouveau' then
      insert into public.feedback_revisions (feedback_id, version, type, message, images)
      values (old.id, old.edits + 1, old.type, old.message, old.images);
      new.edits := old.edits + 1;
      new.status := 'nouveau';
    end if;
    new.updated_at := now();
  end if;

  if new.status is distinct from old.status then
    new.handled_at := case when new.status = 'nouveau' then null else now() end;
  end if;
  return new;
end;
$$;

-- 3) Bucket `feedback-images` ---------------------------------------------------
insert into storage.buckets (id, name, public)
values ('feedback-images', 'feedback-images', true)
on conflict (id) do nothing;

-- Même logique que `avatars` : chacun écrit et supprime dans SON dossier, pas
-- de policy SELECT large (lecture par URL publique, pas de listing). L'admin
-- peut supprimer n'importe quel fichier (suppression d'une demande).
drop policy if exists "feedback-images insert own"   on storage.objects;
drop policy if exists "feedback-images delete own"   on storage.objects;
drop policy if exists "feedback-images delete admin" on storage.objects;

create policy "feedback-images insert own"
on storage.objects for insert to authenticated
with check (bucket_id = 'feedback-images' and name like (auth.uid()::text || '/%'));

create policy "feedback-images delete own"
on storage.objects for delete to authenticated
using (bucket_id = 'feedback-images' and name like (auth.uid()::text || '/%'));

create policy "feedback-images delete admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'feedback-images'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

-- 4) Vérification ---------------------------------------------------------------
--   select column_name from information_schema.columns
--    where table_name in ('feedback', 'feedback_revisions', 'admin_notes')
--      and column_name = 'images';
--   select id, public from storage.buckets where id = 'feedback-images';
