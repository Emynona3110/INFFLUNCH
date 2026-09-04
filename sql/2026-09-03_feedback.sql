-- =============================================================================
-- Retours des collaborateurs — 2026-09-03
-- Un seul canal pour les trois natures de demande sur l'APPLI : un bug, une
-- amélioration de l'existant, une fonctionnalité qui manque. Le `type` les
-- distingue, pas trois écrans.
--
-- Traitement côté admin : accepter une demande la reporte dans `admin_notes`
-- (le carnet de backlog) et la classe « acceptée » ; la refuser la classe sans
-- rien créer. Dans les deux cas la demande RESTE dans la boîte de réception,
-- simplement grisée — l'admin peut changer d'avis à tout moment.
--
-- `note_id` retient la note créée : ré-accepter une demande modifiée met cette
-- note à jour au lieu d'en créer une deuxième, et la refuser après coup la
-- retire du carnet (une demande refusée n'a rien à y faire).
--
-- L'auteur peut corriger sa demande tant qu'elle vit. Un trigger la remet alors
-- en attente : elle ressort du grisé côté admin, qui la revoit. Le même trigger
-- empêche l'auteur de toucher au statut ou au lien vers la note.
--
-- ⚠️ À ne pas confondre avec deux autres tables voisines (séparation voulue par
-- le user le 2026-09-03) :
--   - `admin_notes` : le carnet PRIVÉ des admins, personne d'autre n'y écrit ;
--   - les futures propositions d'ajout/modification de RESTAURANT, qui portent
--     une charge utile structurée et s'appliquent à une fiche — cycle de vie
--     différent, table différente.
--
-- Notification push des admins : ajouter dans le Dashboard un Database Webhook
-- sur INSERT de `public.feedback` vers l'Edge Function `notify-admins` (la même
-- que pour les demandes d'accès — elle distingue les deux par `payload.table`),
-- avec le header `x-hook-secret` valant PUSH_HOOK_SECRET.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Table ---------------------------------------------------------------------
create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  type       text not null check (type in ('bug', 'amelioration', 'fonctionnalite')),
  message    text not null,
  status     text not null default 'nouveau',
  author_id  uuid not null default auth.uid()
             references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

-- Statuts, posés à part pour que ce fichier reste rejouable si la table existe
-- déjà : « acceptée » veut dire reportée dans le carnet de backlog admin.
alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback add constraint feedback_status_check
  check (status in ('nouveau', 'accepte', 'refuse'));

-- La page d'origine a été retirée de l'affichage : on ne la stocke plus.
alter table public.feedback drop column if exists page;

-- Lien vers la note de backlog créée à l'acceptation. `set null` : si l'admin
-- supprime la note du carnet, la demande se retrouve simplement délièe et un
-- nouveau clic sur « accepter » recrée une note.
alter table public.feedback
  add column if not exists note_id bigint
  references public.admin_notes(id) on delete set null;

-- Boîte de réception admin : les demandes en attente d'abord, puis les plus
-- récentes.
create index if not exists feedback_status_idx
  on public.feedback (status, created_at desc);
create index if not exists feedback_author_idx
  on public.feedback (author_id, created_at desc);

-- 2) handled_at suit le statut --------------------------------------------------
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

  -- Correction par l'auteur : la demande repart en attente (elle ressort du
  -- grisé côté admin). Ni le statut ni le lien vers la note ne lui appartiennent.
  if not actor_is_admin then
    new.status := 'nouveau';
    new.note_id := old.note_id;
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

-- 3) RLS ------------------------------------------------------------------------
-- Chacun voit, écrit et corrige SES demandes ; les admins voient tout et sont
-- seuls à les classer.
alter table public.feedback enable row level security;

drop policy if exists "feedback select own or admin" on public.feedback;
create policy "feedback select own or admin"
on public.feedback for select to authenticated
using (
  author_id = auth.uid()
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

drop policy if exists "feedback insert own" on public.feedback;
create policy "feedback insert own"
on public.feedback for insert to authenticated
with check (author_id = auth.uid());

-- L'auteur corrige sa demande, l'admin la classe. Le trigger ci-dessus décide
-- de ce que chacun peut réellement changer.
drop policy if exists "feedback update admin" on public.feedback;
drop policy if exists "feedback update own or admin" on public.feedback;
create policy "feedback update own or admin"
on public.feedback for update to authenticated
using (
  author_id = auth.uid()
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
)
with check (
  author_id = auth.uid()
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

drop policy if exists "feedback delete own or admin" on public.feedback;
create policy "feedback delete own or admin"
on public.feedback for delete to authenticated
using (
  author_id = auth.uid()
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
