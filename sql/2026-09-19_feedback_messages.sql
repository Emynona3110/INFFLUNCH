-- =============================================================================
-- Fil de discussion sur une demande — 2026-09-19
-- Jusqu'ici l'auteur ne recevait qu'un statut (acceptée / refusée / terminée).
-- L'admin et l'auteur peuvent désormais s'écrire sous la demande : un fil de
-- messages immuables, dans l'ordre, qui fait l'historique de l'échange.
--
-- Côté client, la puce « du nouveau sur mes demandes » (`profiles.
-- feedback_seen_at`, même jour) s'allume pour l'auteur sur un classement
-- (`handled_at`) comme sur un message de l'admin ; côté admin, une demande dont
-- le dernier mot est à l'auteur compte comme « à traiter ».
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Rejouable.
-- =============================================================================
create table if not exists public.feedback_messages (
  id          bigint generated always as identity primary key,
  feedback_id bigint not null references public.feedback (id) on delete cascade,
  author_id   uuid   not null references auth.users (id) on delete cascade,
  body        text   not null check (btrim(body) <> '' and length(body) <= 2000),
  created_at  timestamptz not null default now()
);

create index if not exists feedback_messages_feedback_idx
  on public.feedback_messages (feedback_id, created_at);

-- RLS : on lit le fil des demandes qu'on peut lire (les siennes, tout pour
-- l'admin). On y écrit en son nom : l'admin partout, l'auteur sous ses propres
-- demandes tant qu'il ne les a pas retirées. Personne ne modifie un message ;
-- seul l'admin peut en effacer un.
alter table public.feedback_messages enable row level security;

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

drop policy if exists "feedback_messages insert own" on public.feedback_messages;
create policy "feedback_messages insert own"
on public.feedback_messages for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.feedback f
       where f.id = feedback_id
         and f.author_id = auth.uid()
         and f.cancelled_at is null
    )
  )
);

drop policy if exists "feedback_messages delete admin" on public.feedback_messages;
create policy "feedback_messages delete admin"
on public.feedback_messages for delete to authenticated
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Realtime : un message de l'admin apparaît chez l'auteur (et allume sa puce)
-- sans recharger, et réciproquement dans la boîte de réception.
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

-- =============================================================================
-- État « Répondue » : la balle est dans le camp de l'auteur
-- Un message de l'admin sur une demande EN ATTENTE la passe en « répondue » :
-- elle sort de ce que l'admin doit traiter (puce, mise en avant) sans être
-- classée pour autant. Un message de l'auteur sur une demande « répondue » la
-- remet en attente. Les demandes déjà classées (acceptée, terminée, refusée)
-- gardent leur état : on peut y discuter, ça ne rouvre rien.
-- =============================================================================
alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback add constraint feedback_status_check
  check (status in ('nouveau', 'repondu', 'accepte', 'refuse', 'termine'));

-- `feedback_touch_handled` interdit à un non-admin de toucher au statut : le
-- basculement ci-dessous, déclenché par un message de l'auteur, passerait donc
-- par un utilisateur sans droit. Le trigger des messages pose un drapeau local
-- à la transaction que `feedback_touch_handled` respecte.
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

-- REMPLACE la version de `2026-09-18_feedback_images.sql` : seule nouveauté,
-- le drapeau `feedback.sync_status` qui laisse passer le basculement d'état
-- déclenché par un message (voir ci-dessus). Une correction d'une demande
-- « répondue » archive une version et la remet en attente, comme pour une
-- demande classée : l'admin avait répondu à l'ancien texte.
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

    -- Figée : classée sans retour possible (terminée ou refusée), ou retirée
    -- par son auteur. Elle ne se lit plus qu'en consultation.
    if old.status in ('termine', 'refuse') or old.cancelled_at is not null then
      new.message := old.message;
      new.type := old.type;
      new.images := old.images;
    end if;
  end if;

  -- Le contenu (texte, nature ou images) a changé : version archivée et
  -- retour en attente si la demande avait déjà été classée ou répondue,
  -- retouche en place sinon (cf. `2026-09-04_feedback_cycle.sql`).
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

-- Vérification (doit renvoyer true) :
--   select prosrc like '%feedback.sync_status%' as regle_en_place
--     from pg_proc where proname = 'feedback_touch_handled';
