import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import { feedbackType } from "@/services/feedbackTypes";
import { Feedback } from "@/hooks/useFeedback";
import FeedbackVersions from "@/components/FeedbackVersions";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: Feedback | null;
  /** Bascule vers la popup de correction (seul l'auteur y a droit). */
  onEdit?: () => void;
  /** Suppression de la demande, sous appui long. */
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
 * Lecture d'une demande : la tuile n'en montre qu'une ligne tronquée, c'est ici
 * qu'on lit le message entier et qu'on voit de qui il vient.
 *
 * Une demande corrigée reste la même demande : le message affiché est toujours
 * le dernier, et les versions précédentes se déplient en dessous — repliées par
 * défaut, c'est la version courante qui compte.
 */
const FeedbackViewDialog = ({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
  busy = false,
}: Props) => {
  if (!item) return null;
  const type = feedbackType(item.type);

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      <DialogTitle>
        <span className="inline-flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", type.dot)} />
          {type.label}
        </span>
      </DialogTitle>
      {/* La date est celle de la version affichée — la dernière. Les dates des
          versions d'avant sont dans l'historique, en dessous. */}
      <p className="mb-0 mt-1 text-sm text-foreground/45">
        {formatDate(item.updated_at ?? item.created_at)}
        {/* L'email n'est rapporté que pour l'admin : sur ses propres demandes,
            l'auteur n'a pas à se voir nommer. */}
        {item.email && ` · ${formatAuthorName(item.email)}`}
      </p>

      <p className="mb-0 mt-5 whitespace-pre-wrap break-words text-sm text-foreground/85">
        {item.message}
      </p>

      <FeedbackVersions feedbackId={item.id} count={item.edits} />

      <div className="mt-6 flex items-center justify-between gap-2">
        <div>
          {onDelete && (
            <HoldToDeleteButton
              onConfirm={onDelete}
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
          {onEdit && (
            <Button onClick={onEdit} disabled={busy}>
              Modifier
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default FeedbackViewDialog;
