import { useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import { feedbackType } from "@/services/feedbackTypes";
import useFeedbackRevisions from "@/hooks/useFeedbackRevisions";
import { cn } from "@/lib/utils";

interface Props {
  /** Demande dont on lit l'historique ; null = rien à montrer. */
  feedbackId: number | null;
  /** Nombre de corrections (`feedback.edits`) : autant de versions remplacées. */
  count: number;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Versions remplacées d'une demande, repliées par défaut : c'est la version
 * courante qui compte, l'historique n'est là que pour comprendre ce qui a
 * changé. Sert la popup d'une demande comme celle de la note de backlog qui en
 * est issue.
 */
const FeedbackVersions = ({ feedbackId, count }: Props) => {
  const [open, setOpen] = useState(false);
  // Chargé seulement une fois la section dépliée : la plupart des lectures ne
  // la déroulent jamais.
  const { data: revisions = [] } = useFeedbackRevisions(
    open ? feedbackId : null
  );

  if (!feedbackId || count === 0) return null;

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground/40 transition hover:text-foreground/60"
      >
        <FiChevronRight
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
        />
        Versions précédentes ({count})
        <span className="h-px flex-1 bg-border" />
      </button>

      {open && (
        <ul className="m-0 mt-3 max-h-56 list-none space-y-2 overflow-y-auto p-0">
          {revisions.map((rev) => {
            const revType = feedbackType(rev.type);
            return (
              <li
                key={rev.id}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                {/* Le point dit la nature de cette version-là, la date dit
                    quand elle a cédé la place : le reste alourdissait. */}
                <p className="m-0 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-foreground/40">
                  <span
                    title={revType.label}
                    className={cn("h-1.5 w-1.5 rounded-full", revType.dot)}
                  />
                  {formatDate(rev.replaced_at)}
                </p>
                <p className="mb-0 mt-1 whitespace-pre-wrap break-words text-sm text-foreground/70">
                  {rev.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FeedbackVersions;
