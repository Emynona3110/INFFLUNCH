import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import { noteCategory } from "@/services/noteCategories";
import { AdminNote } from "@/hooks/useAdminNotes";
import useNoteFeedback from "@/hooks/useNoteFeedback";
import FeedbackVersions from "@/components/FeedbackVersions";
import FeedbackImages from "@/components/FeedbackImages";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  note: AdminNote | null;
  /** Bascule vers la popup de modification, sur la même note. */
  onEdit: () => void;
  /** Suppression de la note, sous appui long. */
  onDelete?: () => void;
  /** Une action est en cours : on verrouille les boutons. */
  busy?: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Lecture d'une note : la tuile ne montre qu'une ligne tronquée, c'est ici
 * qu'on lit le descriptif en entier. La modification se fait dans une popup à
 * part — on ne risque donc pas d'éditer par accident ce qu'on venait consulter.
 */
const AdminNoteViewDialog = ({
  isOpen,
  onClose,
  note,
  onEdit,
  onDelete,
  busy = false,
}: Props) => {
  // Une note reprise d'une demande hérite de son historique : l'admin voit ce
  // que le collaborateur disait avant, sans quitter le carnet.
  const { data: origin } = useNoteFeedback(isOpen && note ? note.id : null);

  if (!note) return null;
  const category = noteCategory(note.category);

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      {/* La catégorie tient lieu de titre — la pastille faisait doublon. */}
      <DialogTitle>
        <span className="inline-flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", category.dot)} />
          {category.label}
        </span>
      </DialogTitle>
      {/* Qui est à l'origine : l'admin qui a noté, ou le collaborateur dont la
          demande a été reprise au carnet. */}
      <p className="mb-0 mt-1 text-sm text-foreground/45">
        {formatDate(note.created_at)} ·{" "}
        {note.email ? formatAuthorName(note.email) : "Auteur inconnu"}
        {note.done && note.done_at && ` · terminée le ${formatDate(note.done_at)}`}
      </p>

      {/* Long texte : c'est lui qui défile, pas la popup. */}
      <p className="mb-0 mt-4 sm:mt-5 max-h-[50dvh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground/85">
        {note.description}
      </p>

      <FeedbackImages paths={note.images} className="mt-3" />

      <FeedbackVersions
        feedbackId={origin?.id ?? null}
        count={origin?.edits ?? 0}
      />

      <div className="mt-4 sm:mt-6 flex items-center justify-between gap-2">
        <div>
          {/* Comme la popup d'une demande : supprimer se fait d'ici, sous
              appui long. */}
          {onDelete && (
            <HoldToDeleteButton
              onConfirm={onDelete}
              mobileConfirm={false}
              disabled={busy}
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10"
              progressClassName="bg-destructive/20"
            >
              Supprimer
            </HoldToDeleteButton>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Fermer
          </Button>
          <Button onClick={onEdit} disabled={busy}>
            Modifier
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default AdminNoteViewDialog;
