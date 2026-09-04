import { useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useFeedback, { Feedback } from "@/hooks/useFeedback";
import useAdminNotes from "@/hooks/useAdminNotes";
import {
  FEEDBACK_CANCELLED,
  feedbackStatus,
  feedbackType,
} from "@/services/feedbackTypes";
import FeedbackViewDialog from "@/components/FeedbackViewDialog";
import { Tooltip } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatAuthorName } from "@/utils/authorName";

const COLUMNS = ["Nature", "Date", "Auteur", "État", "Versions"];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/**
 * Boîte de réception des demandes des collaborateurs, tenue comme les autres
 * tables de l'admin : une ligne par demande, le message complet dans une popup.
 *
 * L'ordre suit la DERNIÈRE VERSION de chaque demande : ce qui vient de bouger
 * — une arrivée comme une correction — se lit en haut, sans avoir à chercher.
 *
 * Deux gestes, et un seul aboutit à du travail : le check reporte la demande
 * dans le carnet de backlog, la croix la refuse. Le sort choisi est rendu à
 * l'auteur, et rien n'est définitif — on peut changer d'avis à tout moment, et
 * une demande corrigée revient d'elle-même en attente.
 *
 * « Terminée » ne s'attribue pas ici : c'est la note du carnet qui, cochée,
 * termine la demande (et la rouvre si on la décoche).
 */
