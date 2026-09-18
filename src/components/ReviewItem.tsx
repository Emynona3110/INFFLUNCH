import { ReactNode } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Stars from "@/components/Stars";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";

interface Props {
  review: {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
  };
  /** Colonne de gauche (pp de l'auteur sur une fiche, vignette du resto sur
   *  un profil), rendue deux fois : 28 px sur mobile, 44 px à partir de sm. */
  leading: (size: number) => ReactNode;
  /** Ce qui est écrit en tête de l'avis : l'auteur ou le restaurant, cliquable. */
  title: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Un avis, tel qu'il apparaît sur une fiche resto — et à l'identique sur un
 * profil, où seule la colonne de gauche et le titre changent (le resto à la
 * place de l'auteur).
 */
const ReviewItem = ({ review, leading, title, onEdit, onDelete }: Props) => (
  <li className="border-t border-border/60 pt-3 sm:pt-4">
    <div className="flex items-stretch gap-2 sm:items-start sm:gap-3">
      {/* Colonne pp : mobile = petite pp (alignée sur le nom) prolongée d'un
          filet vertical ; desktop = 44 px. */}
      <div className="flex shrink-0 flex-col items-center">
        <span className="flex sm:hidden">{leading(28)}</span>
        <span className="hidden sm:flex">{leading(44)}</span>
        <span
          aria-hidden
          className="mt-1.5 w-px flex-1 rounded-full bg-border sm:hidden"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          {title}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Modifier"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
                >
                  <FiEdit2 className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <HoldToDeleteButton
                  onConfirm={onDelete}
                  mobileConfirm="Supprimer l'avis ?"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                  progressClassName="bg-destructive/15"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                </HoldToDeleteButton>
              )}
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Stars rating={review.rating} size={16} />
          <span className="text-xs text-foreground/45">
            {formatDate(review.created_at)}
          </span>
        </div>
        {review.comment && (
          <p className="mb-0 mt-1.5 text-[13px] leading-normal text-foreground/75 sm:text-sm sm:leading-relaxed">
            {review.comment}
          </p>
        )}
      </div>
    </div>
  </li>
);

export default ReviewItem;
