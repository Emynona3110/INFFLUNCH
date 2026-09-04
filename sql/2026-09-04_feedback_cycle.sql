-- =============================================================================
-- Cycle de vie complet des demandes — 2026-09-04
-- Fait suite à `2026-09-03_feedback.sql` et `2026-09-04_feedback_revisions.sql`.
--
-- Ce que ce script ajoute :
--   1. un état « terminée », posé AUTOMATIQUEMENT quand la note de backlog née
--      de la demande est cochée dans le carnet (et retiré si on la décoche :
--      l'admin garde la main, depuis le carnet) ;
--   2. l'annulation par l'auteur : « supprimer » n'efface une demande que si
--      personne n'y a encore répondu ET qu'elle en est à sa première version ;
--      dès qu'elle a été traitée ou reprise, elle est
--      seulement marquée `cancelled_at` — l'admin la garde sous les yeux, son
--      auteur ne la voit plus ;
--   3. le statut devient une information rendue à l'auteur : c'est pour ça
--      qu'il ne peut plus le manipuler autrement qu'en annulant.
--
-- Les deux dimensions sont volontairement séparées :
--   - `status`       : où en est le TRAITEMENT (admin) ;
--   - `cancelled_at` : l'auteur s'est retiré.
-- Une demande annulée puis acceptée continue donc son chemin au backlog sans
-- jamais réapparaître chez son auteur.
--
-- À exécuter sur le projet Supabase (ref ilonqaqyqmvsfskwgqka).
-- =============================================================================

-- 1) Nouveaux champs ------------------------------------------------------------
alter table public.feedback
  add column if not exists cancelled_at timestamptz;

alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback add constraint feedback_status_check
  check (status in ('nouveau', 'accepte', 'refuse', 'termine'));

-- La boîte de réception admin range par état ; l'auteur ne lit que ses demandes
-- vivantes.
create index if not exists feedback_cancelled_idx
  on public.feedback (cancelled_at, created_at desc);

-- 2) Ce que l'auteur peut faire de sa demande -----------------------------------
-- Il corrige son texte, et il annule. Le reste (statut, lien vers la note) est
-- au traitement, donc aux admins. Une demande terminée, refusée ou annulée
-- n'est plus corrigeable : elle ne se lit plus qu'en consultation.
create or replace function public.feedback_touch_handled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) into actor_is_admin;

  if not actor_is_admin then
    -- Seule décision qui lui appartient : retirer sa demande.
    if new.cancelled_at is null then
      new.cancelled_at := old.cancelled_at;
    end if;
    new.status := old.status;
    new.note_id := old.note_id;

    -- Figée : classée sans retour possible (terminée ou refusée), ou retirée
    -- par son auteur. Elle ne se lit plus qu'en consultation ; pour redire
    -- quelque chose, on ouvre une nouvelle demande.
    if old.status in ('termine', 'refuse') or old.cancelled_at is not null then
      new.message := old.message;
      new.type := old.type;
    end if;
  end if;

  -- Le contenu a changé. Deux cas, selon que quelqu'un avait déjà répondu :
  --
  --   - la demande était CLASSÉE (acceptée, terminée, refusée) : la version sur
  --     laquelle l'admin s'était prononcé est archivée, et la demande REPART EN
  --     ATTENTE — il doit de nouveau l'accepter (le carnet est alors mis à
  --     jour) ou la refuser ;
  --   - elle était encore EN ATTENTE : personne ne s'est prononcé sur ce
  --     texte-là, donc on retouche la version en cours au lieu d'en empiler
  --     une nouvelle. L'auteur peut se reprendre autant qu'il veut tant qu'on
  --     ne lui a pas répondu.
  --
  -- On se fie au contenu et non au rôle de celui qui écrit : un admin qui
  -- corrige SA PROPRE demande suit la même règle. À l'inverse, un simple
  -- changement de statut ne crée aucune révision.
  if new.message is distinct from old.message
     or new.type is distinct from old.type then
    if old.status <> 'nouveau' then
      insert into public.feedback_revisions (feedback_id, version, type, message)
      values (old.id, old.edits + 1, old.type, old.message);
      new.edits := old.edits + 1;
      new.status := 'nouveau';
    end if;
    -- Dans les deux cas, c'est la date de la dernière version : elle donne
    -- l'ordre de la boîte de réception.
    new.updated_at := now();
  end if;

  if new.status is distinct from old.status then
    new.handled_at := case when new.status = 'nouveau' then null else now() end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_feedback_touch_handled on public.feedback;