const AdminFeedback = () => {
  const { data: items = [], isPending, error, setStatus } = useFeedback("admin");
  const { add: addNote, update: updateNote, remove: removeNote } = useAdminNotes();
  const [viewing, setViewing] = useState<Feedback | null>(null);

  const lastVersion = (item: Feedback) => item.updated_at ?? item.created_at;
  const rows = [...items].sort((a, b) =>
    lastVersion(a) < lastVersion(b) ? 1 : -1
  );

  const fail = (e: any) =>
    toast({
      title: "Erreur",
      description: e?.message ?? "Réessaie.",
      status: "error",
      duration: 5000,
    });

  /**
   * Accepter = porter la demande au carnet de backlog. Si une note en est déjà
   * issue, on la met à jour (l'auteur a pu corriger son message entre-temps)
   * plutôt que d'en créer une seconde.
   */
  const accept = async (item: Feedback) => {
    const category = feedbackType(item.type).note;
    try {
      let noteId = item.note_id;
      if (noteId) {
        await updateNote.mutateAsync({
          id: noteId,
          description: item.message,
          category,
        });
      } else {
        // La note porte le collaborateur à l'origine de la demande, pas
        // l'admin qui l'accepte.
        noteId = await addNote.mutateAsync({
          description: item.message,
          category,
          author_id: item.author_id,
          email: item.email,
        });
      }
      await setStatus.mutateAsync({
        id: item.id,
        status: "accepte",
        note_id: noteId,
      });
      toast({
        title: item.note_id ? "Backlog mis à jour" : "Ajouté au backlog",
        status: "success",
        duration: 2500,
      });
    } catch (e) {
      fail(e);
    }
  };

  /**
   * Refuser une demande acceptée retire sa note du carnet : une demande refusée
   * n'a rien à y faire.
   *
   * SAUF quand ce qu'on refuse est une CORRECTION : la demande est revenue en
   * attente alors qu'une note existe déjà, donc une version antérieure avait été
   * validée. Le carnet garde alors cette version — on refuse le nouveau texte,
   * pas le travail déjà retenu — et la note reste liée à la demande, prête à
   * être mise à jour si l'admin change d'avis.
   */
  const refuse = async (item: Feedback) => {
    const rejectingUpdate = item.status === "nouveau" && !!item.note_id;
    try {
      if (item.note_id && !rejectingUpdate) {
        await removeNote.mutateAsync(item.note_id);
      }
      await setStatus.mutateAsync({
        id: item.id,
        status: "refuse",
        note_id: rejectingUpdate ? item.note_id : null,
      });
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
          <ScrollArea
            className="min-h-0 os-grid"
            style={{ ["--grid-right" as string]: "120px" }}
          >
            <table
              className="w-full border-separate border-spacing-0 text-sm"
              style={{ minWidth: 720 }}
            >
              <thead>
                <tr>
                  {[...COLUMNS, "Actions"].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "sticky top-0 bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]",
                        h === "Actions"
                          ? "right-0 z-20 w-[120px] text-center shadow-[inset_1px_0_0_0_var(--border),inset_0_-1px_0_0_var(--border)]"
                          : "z-10 text-left"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const status = feedbackStatus(item.status);
                  const cancelled = !!item.cancelled_at && item.status === "nouveau";
                  const done = item.status === "termine";
                  // Terminée = acceptée et faite : le check reste allumé.
                  const accepted = item.status === "accepte" || done;
                  const refused = item.status === "refuse";
                  const linked = !!item.note_id;
                  const acceptLabel = linked
                    ? "Mettre le backlog à jour"
                    : "Ajouter au backlog";
                  const refuseLabel =
                    linked && item.status === "nouveau"
                      ? "Refuser la correction (le backlog reste)"
                      : linked
                      ? "Refuser et retirer du backlog"
                      : "Refuser";
                  // Une demande terminée ne se reclasse pas ici : on décoche sa
                  // note dans le carnet, et elle redevient « acceptée ».
                  const frozen = done
                    ? "Terminée — décoche sa note dans le backlog pour la rouvrir"
                    : null;

                  return (
                    // Le message ne tient pas dans une colonne : toute la ligne
                    // ouvre la lecture, seules les actions gardent leur clic.
                    <tr
                      key={item.id}
                      onClick={() => setViewing(item)}
                      title="Voir la demande"
                      className={cn(
                        "cursor-pointer transition hover:bg-muted/40 [&>td]:border-t [&>td]:border-border/60",
                        // Ce qui attend une décision se lit en pleine couleur ;
                        // le reste, déjà tranché, reste en retrait.
                        item.status === "nouveau" && "[&>td]:text-foreground"
                      )}
                    >
                      {/* Nature : un point de couleur, comme les tuiles du
                          carnet. Le libellé est dans la popup. */}
                      <td className="w-10 whitespace-nowrap px-4 py-1.5">
                        <span
                          title={feedbackType(item.type).label}
                          className={cn(
                            "block h-2.5 w-2.5 rounded-full",
                            feedbackType(item.type).dot
                          )}
                        />
                        <span className="sr-only">
                          {feedbackType(item.type).label}
                        </span>
                      </td>
                      {/* Date de la dernière version : celle qui donne l'ordre
                          du tableau. */}
                      <td className="whitespace-nowrap px-4 py-1.5 text-foreground/70">
                        {formatDate(lastVersion(item))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-foreground/70">
                        {item.email ? formatAuthorName(item.email) : "—"}
                      </td>
                      {/* « Annulée » ne s'affiche que faute de mieux : une
                          demande retirée alors qu'elle attendait encore n'a pas
                          d'autre état à montrer. Dès qu'elle a été classée,
                          c'est le traitement qui compte — il continue, et son
                          auteur n'en saura simplement rien. */}
                      <td className="whitespace-nowrap px-4 py-1.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            cancelled ? FEEDBACK_CANCELLED.chip : status.chip
                          )}
                        >
                          {cancelled ? FEEDBACK_CANCELLED.label : status.label}
                        </span>
                      </td>
                      {/* Nombre de versions : l'originale plus chaque
                          correction. Le détail est dans la popup. */}
                      <td className="whitespace-nowrap px-4 py-1.5 text-foreground/70">
                        {item.edits + 1}
                      </td>
                      <td className="sticky right-0 z-[1] w-[120px] bg-card px-4 py-1.5 text-center shadow-[inset_1px_0_0_0_var(--border)]">
                        {/* Les actions ne doivent pas ouvrir la popup au
                            passage : elles arrêtent le clic de la ligne. */}
                        <div
                          className="flex justify-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip label={frozen ?? acceptLabel}>
                            <button
                              type="button"
                              onClick={() => accept(item)}
                              disabled={done}
                              aria-label={frozen ?? acceptLabel}
                              className={cn(
                                "grid h-8 w-8 place-items-center rounded-full transition",
                                done
                                  ? "cursor-default"
                                  : "cursor-pointer hover:bg-muted hover:text-emerald-600",
                                accepted
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-foreground/35"
                              )}
                            >
                              <FiCheck className="h-4 w-4" />
                            </button>
                          </Tooltip>

                          <Tooltip label={frozen ?? refuseLabel}>
                            <button
                              type="button"
                              onClick={() => refuse(item)}
                              disabled={done}
                              aria-label={frozen ?? refuseLabel}
                              className={cn(
                                "grid h-8 w-8 place-items-center rounded-full transition",
                                done
                                  ? "cursor-default"
                                  : "cursor-pointer hover:bg-muted hover:text-destructive",
                                refused ? "text-destructive" : "text-foreground/35"
                              )}
                            >
                              <FiX className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      <FeedbackViewDialog
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        item={viewing}
      />
    </div>
  );
};

/** Nombre de demandes encore en attente : sert la puce de l'onglet Admin. */
export const useNewFeedbackCount = () => {
  const { data = [] } = useFeedback("admin");
  return data.filter((f) => f.status === "nouveau").length;
};

export default AdminFeedback;
