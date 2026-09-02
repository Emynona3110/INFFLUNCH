-- =============================================================================
-- Notifications push (Web Push) — 2026-09-02
-- Une ligne = un appareil abonné (le navigateur donne un `endpoint` unique par
-- installation + deux clés de chiffrement). L'usage actuel est ADMIN : être
-- prévenu sur son téléphone quand une demande d'accès arrive. La table n'est
-- pourtant pas réservée aux admins — c'est l'Edge Function `notify-admins` qui
-- choisit les destinataires (elle ne pousse qu'aux comptes `users.role='admin'`).
--
-- RLS : chacun ne voit et n'écrit QUE ses propres abonnements. L'envoi se fait
-- en service_role (Edge Function), qui contourne RLS pour lire les endpoints
-- des admins.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions select own" on public.push_subscriptions;
create policy "push_subscriptions select own"
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

drop policy if exists "push_subscriptions insert own" on public.push_subscriptions;
create policy "push_subscriptions insert own"
on public.push_subscriptions for insert to authenticated
with check (user_id = auth.uid());

-- L'upsert du front (on conflict endpoint) a besoin de l'UPDATE. Le USING est
-- volontairement large : un même appareil peut passer d'un compte à l'autre
-- (endpoint identique, nouveau propriétaire) et doit pouvoir reprendre la
-- ligne. Le WITH CHECK garantit qu'on ne peut se l'attribuer qu'à SOI, et
-- l'endpoint reste secret (non lisible : le SELECT est limité à ses lignes).
drop policy if exists "push_subscriptions update own" on public.push_subscriptions;
create policy "push_subscriptions update own"
on public.push_subscriptions for update to authenticated
using (true)
with check (user_id = auth.uid());

drop policy if exists "push_subscriptions delete own" on public.push_subscriptions;
create policy "push_subscriptions delete own"
on public.push_subscriptions for delete to authenticated
using (user_id = auth.uid());

-- Contrôle :
--   select user_id, left(endpoint, 40) || '…' as endpoint, user_agent, created_at
--   from public.push_subscriptions order by created_at desc;
