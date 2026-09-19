-- =============================================================================
-- Retirer une demande qui a un fil — 2026-09-19
-- Fait suite à `2026-09-19_feedback_thread.sql`. « Supprimer » côté auteur
-- n'efface une demande pour de bon que si elle n'a laissé AUCUNE trace ; un
-- fil de discussion en est une : la demande est alors seulement marquée
-- retirée, et l'admin voit dans le fil, à sa date, que l'auteur s'est retiré.
-- Et l'admin, lui, n'efface qu'une demande déjà tranchée ou retirée.
--
-- La policy ne peut pas lire `feedback_messages` directement : la policy de
-- lecture de cette table relit `feedback`, et Postgres tourne en rond
-- (« infinite recursion detected in policy »). D'où une fonction SECURITY
-- DEFINER, qui compte les messages sans passer par la RLS.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka). Rejouable.
-- =============================================================================
create or replace function public.feedback_has_messages(p_feedback_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.feedback_messages m where m.feedback_id = p_feedback_id
  );
$$;

revoke all on function public.feedback_has_messages(bigint) from public;
grant execute on function public.feedback_has_messages(bigint) to authenticated;

drop policy if exists "feedback delete own untouched or admin" on public.feedback;
create policy "feedback delete own untouched or admin"
on public.feedback for delete to authenticated
using (
  (
    author_id = auth.uid()
    and status = 'nouveau'
    and note_id is null
    and edits = 0
    and not public.feedback_has_messages(id)
  )
  or (
    -- L'admin n'efface qu'une demande déjà tranchée (acceptée, terminée,
    -- refusée, clôturée) ou retirée par son auteur : ce qui attend encore
    -- une réponse ne se supprime pas, ça se traite.
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    and (
      status in ('accepte', 'termine', 'refuse', 'clos')
      or cancelled_at is not null
    )
  )
);
