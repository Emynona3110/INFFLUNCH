import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { noteCategory } from "@/services/noteCategories";
import { AdminNote } from "@/hooks/useAdminNotes";
import useNoteFeedback from "@/hooks/useNoteFeedback";
import FeedbackVersions from "@/components/FeedbackVersions";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  note: AdminNote | null;
  /** Bascule vers la popup de modification, sur la même note. */
  onEdit: () => void;
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
const AdminNoteViewDialog = ({ isOpen, onClose, note, onEdit }: Props) => {
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

      <p className="mb-0 mt-5 whitespace-pre-wrap break-words text-sm text-foreground/85">
        {note.description}
      </p>

      <FeedbackVersions
        feedbackId={origin?.id ?? null}
        count={origin?.edits ?? 0}
      />

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
        <Button onClick={onEdit}>Modifier</Button>
      </div>
    </Dialog>
  );
};

export default AdminNoteViewDialog;
