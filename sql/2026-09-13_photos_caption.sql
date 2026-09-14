-- Descriptif d'une photo (nom du plat, par exemple) : facultatif, 100
-- caractères au plus, modifiable après coup par son auteur (un admin le peut
-- aussi, pour la modération). Les photos existantes restent telles quelles
-- (colonne nullable, aucune réécriture).

alter table public.restaurant_photos add column if not exists caption text;

alter table public.restaurant_photos drop constraint if exists restaurant_photos_caption_len;
alter table public.restaurant_photos add constraint restaurant_photos_caption_len
  check (caption is null or length(caption) <= 100);

-- Jusqu'ici aucune policy UPDATE : on n'ouvre que ce qu'il faut. Le trigger
-- verrouille tout sauf le descriptif — l'auteur retouche sa légende, pas
-- l'attribution ni le fichier.
create or replace function public.restaurant_photos_caption_only()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.restaurant_id is distinct from old.restaurant_id
     or new.user_id is distinct from old.user_id
     or new.storage_path is distinct from old.storage_path
     or new.width is distinct from old.width
     or new.height is distinct from old.height
     or new.created_at is distinct from old.created_at then
    raise exception 'Seul le descriptif d''une photo peut être modifié';
  end if;
  new.caption := nullif(btrim(new.caption), '');
  return new;
end;
$$;

drop trigger if exists trg_restaurant_photos_caption_only on public.restaurant_photos;
create trigger trg_restaurant_photos_caption_only
before update on public.restaurant_photos
for each row execute function public.restaurant_photos_caption_only();

drop policy if exists "restaurant_photos update own or admin" on public.restaurant_photos;
create policy "restaurant_photos update own or admin"
on public.restaurant_photos for update to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
)
with check (
  user_id = auth.uid()
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
