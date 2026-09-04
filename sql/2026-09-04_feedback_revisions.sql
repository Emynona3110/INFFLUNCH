-- =============================================================================
-- Historique des demandes — 2026-09-04
-- L'auteur peut corriger sa demande autant de fois qu'il veut : elle reste LA
-- MÊME demande (même id, même fil de traitement), mais l'admin doit pouvoir
-- distinguer celles qui ont bougé et relire ce qu'elles disaient avant.
--
-- Choix : la version courante reste dans `feedback` (rien ne change pour les
-- écrans existants) et chaque version REMPLACÉE part dans `feedback_revisions`.
-- Deux compteurs sur la demande évitent un COUNT par ligne dans la liste :
--   - `edits`      : nombre de corrections (0 = jamais modifiée) ;
--   - `updated_at` : date de la dernière correction (null si aucune).
--
-- L'archivage est fait par le trigger, jamais par le client : personne ne peut
-- écrire ni réécrire l'historique (aucune policy insert/update/delete).
--
-- Les deux règles du cycle de vie, rappelées ici parce qu'elles se lisent dans
-- ce fichier :
--   - corriger une demande DÉJÀ CLASSÉE la remet EN ATTENTE et archive la
--     version sur laquelle l'admin s'était prononcé (il doit de nouveau
--     l'accepter — ce qui reporte le nouveau texte sur la note du carnet — ou
--     la refuser). Corriger une demande encore en attente retouche la version
--     en cours, sans en empiler une nouvelle : voir `2026-09-04_feedback_cycle.sql`,
--     qui a le dernier mot sur le trigger ;
--   - supprimer sa demande n'enlève RIEN du carnet de backlog : la note vit sa
--     vie côté admin (seules les révisions partent, en cascade).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Compteurs sur la demande ---------------------------------------------------
alter table public.feedback
  add column if not exists edits integer not null default 0,
  add column if not exists updated_at timestamptz;

-- 2) Table des versions remplacées ----------------------------------------------
create table if not exists public.feedback_revisions (
  id          bigint generated always as identity primary key,
  feedback_id bigint not null references public.feedback(id) on delete cascade,
  -- 1 = version d'origine, puis 2, 3… La version courante porte le numéro
  -- `feedback.edits + 1`.
  version     integer not null,
  type        text not null,
  message     text not null,
  -- Date à laquelle cette version a cédé la place à la suivante.
  replaced_at timestamptz not null default now(),
  unique (feedback_id, version)
);

create index if not exists feedback_revisions_feedback_idx
  on public.feedback_revisions (feedback_id, version desc);

-- 3) Archivage à chaque correction ----------------------------------------------
-- Greffé sur le trigger existant (`feedback_touch_handled`), qui remet déjà la
-- demande en attente quand son auteur la corrige : même événement, une seule
-- lecture pour comprendre le cycle de vie.
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

  -- Ni le statut ni le lien vers la note n'appartiennent à l'auteur : classer
  -- une demande est l'affaire des admins.
  if not actor_is_admin then
    new.status := old.status;
    new.note_id := old.note_id;
  end if;

  -- Le contenu a changé : la version d'avant est archivée telle quelle, les
  -- compteurs suivent, et la demande REPART EN ATTENTE — elle ressort du grisé
  -- côté admin, qui doit de nouveau l'accepter (le carnet est alors mis à jour)
  -- ou la refuser. On se fie au contenu et non au rôle de celui qui écrit : un
  -- admin qui corrige SA PROPRE demande la remet lui aussi en attente.
  -- À l'inverse, un simple changement de statut ne crée aucune révision.
  if new.message is distinct from old.message
     or new.type is distinct from old.type then
    insert into public.feedback_revisions (feedback_id, version, type, message)
    values (old.id, old.edits + 1, old.type, old.message);
    new.edits := old.edits + 1;
    new.updated_at := now();
    new.status := 'nouveau';
  end if;

  if new.status is distinct from old.status then
    new.handled_at := case when new.status = 'nouveau' then null else now() end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_feedback_touch_handled on public.feedback;
create trigger trg_feedback_touch_handled
before update on public.feedback
for each row execute function public.feedback_touch_handled();

-- 4) RLS : lecture seule, mêmes yeux que la demande -----------------------------
-- Aucune policy d'écriture : seul le trigger (security definer) alimente la
-- table, l'historique est donc inaltérable depuis le client.
alter table public.feedback_revisions enable row level security;

drop policy if exists "feedback_revisions select own or admin" on public.feedback_revisions;
create policy "feedback_revisions select own or admin"
on public.feedback_revisions for select to authenticated
using (
  exists (
    select 1 from public.feedback f
    where f.id = feedback_id
      and (
        f.author_id = auth.uid()
        or exists (
          select 1 from public.users where id = auth.uid() and role = 'admin'
        )
      )
  )
);
