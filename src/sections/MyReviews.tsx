import { useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import { FiChevronRight } from "react-icons/fi";
import useMyReviews from "../hooks/useMyReviews";
import { cn } from "@/lib/utils";
import {
  SECTION,
  SECTION_HEAD,
  SECTION_TITLE,
  SECTION_BODY,
} from "@/lib/sectionClasses";

/** Mobile : date courte JJ/MM/AA. */
const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex gap-px">
    {Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={cn(
          "h-3.5 w-3.5",
          i < n ? "text-amber-500" : "text-foreground/15",
        )}
      />
    ))}
  </span>
);

/**
 * « Mes avis » : liste de ses propres avis, clic → fiche resto.
 * Retiré des sous-onglets du compte le 2026-09-19 : redondant avec le profil
 * (UserProfileView affiche déjà tous les avis). Conservé au cas où.
 */
const MyReviews = () => {
  const navigate = useNavigate();
  const { data: reviews = [], isPending: reviewsLoading } = useMyReviews();
  return (
    <section
      className={cn(
        SECTION,
        "sm:p-6 sm:shadow-[0_10px_30px_-12px_rgba(2,8,40,0.18)]",
      )}
    >
      <div className={cn(SECTION_HEAD, "hidden sm:flex")}>
        <div role="heading" aria-level={2} className={SECTION_TITLE}>
          Avis
          {reviews.length > 0 && (
            <span className="ml-2 hidden text-sm font-medium text-foreground/45 sm:inline">
              ({reviews.length})
            </span>
          )}
        </div>
      </div>
      <div className={SECTION_BODY}>
        {reviewsLoading ? (
          <div className="flex justify-center py-5 sm:py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground/55">
            Tu n'as encore laissé aucun avis.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-border p-0 sm:divide-y-0 sm:space-y-2">
            {reviews.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() =>
                    r.restaurant &&
                    navigate(`/restaurant/${r.restaurant.slug}`)
                  }
                  className="flex min-h-[60px] w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/40 sm:min-h-0 sm:rounded-xl sm:border sm:border-border sm:bg-background sm:p-3 sm:hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    {/* Mobile : resto à gauche, étoiles à droite ; dessous
                        date courte + commentaire sur une ligne (…). */}
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-card-foreground sm:flex-none sm:text-base">
                        {r.restaurant?.name ?? "Restaurant supprimé"}
                      </span>
                      <Stars n={r.rating} />
                      <span className="hidden text-xs text-foreground/45 sm:inline">
                        · {formatDate(r.created_at)}
                      </span>
                    </div>
                    <p className="mb-0 mt-0.5 flex min-w-0 items-baseline gap-2 text-[13px] text-foreground/70 sm:text-sm">
                      <span className="shrink-0 text-xs tabular-nums text-foreground/45 sm:hidden">
                        {formatShortDate(r.created_at)}
                      </span>
                      {r.comment && <span className="truncate">{r.comment}</span>}
                    </p>
                  </div>
                  <FiChevronRight className="hidden h-5 w-5 shrink-0 text-foreground opacity-30 sm:block" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default MyReviews;
