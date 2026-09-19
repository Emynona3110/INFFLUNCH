-- =============================================================================
-- Demandes : fil de discussion, états « Répondue » / « Clôturée », « vu » en
-- base, correction limitée à l'attente, clôture automatique — 2026-09-19
--
-- UN SEUL script pour toute la refonte du jour (remplace les brouillons
-- feedback_seen / feedback_messages / feedback_messages_edit / feedback_close,
-- jamais joués). Rejouable. À exécuter sur le projet Supabase
-- (ref ilonqaqyqmvsfskwgqka).
--
-- Ce que ça change :
--   1. `profiles.feedback_seen_at` : la puce « du nouveau sur mes demandes »
--      est propre au compte, tous appareils (comme succès et nouveautés) ;
--   2. `feedback_messages` : un fil sous chaque demande, admin et auteur
--      s'y écrivent ; chacun peut corriger SES messages (`edited_at`) ;
--   3. deux états de plus : « répondue » (l'admin a écrit, la balle est chez
--      l'auteur ; posé par trigger, retiré dès que l'auteur répond) et
--      « clôturée » (le fil a réglé la question — appui long de l'admin, ou
--      automatique après 14 jours sans réaction de l'auteur) ;
--   4. SIMPLIFICATION : l'auteur ne corrige sa demande que tant qu'elle est EN
--      ATTENTE. Après, il précise dans le fil. Plus de version archivée ni de
--      retour en attente automatique (la table `feedback_revisions` et
--      `feedback.edits` restent, pour l'historique déjà constitué) ;
--   5. verrous du fil : l'auteur n'écrit plus dès que la demande est terminée,
--      refusée ou clôturée ; sur une clôturée, personne — l'admin la rouvre
--      d'abord.
-- =============================================================================

-- 1) Puce « vu » en base ----------------------------------------------------------
alter table public.profiles
  add column if not exists feedback_seen_at timestamptz;

-- État initial : tout ce qui a été classé jusqu'ici est considéré vu — pas de
-- rafale de puces à la migration. Un compte sans ligne `profiles` en reçoit
-- une pour la même raison.
insert into public.profiles (id, feedback_seen_at)
select u.id, now()
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);

update public.profiles
   set feedback_seen_at = now()
 where feedback_seen_at is null;

-- 2) Fil de discussion ------------------------------------------------------------
create table if not exists public.feedback_messages (
  id          bigint generated always as identity primary key,
  feedback_id bigint not null references public.feedback (id) on delete cascade,
  author_id   uuid   not null references auth.users (id) on delete cascade,
  body        text   not null check (btrim(body) <> '' and length(body) <= 2000),
  created_at  timestamptz not null default now(),
  -- Dernière retouche du texte par son auteur.
  edited_at   timestamptz
);

create index if not exists feedback_messages_feedback_idx
  on public.feedback_messages (feedback_id, created_at);

alter table public.feedback_messages enable row level security;

-- On lit le fil des demandes qu'on peut lire (les siennes, tout pour l'admin).
drop policy if exists "feedback_messages select own feedback or admin" on public.feedback_messages;
create policy "feedback_messages select own feedback or admin"
on public.feedback_messages for select to authenticated
using (
  exists (
    select 1 from public.feedback f
     where f.id = feedback_id
       and (
         f.author_id = auth.uid()
         or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
       )
  )
);

-- On écrit en son nom. Personne sur une demande clôturée. L'admin partout
-- ailleurs ; l'auteur sous ses propres demandes tant qu'elles ne sont ni
-- retirées ni classées sans retour (terminée, refusée).
drop policy if exists "feedback_messages insert own" on public.feedback_messages;
create policy "feedback_messages insert own"
on public.feedback_messages for insert to authenticated
with check (
  author_id = auth.uid()
  and not exists (
    select 1 from public.feedback f where f.id = feedback_id and f.status = 'clos'
  )
  and (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.feedback f
       where f.id = feedback_id
         and f.author_id = auth.uid()
         and f.cancelled_at is null
         and f.status not in ('termine', 'refuse', 'clos')
    )
  )
);

-- Chacun corrige SES messages (texte seulement, cf. trigger) ; seul l'admin
-- peut en effacer un.
drop policy if exists "feedback_messages update own" on public.feedback_messages;
create policy "feedback_messages update own"
on public.feedback_messages for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "feedback_messages delete admin" on public.feedback_messages;
create policy "feedback_messages delete admin"
on public.feedback_messages for delete to authenticated
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

create or replace function public.feedback_messages_touch_edited()
returns trigger
language plpgsql
as $$
begin
  -- Seul le texte se corrige : le reste est figé.
  new.feedback_id := old.feedback_id;
  new.author_id   := old.author_id;
  new.created_at  := old.created_at;
  if new.body is distinct from old.body then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_feedback_messages_touch_edited on public.feedback_messages;
create trigger trg_feedback_messages_touch_edited
before update on public.feedback_messages
for each row execute function public.feedback_messages_touch_edited();

-- Realtime : un message apparaît chez l'autre (et allume sa puce) sans
-- recharger.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'feedback_messages'
  ) then
    alter publication supabase_realtime add table public.feedback_messages;
  end if;
