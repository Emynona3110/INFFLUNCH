import { useState } from "react";
import { FiPaperclip } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useFeedback, { Feedback, awaitingAdmin } from "@/hooks/useFeedback";
import useSession from "@/hooks/useSession";
import useAdminNotes from "@/hooks/useAdminNotes";
import {
  FEEDBACK_CANCELLED,
  feedbackStatus,
  feedbackType,
} from "@/services/feedbackTypes";
import FeedbackViewDialog from "@/components/FeedbackViewDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatAuthorName } from "@/utils/authorName";

const COLUMNS = ["Nature", "Date", "Auteur", "État"];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/** Pas encore classée : en attente (balle chez l'admin) ou répondue (balle
 *  chez l'auteur). Ce qu'accepter, refuser ou clôturer tranche. */
const pending = (item: Feedback) =>
  item.status === "nouveau" || item.status === "repondu";

/**
 * Boîte de réception des demandes des collaborateurs, tenue comme les autres
 * tables de l'admin : une ligne par demande — un aperçu —, et tout le reste
 * dans la popup : le message, le fil, et les décisions.
 *
 * L'ordre suit la DERNIÈRE VERSION de chaque demande : ce qui vient de bouger
 * se lit en haut, sans avoir à chercher.
 *
 * Les décisions, toutes dans la popup :
 *   - Accepter : la demande part au carnet de backlog ;
 *   - Refuser : lue et écartée (sa note de backlog, s'il y en a une, part) ;
 *   - Clôturer (appui long) : le fil a réglé la question, rien à porter au
 *     backlog — ou la demande est simplement sans suite ;
 *   - Rouvrir : une clôturée repart là où le fil s'était arrêté.
 * Rien n'est définitif : accepter une refusée, refuser une acceptée restent
 * possibles. « Terminée » ne s'attribue pas ici : c'est la note du carnet qui,
 * cochée, termine la demande (et la rouvre si on la décoche).
 */
