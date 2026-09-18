-- Date affichée d'un avis = date de sa note. Quand l'auteur change sa NOTE,
-- l'avis est considéré comme republié : created_at repart à maintenant (c'est
-- la date affichée sur la fiche et le profil, et la clé de tri). Une simple
-- retouche du commentaire (orthographe…) ne bouge rien — updated_at continue
-- de tracer ça (trigger trg_reviews_updated_at).
-- L'upsert du front n'envoie pas created_at : rien à changer côté client.

create or replace function public.reviews_touch_created_at()
returns trigger language plpgsql as $$
begin
  if new.rating is distinct from old.rating then
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_touch_created_at on public.reviews;
create trigger trg_reviews_touch_created_at
before update of rating on public.reviews
for each row execute function public.reviews_touch_created_at();
