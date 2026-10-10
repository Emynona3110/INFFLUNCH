-- =============================================================================
-- Propositions de restos : suppressions indépendantes de chaque côté — 2026-10-10
-- Règle (rappel du user) : supprimer côté admin ne supprime pas côté auteur, et
-- réciproquement. Plus aucune suppression physique depuis l'appli :
--   - l'auteur « supprime » → `cancelled_at` : sort de SA liste, l'admin la
--     garde (marquée « Annulée » si elle attendait encore) ;
--   - l'admin « supprime » → `deleted_at` : sort de SA table, l'auteur la garde.
-- Fait suite à `2026-10-10_restaurant_suggestions_edit.sql`. Rejouable.
-- =============================================================================

alter table public.restaurant_suggestions
  add column if not exists deleted_at timestamptz;

create or replace function public.restaurant_suggestions_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.handled_at := case when new.status = 'nouveau' then null else now() end;
    end if;
    return new;
  end if;

  -- Auteur, à l'insertion : il ne peut pas se pré-accepter.
  if tg_op = 'INSERT' then
    new.status := 'nouveau';
    new.restaurant_id := null;
    new.admin_reply := null;
    new.handled_at := null;
    new.cancelled_at := null;
    new.deleted_at := null;
    new.updated_at := null;
    return new;
  end if;

  -- Auteur, en update : la décision et la suppression de l'admin ne lui
  -- appartiennent pas (il ne peut que retirer la proposition de SA liste).
  new.status := old.status;
  new.restaurant_id := old.restaurant_id;
  new.admin_reply := old.admin_reply;
  new.handled_at := old.handled_at;
  new.deleted_at := old.deleted_at;
  new.author_id := old.author_id;
  new.created_at := old.created_at;

  if old.status <> 'nouveau' or old.cancelled_at is not null then
    -- Tranchée ou retirée : plus rien ne se corrige.
    new.name := old.name;
    new.address := old.address;
    new.phone := old.phone;
    new.website := old.website;
    new.tags := old.tags;
    new.comment := old.comment;
    new.lat := old.lat;
    new.lng := old.lng;
    new.updated_at := old.updated_at;
  elsif (new.name, new.address, new.phone, new.website, new.tags, new.comment, new.lat, new.lng)
        is distinct from
        (old.name, old.address, old.phone, old.website, old.tags, old.comment, old.lat, old.lng) then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

-- Plus de suppression physique par l'auteur : il masque (`cancelled_at`).
-- L'admin garde la suppression physique en base (ménage manuel éventuel), mais
-- l'appli ne s'en sert plus.
drop policy if exists "suggestions delete own pending or admin" on public.restaurant_suggestions;
drop policy if exists "suggestions delete admin" on public.restaurant_suggestions;
create policy "suggestions delete admin"
on public.restaurant_suggestions for delete to authenticated
using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
