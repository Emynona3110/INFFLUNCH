-- =============================================================================
-- Carnet de backlog des admins — 2026-09-03
-- Un endroit dans l'appli pour noter idées et bugs repérés à la volée. C'est le
-- carnet PRIVÉ des admins : ni les collaborateurs ni un futur canal de retours
-- utilisateurs ne viennent écrire ici.
--
-- `position` est un numeric : déplacer une tuile entre deux voisines n'écrit
-- qu'UNE ligne (la moyenne des deux positions encadrantes), sans renuméroter la
-- liste entière.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Table ---------------------------------------------------------------------
create table if not exists public.admin_notes (
  id          bigint generated always as identity primary key,
  description text not null,
  category    text not null default 'amelioration'
              check (category in ('correctif', 'amelioration', 'fonctionnalite')),
  position    numeric not null default 0,
  -- Terminé : la note n'est PAS supprimée, elle part en bas de liste, grisée.
  done        boolean not null default false,
  done_at     timestamptz,
  -- Qui a noté (les admins sont plusieurs) ; la note survit au compte supprimé.
  author_id   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Ordre d'affichage : en cours d'abord, puis la position choisie à la souris.
create index if not exists admin_notes_order_idx
  on public.admin_notes (done, position);

-- 2) done_at suit la case à cocher ---------------------------------------------
-- Côté client on ne touche que `done` : la date de clôture est posée (ou
-- effacée si on décoche) ici, elle ne peut donc pas diverger.
create or replace function public.admin_notes_touch_done()
returns trigger
language plpgsql
as $$
begin
  if new.done is distinct from old.done then
    new.done_at := case when new.done then now() else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_admin_notes_touch_done on public.admin_notes;
create trigger trg_admin_notes_touch_done
before update on public.admin_notes
for each row execute function public.admin_notes_touch_done();

-- 3) RLS : admins uniquement, y compris en lecture ------------------------------
alter table public.admin_notes enable row level security;

drop policy if exists "admin_notes select admin" on public.admin_notes;
create policy "admin_notes select admin"
on public.admin_notes for select to authenticated
using (exists (
  select 1 from public.users where id = auth.uid() and role = 'admin'
));

drop policy if exists "admin_notes insert admin" on public.admin_notes;
create policy "admin_notes insert admin"
on public.admin_notes for insert to authenticated
with check (exists (
  select 1 from public.users where id = auth.uid() and role = 'admin'
));

drop policy if exists "admin_notes update admin" on public.admin_notes;
create policy "admin_notes update admin"
on public.admin_notes for update to authenticated
using (exists (
  select 1 from public.users where id = auth.uid() and role = 'admin'
))
with check (exists (
  select 1 from public.users where id = auth.uid() and role = 'admin'
));

drop policy if exists "admin_notes delete admin" on public.admin_notes;
create policy "admin_notes delete admin"
on public.admin_notes for delete to authenticated
using (exists (
  select 1 from public.users where id = auth.uid() and role = 'admin'
));
