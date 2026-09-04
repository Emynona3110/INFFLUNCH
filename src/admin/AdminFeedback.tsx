import { useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useFeedback, { Feedback } from "@/hooks/useFeedback";
import useAdminNotes from "@/hooks/useAdminNotes";
import { feedbackType } from "@/services/feedbackTypes";
import FeedbackViewDialog from "@/components/FeedbackViewDialog";
import { cn } from "@/lib/utils";

/**
 * Boîte de réception des demandes des collaborateurs, présentée comme le carnet
 * de backlog : une tuile par demande, le message complet dans une popup.
 *
 * Deux gestes, et un seul aboutit à du travail : le check reporte la demande
 * dans le carnet de backlog, la croix la refuse. Dans les deux cas la demande
 * reste ici, simplement grisée — on peut changer d'avis à tout moment, et elle
 * ressort du grisé si son auteur la corrige.
 */
const AdminFeedback = () => {
  const { data: items = [], isPending, setStatus } = useFeedback("admin");
  const { add: addNote, update: updateNote, remove: removeNote } = useAdminNotes();
  const [viewing, setViewing] = useState<Feedback | null>(null);

  // Ce qui attend d'abord, le reste grisé en dessous : une demande corrigée
  // repasse « en attente » et remonte donc d'elle-même.
  const pending = items.filter((i) => i.status === "nouveau");
  const handled = items.filter((i) => i.status !== "nouveau");

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
        noteId = await addNote.mutateAsync({
          description: item.message,
          category,
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

  /** Refuser après avoir accepté retire la note du carnet : une demande refusée
   *  n'a rien à y faire. */
  const refuse = async (item: Feedback) => {
    try {
      if (item.note_id) await removeNote.mutateAsync(item.note_id);
      await setStatus.mutateAsync({
        id: item.id,
        status: "refuse",
        note_id: null,
      });
    } catch (e) {
      fail(e);
    }
  };

  const renderTile = (item: Feedback) => {
    const type = feedbackType(item.type);
    const accepted = item.status === "accepte";
    const refused = item.status === "refuse";

    return (
      <li key={item.id} className="group relative flex items-center gap-1">
        <div
          className={cn(
            "relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-xl border border-border bg-background py-1.5 pl-3.5 pr-2 transition hover:border-primary/40",
            item.status !== "nouveau" && "opacity-55"
          )}
        >
          {/* Nature de la demande : une bande de couleur au bord gauche, comme
              les notes du carnet. Le libellé est dans la popup. */}
          <span
            title={type.label}
            className={cn("absolute inset-y-0 left-0 w-1", type.dot)}
          />
          <span className="sr-only">{type.label}</span>

          {/* Zone cliquable étirée à toute la tuile par un pseudo-élément. */}
          <button
            type="button"
            onClick={() => setViewing(item)}
            title="Voir la demande"
            className="min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']"
          >
            <p
              className={cn(
                "my-0 truncate text-sm text-foreground/85",
                refused && "line-through"
              )}
            >
              {item.message}
            </p>
          </button>

          {/* Les deux boutons restent actifs : celui qui est coloré dit la
              décision prise, cliquer l'autre en change. */}
          <div className="relative flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => accept(item)}
              title={accepted ? "Mettre le backlog à jour" : "Ajouter au backlog"}
              aria-label={
                accepted ? "Mettre le backlog à jour" : "Ajouter au backlog"
              }
              className={cn(
                "grid h-8 w-8 cursor-pointer place-items-center rounded-full transition hover:bg-muted hover:text-emerald-600",
                accepted
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground/35"
              )}
            >
              <FiCheck className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => refuse(item)}
              title="Refuser"
              aria-label="Refuser"
              className={cn(
                "grid h-8 w-8 cursor-pointer place-items-center rounded-full transition hover:bg-muted hover:text-destructive",
                refused ? "text-destructive" : "text-foreground/35"
              )}
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="tw-scope flex h-full w-full flex-col px-4 pb-4">
      {isPending ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground/55">
          Aucune demande pour le moment.
        </p>
      ) : (
        <ul className="m-0 min-h-0 flex-1 list-none space-y-2 overflow-y-auto p-0">
          {pending.map(renderTile)}
          {handled.map(renderTile)}
        </ul>
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
