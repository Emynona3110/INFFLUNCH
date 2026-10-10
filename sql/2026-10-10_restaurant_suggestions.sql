-- =============================================================================
-- Propositions de restaurants par les collaborateurs — 2026-10-10
-- Un collaborateur propose un resto qui manque ; un admin crée la fiche à partir
-- de la proposition (dialog resto prérempli) ou la refuse. V1 : ajout seul, pas
-- de correction de fiche existante.
--
-- Table distincte de `feedback` (décision du 2026-09-03) : la charge utile est
-- structurée et aboutit à une fiche, pas à une note de backlog.
--
-- L'auteur ne peut que proposer, relire et retirer SA proposition tant qu'elle
-- attend. Le statut, la fiche liée et la réponse appartiennent à l'admin
-- (trigger). `profiles.suggestions_seen_at` sert la puce « du nouveau sur mes
-- propositions », comme `feedback_seen_at`.
--
-- Notification push des admins : ajouter dans le Dashboard un Database Webhook
-- sur INSERT de `public.restaurant_suggestions` vers l'Edge Function
-- `notify-admins`, header `x-hook-secret` = PUSH_HOOK_SECRET (comme feedback).
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Rejouable.
-- =============================================================================

-- 1) Table ---------------------------------------------------------------------
create table if not exists public.restaurant_suggestions (
  id            bigint generated always as identity primary key,
  name          text not null check (char_length(btrim(name)) between 1 and 100),
  address       text not null check (char_length(btrim(address)) between 1 and 200),
  phone         text check (phone is null or char_length(phone) <= 30),
  website       text check (website is null or char_length(website) <= 300),
  tags          text[],
  comment       text check (comment is null or char_length(comment) <= 1000),
  -- Position du lieu choisi dans la recherche OSM (null si saisie manuelle) :
  -- plus juste que le géocodage de l'adresse, reprise à la création de la fiche.
  lat           double precision,
  lng           double precision,
  status        text not null default 'nouveau'
                check (status in ('nouveau', 'accepte', 'refuse')),
  -- Mot de l'admin à l'auteur (motif d'un refus, le plus souvent).
  admin_reply   text check (admin_reply is null or char_length(admin_reply) <= 1000),
  restaurant_id bigint references public.restaurants(id) on delete set null,
  author_id     uuid not null default auth.uid()
                references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  handled_at    timestamptz
);

create index if not exists restaurant_suggestions_status_idx
  on public.restaurant_suggestions (status, created_at desc);
create index if not exists restaurant_suggestions_author_idx
  on public.restaurant_suggestions (author_id, created_at desc);

-- 2) Garde-fous : ce que chacun peut changer --------------------------------------
create or replace function public.restaurant_suggestions_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) then
    -- Seuls les admins écrivent ici en update (RLS) ; à l'insertion, l'auteur
    -- ne peut pas se pré-accepter.
    new.status := 'nouveau';
    new.restaurant_id := null;
    new.admin_reply := null;
    new.handled_at := null;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.handled_at := case when new.status = 'nouveau' then null else now() end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restaurant_suggestions_guard on public.restaurant_suggestions;
create trigger trg_restaurant_suggestions_guard
before insert or update on public.restaurant_suggestions
for each row execute function public.restaurant_suggestions_guard();

-- 3) RLS ------------------------------------------------------------------------
alter table public.restaurant_suggestions enable row level security;

drop policy if exists "suggestions select own or admin" on public.restaurant_suggestions;
create policy "suggestions select own or admin"
on public.restaurant_suggestions for select to authenticated
using (
  author_id = auth.uid()
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

drop policy if exists "suggestions insert own" on public.restaurant_suggestions;
create policy "suggestions insert own"
on public.restaurant_suggestions for insert to authenticated
with check (author_id = auth.uid());

drop policy if exists "suggestions update admin" on public.restaurant_suggestions;
create policy "suggestions update admin"
on public.restaurant_suggestions for update to authenticated
using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- L'auteur retire sa proposition tant qu'elle attend ; l'admin fait le ménage.
drop policy if exists "suggestions delete own pending or admin" on public.restaurant_suggestions;
create policy "suggestions delete own pending or admin"
on public.restaurant_suggestions for delete to authenticated
using (
  (author_id = auth.uid() and status = 'nouveau')
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- 4) Puce « du nouveau sur mes propositions » -------------------------------------
alter table public.profiles
  add column if not exists suggestions_seen_at timestamptz;

-- 5) Temps réel : la décision de l'admin allume la puce sans recharger ------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'restaurant_suggestions'
  ) then
    alter publication supabase_realtime add table public.restaurant_suggestions;
  end if;
end $$;
