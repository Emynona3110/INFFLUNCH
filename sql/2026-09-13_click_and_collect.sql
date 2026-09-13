-- Click & collect : un restaurant chez qui on peut commander en ligne porte
-- l'URL de sa page de commande (`order_url`). Le badge « Click & Collect »
-- n'est PAS coché à la main : il suit l'URL (trigger), comme ça les filtres,
-- les cards et la fiche n'ont rien à apprendre — c'est un badge comme un autre.
--
-- Au passage, trois badges peu utiles sortent : Bar, TooGoodToGo, Magasin.

alter table public.restaurants add column if not exists order_url text;

insert into public.badges (label) values ('Click & Collect')
on conflict (label) do nothing;

create or replace function public.restaurants_sync_click_collect()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  -- On enlève puis on remet en dernier : l'ordre d'affichage est celui de
  -- badgeMap côté front, la position dans le tableau n'a pas d'importance.
  new.badges := array_remove(coalesce(new.badges, '{}'), 'Click & Collect');
  if nullif(btrim(new.order_url), '') is not null then
    new.badges := new.badges || 'Click & Collect';
  else
    new.order_url := null;
  end if;
  if cardinality(new.badges) = 0 then
    new.badges := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restaurants_click_collect on public.restaurants;
create trigger trg_restaurants_click_collect
before insert or update of order_url, badges on public.restaurants
for each row execute function public.restaurants_sync_click_collect();

-- Retrait des badges peu pertinents (table + tableaux des fiches).
update public.restaurants
set badges = nullif(
  array_remove(array_remove(array_remove(badges, 'Bar'), 'TooGoodToGo'), 'Magasin'),
  '{}'
)
where badges && array['Bar', 'TooGoodToGo', 'Magasin'];

delete from public.badges where label in ('Bar', 'TooGoodToGo', 'Magasin');

-- Premiers concernés (URL de commande = leur site, à affiner dans l'admin).
update public.restaurants set order_url = 'https://napoligang.fr/'
where name = 'Napoli Gang By Big Mama' and order_url is null;
update public.restaurants set order_url = 'https://www.gruppomimo.com/nos-restaurants/gruppomimo-vincennes'
where name = 'Gruppomimo' and order_url is null;
