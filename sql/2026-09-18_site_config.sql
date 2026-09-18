-- Identité et contact de l'éditeur, servis UNIQUEMENT aux sessions authentifiées
-- (RLS) : le bundle JS public ne contient plus que le pseudonyme « LLS ».
-- Lu par src/pages/LegalPage.tsx (hook useLegalContact).

create table if not exists public.site_config (
  key   text primary key,
  value text not null
);

alter table public.site_config enable row level security;

drop policy if exists "site_config_read_authenticated" on public.site_config;
create policy "site_config_read_authenticated"
  on public.site_config for select
  to authenticated
  using (true);
-- Aucune policy d'écriture : modifications via SQL / dashboard uniquement.

insert into public.site_config (key, value) values
  ('editor_full_name', 'Lucas Lambrechts'),
  ('contact_email',    'contact@infflunch.com')
on conflict (key) do update set value = excluded.value;
