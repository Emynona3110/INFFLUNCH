import { Link } from "react-router-dom";
import { FiArrowRight, FiGlobe, FiMapPin, FiPhone } from "react-icons/fi";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import {
  RestaurantSuggestion,
  SUGGESTION_STATUSES,
} from "@/hooks/useRestaurantSuggestions";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: RestaurantSuggestion | null;
  /** Corriger : seulement tant que la proposition attend. */
  onEdit?: () => void;
  onDelete?: () => void;
  busy?: boolean;
  /** Nom de l'auteur, affiché à côté de la date (vue admin). */
  author?: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Lecture d'une de mes propositions de resto (pendant de `FeedbackViewDialog`) :
 * tout ce que j'ai envoyé, la réponse de l'admin, le lien vers la fiche une
 * fois ajoutée. Supprimer à gauche (appui long), Modifier à droite tant
 * qu'elle attend. Fermer = la croix en haut.
 */
const SuggestionViewDialog = ({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
  busy = false,
  author,
}: Props) => {
  if (!item) return null;
  const status = SUGGESTION_STATUSES[item.status];
  const website =
    item.website && (/^https?:\/\//.test(item.website) ? item.website : `https://${item.website}`);

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg" showClose>
      {/* Marge à droite : la croix de fermeture. */}
      <DialogTitle>
        <span className="mr-8 block truncate">{item.name}</span>
      </DialogTitle>
      <p className="mb-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/45">
        <span>
          {formatDate(item.updated_at ?? item.created_at)}
          {author && ` · ${author}`}
        </span>
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
            status.chip,
          )}
        >
          {status.label}
        </span>
      </p>

      <div className="mt-4 space-y-2 text-sm text-foreground/85 sm:mt-5">
        <p className="m-0 flex items-start gap-2">
          <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground opacity-45" />
          <span>{item.address}</span>
        </p>
        {item.phone && (
          <p className="m-0 flex items-center gap-2">
            <FiPhone className="h-4 w-4 shrink-0 text-foreground opacity-45" />
            {item.phone}
          </p>
        )}
        {website && (
          <p className="m-0 flex min-w-0 items-center gap-2">
            <FiGlobe className="h-4 w-4 shrink-0 text-foreground opacity-45" />
            <a
              href={website}
              target="_blank"
              rel="noreferrer"
              className="truncate text-primary hover:underline"
            >
              {item.website}
            </a>
          </p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {item.comment && (
          <p className="m-0 max-h-[30dvh] overflow-y-auto whitespace-pre-wrap break-words pt-1">
            {item.comment}
          </p>
        )}
      </div>

      {/* La réponse de l'admin : c'est ce qu'on vient lire. */}
      {item.admin_reply && (
        <div className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
          <div className="text-xs font-semibold text-foreground/55">Réponse de l'admin</div>
          <p className="m-0 mt-0.5 whitespace-pre-wrap break-words text-foreground/85">
            {item.admin_reply}
          </p>
        </div>
      )}
      {item.status === "accepte" && item.restaurant_slug && (
        <Link
          to={`/restaurant/${item.restaurant_slug}`}
          onClick={onClose}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Voir la fiche <FiArrowRight className="h-4 w-4" />
        </Link>
      )}

      {(onDelete || onEdit) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 sm:mt-6">
          <div>
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
          {onEdit && (
            <Button onClick={onEdit} disabled={busy}>
              Modifier
            </Button>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default SuggestionViewDialog;
