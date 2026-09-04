import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { feedbackType } from "@/services/feedbackTypes";
import { Feedback } from "@/hooks/useFeedback";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: Feedback | null;
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
 */
const FeedbackViewDialog = ({ isOpen, onClose, item }: Props) => {
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
      <p className="mb-0 mt-1 text-sm text-foreground/45">
        {item.email ? formatAuthorName(item.email) : "Auteur inconnu"} ·{" "}
        {formatDate(item.created_at)}
      </p>

      <p className="mb-0 mt-5 whitespace-pre-wrap break-words text-sm text-foreground/85">
        {item.message}
      </p>

      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Dialog>
  );
};

export default FeedbackViewDialog;
