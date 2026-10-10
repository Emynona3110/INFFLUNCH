-- =============================================================================
-- Propositions de restos : correction et retrait par l'auteur — 2026-10-10
-- Fait suite à `2026-10-10_restaurant_suggestions.sql`. Mêmes règles que les
-- demandes (`feedback`) :
--   - tant qu'elle est EN ATTENTE, l'auteur corrige sa proposition (en place) ;
--   - « Supprimer » l'efface pour de bon tant qu'elle attend (policy delete
--     existante) ; une fois tranchée, elle est seulement RETIRÉE de sa liste
--     (`cancelled_at`) — l'admin la garde, la fiche créée vit sa vie.
-- Le trigger décide de ce que l'auteur peut réellement changer : jamais le
-- statut, la fiche liée ni la réponse ; le contenu seulement en attente.
-- Rejouable.
-- =============================================================================

alter table public.restaurant_suggestions
  add column if not exists cancelled_at timestamptz,
  add column if not exists updated_at   timestamptz;

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
    new.updated_at := null;
    return new;
  end if;

  -- Auteur, en update : la décision de l'admin ne lui appartient pas.
  new.status := old.status;
  new.restaurant_id := old.restaurant_id;
  new.admin_reply := old.admin_reply;
  new.handled_at := old.handled_at;
  new.author_id := old.author_id;
  new.created_at := old.created_at;

  if old.status <> 'nouveau' then
    -- Tranchée : plus rien ne se corrige, on peut seulement la retirer.
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

-- L'auteur peut désormais écrire sur SES lignes (le trigger filtre quoi).
drop policy if exists "suggestions update admin" on public.restaurant_suggestions;
drop policy if exists "suggestions update own or admin" on public.restaurant_suggestions;
create policy "suggestions update own or admin"
on public.restaurant_suggestions for update to authenticated
using (
  author_id = auth.uid()
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
)
with check (
  author_id = auth.uid()
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