end $$;

-- 3) États « répondue » et « clôturée » ------------------------------------------
alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback add constraint feedback_status_check
  check (status in ('nouveau', 'repondu', 'accepte', 'refuse', 'termine', 'clos'));

-- Un message de l'admin sur une demande EN ATTENTE la passe en « répondue » :
-- elle sort de ce que l'admin doit traiter sans être classée. Un message de
-- l'auteur sur une « répondue » la remet en attente. Les autres états ne
-- bougent pas : on peut discuter sous une acceptée, ça ne rouvre rien (mais
-- le dernier mot à l'auteur compte comme « à traiter » côté client).
--
-- `feedback_touch_handled` interdit à un non-admin de toucher au statut : ce
-- basculement, déclenché par un message de l'auteur (ou par la clôture
-- automatique, sans utilisateur), passerait donc par quelqu'un sans droit.
-- D'où un drapeau local à la transaction, que `feedback_touch_handled`
-- respecte.
create or replace function public.feedback_messages_sync_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_is_admin boolean;
  f public.feedback%rowtype;
begin
  select * into f from public.feedback where id = new.feedback_id;
  if not found then
    return null;
  end if;

  select exists (
    select 1 from public.users where id = new.author_id and role = 'admin'
  ) into author_is_admin;

  perform set_config('feedback.sync_status', 'on', true);
  if author_is_admin and new.author_id <> f.author_id and f.status = 'nouveau' then
    update public.feedback set status = 'repondu' where id = f.id;
  elsif new.author_id = f.author_id and f.status = 'repondu' then
    update public.feedback set status = 'nouveau' where id = f.id;
  end if;
  perform set_config('feedback.sync_status', '', true);
  return null;
end;
$$;

drop trigger if exists trg_feedback_messages_sync_status on public.feedback_messages;
create trigger trg_feedback_messages_sync_status
after insert on public.feedback_messages
for each row execute function public.feedback_messages_sync_status();

-- 4) Ce que l'auteur peut encore faire de sa demande ------------------------------
-- REMPLACE la version de `2026-09-18_feedback_images.sql`.
--   - il corrige texte, nature, images TANT QU'ELLE EST EN ATTENTE ; après,
--     tout est figé (le fil est là pour préciser) — donc plus de version
--     archivée ni de retour en attente ;
--   - il retire sa demande (cancelled_at) ;
--   - statut et lien backlog sont à l'admin, ou au drapeau `sync_status`.
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

  if not actor_is_admin
     and coalesce(current_setting('feedback.sync_status', true), '') <> 'on' then
    -- Seule décision qui lui appartient : retirer sa demande.
    if new.cancelled_at is null then
      new.cancelled_at := old.cancelled_at;
    end if;
    new.status := old.status;
    new.note_id := old.note_id;

    -- Figée dès qu'elle n'est plus en attente, ou retirée par son auteur.
    if old.status <> 'nouveau' or old.cancelled_at is not null then
      new.message := old.message;
      new.type := old.type;
      new.images := old.images;
    end if;
  end if;

  -- Retouche en place : c'est la date de la dernière version, elle donne
  -- l'ordre de la boîte de réception.
  if new.message is distinct from old.message
     or new.type is distinct from old.type
     or new.images is distinct from old.images then
    new.updated_at := now();
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

-- 5) Clôture automatique ----------------------------------------------------------
-- Une « répondue » sans réaction de l'auteur depuis 14 jours (ni message, ni
-- changement d'état) se clôture seule : la boîte ne s'encombre pas, et
-- l'auteur voit « Clôturée » (sa puce s'allume, il peut toujours tout relire).
-- L'admin peut rouvrir. Tourne chaque nuit via pg_cron (extension à activer
-- une fois : Dashboard → Database → Extensions → pg_cron, ou la ligne
-- ci-dessous).
create or replace function public.feedback_autoclose(p_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  perform set_config('feedback.sync_status', 'on', true);
  with stale as (
    select f.id
      from public.feedback f
     where f.status = 'repondu'
       and greatest(
             coalesce(f.handled_at, f.created_at),
             coalesce((select max(m.created_at) from public.feedback_messages m
                        where m.feedback_id = f.id), f.created_at)
           ) < now() - make_interval(days => p_days)
  )
  update public.feedback f
     set status = 'clos'
    from stale
   where f.id = stale.id;
  get diagnostics n = row_count;
  perform set_config('feedback.sync_status', '', true);
  return n;
end;
$$;

-- Forme recommandée par Supabase (schéma pg_catalog + droits au rôle postgres).
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
       from cron.job where jobname = 'feedback-autoclose';
    perform cron.schedule(
      'feedback-autoclose',
      '15 3 * * *',              -- chaque nuit, 03:15 UTC
      $job$ select public.feedback_autoclose(14); $job$
    );
  end if;
end $$;

-- Vérifications :
--   select prosrc like '%old.status <> ''nouveau'' or%' as regle_en_place
--     from pg_proc where proname = 'feedback_touch_handled';   -- true
--   select jobname, schedule from cron.job;                      -- feedback-autoclose
--   select public.feedback_autoclose(14);                        -- test manuel
