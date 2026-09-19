-- =============================================================================
-- Suppression admin = trace chez l'auteur — 2026-09-19
-- Fait suite à `2026-09-19_feedback_thread.sql` et `_cancel_thread.sql`.
-- Jusqu'ici « Supprimer » côté admin effaçait la ligne : la demande
-- disparaissait chez son auteur sans un mot. Désormais elle est seulement
-- marquée `deleted_at` : elle quitte la boîte de réception, mais l'auteur
-- garde sa tuile, grisée, avec l'état « Supprimée » (sa puce s'allume) et
-- tout l'historique en lecture. Il peut la retirer de sa liste lui-même
-- (cancelled_at), comme n'importe quelle demande classée.
--
-- Une demande supprimée est figée pour tout le monde : plus de message, plus
-- de correction.
--
-- Ce script REMPLACE `feedback_touch_handled` (version de
-- `2026-09-19_feedback_thread.sql`) : seule nouveauté, `deleted_at` réservé à
-- l'admin. À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- Rejouable.
-- =============================================================================
alter table public.feedback
  add column if not exists deleted_at timestamptz;

create index if not exists feedback_deleted_idx
  on public.feedback (deleted_at) where deleted_at is null;

-- 1) Plus personne n'écrit sous une demande supprimée ----------------------------
drop policy if exists "feedback_messages insert own" on public.feedback_messages;
create policy "feedback_messages insert own"
on public.feedback_messages for insert to authenticated
with check (
  author_id = auth.uid()
  and not exists (
    select 1 from public.feedback f
     where f.id = feedback_id
       and (f.status = 'clos' or f.deleted_at is not null)
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

-- 2) `deleted_at` est à l'admin ; supprimée = figée ---------------------------------
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
    new.deleted_at := old.deleted_at;

    -- Figée dès qu'elle n'est plus en attente, retirée par son auteur, ou
    -- supprimée par l'admin.
    if old.status <> 'nouveau'
       or old.cancelled_at is not null
       or old.deleted_at is not null then
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

-- Vérification (doit renvoyer true) :
--   select prosrc like '%new.deleted_at := old.deleted_at%' as regle_en_place
--     from pg_proc where proname = 'feedback_touch_handled';