create trigger trg_feedback_touch_handled
before update on public.feedback
for each row execute function public.feedback_touch_handled();

-- 3) Le carnet décide de « terminée » -------------------------------------------
-- Cocher une note du backlog termine la demande dont elle est issue ; la
-- décocher la remet en « acceptée ». Rien d'autre n'est touché : une demande
-- refusée ou revenue en attente (corrigée depuis) garde son état, et l'annulation
-- de l'auteur n'est pas concernée — elle vit sur `cancelled_at`.
create or replace function public.admin_notes_sync_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.feedback
     set status = case when new.done then 'termine' else 'accepte' end
   where note_id = new.id
     and status in ('accepte', 'termine');
  return null;
end;
$$;

drop trigger if exists trg_admin_notes_sync_feedback on public.admin_notes;
create trigger trg_admin_notes_sync_feedback
after update of done on public.admin_notes
for each row
when (new.done is distinct from old.done)
execute function public.admin_notes_sync_feedback();

-- 4) Supprimer ou annuler, selon ce que la demande a déjà produit ---------------
-- Une demande qui n'a laissé AUCUNE trace, son auteur l'efface pour de bon :
-- elle disparaît aussi de la boîte de réception. Trois conditions, et il les
-- faut toutes :
--   - `status = 'nouveau'` : personne ne s'est prononcé dessus ;
--   - `note_id is null`    : rien n'en est né dans le carnet ;
--   - `edits = 0`          : elle en est à sa première version, donc elle n'a
--                            jamais été classée puis reprise — une demande
--                            versionnée a une histoire, et cette histoire reste
--                            à l'admin.
-- Sinon, elle ne peut que s'annuler : l'admin doit pouvoir constater ce qui a
-- été retiré, et le travail engagé ne s'évapore pas.
drop policy if exists "feedback delete own or admin" on public.feedback;
drop policy if exists "feedback delete admin" on public.feedback;
drop policy if exists "feedback delete own untouched or admin" on public.feedback;
create policy "feedback delete own untouched or admin"
on public.feedback for delete to authenticated
using (
  (
    author_id = auth.uid()
    and status = 'nouveau'
    and note_id is null
    and edits = 0
  )
  or exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  )
);

-- 5) Vérification ---------------------------------------------------------------
-- Ce script REMPLACE `feedback_touch_handled` : si tu l'avais déjà joué avant
-- que la règle « corriger une demande en attente ne crée pas de version » n'y
-- soit ajoutée, la base tourne encore avec l'ancienne fonction — d'où des
-- demandes jamais classées qui affichent pourtant deux versions.
--
-- Doit renvoyer `true` une fois ce fichier rejoué :
--   select prosrc like '%old.status <> ''nouveau''%' as regle_en_place
--     from pg_proc where proname = 'feedback_touch_handled';
--
-- Rattrapage des demandes versionnées à tort par l'ancienne fonction — jamais
-- classées (aucune note, jamais de handled_at) : on efface leur historique et
-- on remet le compteur à zéro. À ne lancer qu'en connaissance de cause.
--   with a_nettoyer as (
--     select id from public.feedback
--      where status = 'nouveau' and note_id is null and handled_at is null
--        and edits > 0
--   )
--   delete from public.feedback_revisions
--    where feedback_id in (select id from a_nettoyer);
--
--   update public.feedback
--      set edits = 0
--    where status = 'nouveau' and note_id is null and handled_at is null
--      and edits > 0;