const AdminFeedback = () => {
  const {
    data: items = [],
    isPending,
    error,
    setStatus,
    reply,
    editMessage,
    remove,
  } = useFeedback("admin");
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const {
    add: addNote,
    update: updateNote,
    remove: removeNote,
  } = useAdminNotes();
  const [viewing, setViewing] = useState<Feedback | null>(null);
  // La popup lit toujours la version courante de la demande (fil compris).
  const viewingLive = viewing
    ? (items.find((f) => f.id === viewing.id) ?? viewing)
    : null;

  const lastVersion = (item: Feedback) => item.updated_at ?? item.created_at;
  // Plus récente d'abord ; à date égale, l'id départage — un comparateur qui ne
  // rend jamais 0 laissait l'ordre des ex æquo au hasard du refetch.
  const rows = [...items].sort(
    (a, b) =>
      (lastVersion(a) < lastVersion(b)
        ? 1
        : lastVersion(a) > lastVersion(b)
          ? -1
          : 0) || b.id - a.id,
  );

  const fail = (e: any) =>
    toast({
      title: "Erreur",
      description: e?.message ?? "Réessaie.",
      status: "error",
      duration: 5000,
    });

  const busy =
    setStatus.isPending ||
    addNote.isPending ||
    updateNote.isPending ||
    removeNote.isPending ||
    remove.isPending;

  /** Accepter = porter la demande au carnet de backlog. Si une note en est
   *  déjà issue (historique), on la met à jour plutôt que d'en créer une
   *  seconde. */
  const accept = async (item: Feedback) => {
    const category = feedbackType(item.type).note;
    try {
      let noteId = item.note_id;
      if (noteId) {
        await updateNote.mutateAsync({
          id: noteId,
          description: item.message,
          category,
          images: item.images,
        });
      } else {
        // La note porte le collaborateur à l'origine de la demande, pas
        // l'admin qui l'accepte.
        noteId = await addNote.mutateAsync({
          description: item.message,
          category,
          images: item.images,
          author_id: item.author_id,
          email: item.email,
        });
      }
      await setStatus.mutateAsync({
        id: item.id,
        status: "accepte",
        note_id: noteId,
      });
      toast({ title: "Ajouté au backlog", status: "success", duration: 2500 });
    } catch (e) {
      fail(e);
    }
  };

  /** Refuser une demande acceptée retire sa note du carnet : une demande
   *  refusée n'a rien à y faire. */
  const refuse = async (item: Feedback) => {
    try {
      if (item.note_id) {
        // Les fichiers de la note sont ceux de la demande, qui reste : rien
        // à effacer du bucket.
        await removeNote.mutateAsync({ id: item.note_id, images: [] });
      }
      await setStatus.mutateAsync({
        id: item.id,
        status: "refuse",
        note_id: null,
      });
      toast({ title: "Demande refusée", status: "success", duration: 2500 });
    } catch (e) {
      fail(e);
    }
  };

  const close = async (item: Feedback) => {
    try {
      await setStatus.mutateAsync({ id: item.id, status: "clos" });
      toast({ title: "Demande clôturée", status: "success", duration: 2500 });
    } catch (e) {
      fail(e);
    }
  };

  /** Rouvrir une clôturée : elle repart là où le fil s'était arrêté — en
   *  attente si le dernier mot est à l'auteur, répondue sinon. */
  const reopen = async (item: Feedback) => {
    try {
      await setStatus.mutateAsync({
        id: item.id,
        status: awaitingAdmin(item) ? "nouveau" : "repondu",
      });
      toast({ title: "Demande rouverte", status: "success", duration: 2500 });
    } catch (e) {
      fail(e);
    }
  };

  return (
    <div className="tw-scope flex h-full w-full flex-col px-4 pb-4">
      {isPending ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive">Erreur : {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-foreground/60">Aucune demande pour le moment.</p>
      ) : (
        <div className="flex max-h-full flex-col overflow-hidden rounded-card border border-border bg-card">
          <ScrollArea className="min-h-0 os-grid">
            <table
              className="w-full border-separate border-spacing-0 text-sm"
              style={{ minWidth: 560 }}
            >
              <thead>
                <tr>
                  {COLUMNS.map((h) => (
                    <th
                      key={h}
                      className="sticky top-0 z-10 bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const status = feedbackStatus(item.status);
                  const cancelled = !!item.cancelled_at && pending(item);
                  return (
                    // Le message ne tient pas dans une colonne : toute la ligne
                    // ouvre la lecture.
                    <tr
                      key={item.id}
                      onClick={() => setViewing(item)}
                      aria-label="Voir la demande"
                      className={cn(
                        "cursor-pointer transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60",
                        // Ce qui attend l'admin — pas encore classée, ou
                        // dernier mot à l'auteur — se lit en pleine couleur ;
                        // le reste, déjà tranché, reste en retrait.
                        awaitingAdmin(item) && "[&>td]:text-foreground",
                      )}
                    >
                      {/* Nature : un point de couleur, comme les tuiles du
                          carnet. Le libellé est dans la popup. */}
                      <td className="w-10 whitespace-nowrap px-4 py-2.5">
                        <span
                          aria-label={feedbackType(item.type).label}
                          className={cn(
                            "block h-2.5 w-2.5 rounded-full",
                            feedbackType(item.type).dot,
                          )}
                        />
                        <span className="sr-only">
                          {feedbackType(item.type).label}
                        </span>
                      </td>
                      {/* Date de la dernière version : celle qui donne l'ordre
                          du tableau. */}
                      <td className="whitespace-nowrap px-4 py-2.5 text-foreground/70">
                        {formatDate(lastVersion(item))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-foreground/70">
                        {item.email ? formatAuthorName(item.email) : "—"}
                        {/* Trombone : des captures accompagnent le message. */}
                        {item.images.length > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-xs text-foreground/45">
                            <FiPaperclip className="h-3.5 w-3.5" />
                            {item.images.length}
                          </span>
                        )}
                      </td>
                      {/* « Annulée » ne s'affiche que faute de mieux : une
                          demande retirée alors qu'elle attendait encore n'a pas
                          d'autre état à montrer. Dès qu'elle a été classée,
                          c'est le traitement qui compte — il continue, et son
                          auteur n'en saura simplement rien. */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            cancelled ? FEEDBACK_CANCELLED.chip : status.chip,
                          )}
                        >
                          {cancelled ? FEEDBACK_CANCELLED.label : status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {/* Toutes les décisions sont ici. Ce qui n'a pas de sens sur l'état
          courant n'est pas proposé :
            - en attente / répondue : Accepter, Refuser, Clôturer ;
            - acceptée : Refuser (retire du backlog) ;
            - refusée : Accepter ;
            - clôturée : Rouvrir ;
            - terminée : rien — on décoche sa note dans le backlog.
          Supprimer (appui long) : la demande quitte la boîte de réception ;
          l'auteur garde sa tuile, grisée « Supprimée ». Sa note de backlog
          éventuelle reste dans le carnet. */}
      <FeedbackViewDialog
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        item={viewingLive}
        busy={busy}
        currentUserId={userId}
        onAccept={
          viewingLive &&
          (pending(viewingLive) || viewingLive.status === "refuse")
            ? () => accept(viewingLive)
            : undefined
        }
        onRefuse={
          viewingLive &&
          (pending(viewingLive) || viewingLive.status === "accepte")
            ? () => refuse(viewingLive)
            : undefined
        }
        onCloseRequest={
          viewingLive && pending(viewingLive)
            ? () => close(viewingLive)
            : undefined
        }
        onReopenRequest={
          viewingLive?.status === "clos" ? () => reopen(viewingLive) : undefined
        }
        // Clôturée : plus d'envoi ni de retouche, d'aucun côté, tant qu'elle
        // n'est pas rouverte (la RLS le garantit aussi). Retirée par son
        // auteur : plus personne ne la lit en face, inutile d'écrire.
        onReply={
          viewingLive?.status === "clos" || viewingLive?.cancelled_at
            ? undefined
            : async (body) => {
                if (!viewing) return;
                try {
                  await reply.mutateAsync({ id: viewing.id, body });
                } catch (e) {
                  fail(e);
                  throw e;
                }
              }
        }
        onEditMessage={
          viewingLive?.status === "clos"
            ? undefined
            : async (id, body) => {
                try {
                  await editMessage.mutateAsync({ id, body });
                } catch (e) {
                  fail(e);
                  throw e;
                }
              }
        }
        // Supprimer : seulement une demande déjà tranchée (acceptée, terminée,
        // refusée, clôturée) ou retirée par son auteur — ce qui attend encore
        // se traite, ne s'efface pas (la RLS l'impose aussi).
        onDelete={
          viewingLive && (!pending(viewingLive) || viewingLive.cancelled_at)
            ? async () => {
                try {
                  await remove.mutateAsync(viewingLive);
                  setViewing(null);
                } catch (e) {
                  fail(e);
                }
              }
            : undefined
        }
      />
    </div>
  );
};

/** Nombre de demandes qui attendent l'admin : sert la puce de l'onglet Admin. */
export const useNewFeedbackCount = () => {
  const { data = [] } = useFeedback("admin");
  return data.filter(awaitingAdmin).length;
};

export default AdminFeedback;
