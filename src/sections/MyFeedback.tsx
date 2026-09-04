import { useState } from "react";
import { FiArrowUpRight, FiMessageSquare } from "react-icons/fi";
import useFeedback, { Feedback } from "@/hooks/useFeedback";
import { feedbackType } from "@/services/feedbackTypes";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * « Mes demandes » : ce que j'ai signalé et où ça en est. Le pendant visible de
 * l'envoi — sans lui, une demande part dans le vide.
 */
const MyFeedback = () => {
  const { data: items = [], isPending } = useFeedback("mine");
  // Clic sur une demande : on la corrige. Elle repart alors en attente.
  const [editing, setEditing] = useState<Feedback | null>(null);

  return (
    <Card className="p-6">
      <div
        role="heading"
        aria-level={2}
        className="mb-4 font-display text-lg font-bold text-card-foreground"
      >
        Mes demandes
        {items.length > 0 && (
          <span className="ml-2 text-sm font-medium text-foreground/45">
            ({items.length})
          </span>
        )}
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground/55">
          Un souci ? Une idée ? Exprime-toi en cliquant sur{" "}
          <FiMessageSquare className="inline h-4 w-4 align-text-bottom text-primary" />
          {/* La flèche dit où le trouver : en haut à droite, dans la barre. */}
          <FiArrowUpRight className="inline h-4 w-4 align-text-bottom text-foreground/40" />
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {items.map((item) => {
            const type = feedbackType(item.type);
            return (
              <li
                key={item.id}
                className="group relative flex items-start gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/40"
              >
                {/* Toute la tuile ouvre la correction : la suppression a
                    rejoint cette popup, plus rien ne dispute le clic. */}
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  title="Modifier la demande"
                  className="min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        type.chip
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", type.dot)} />
                      {type.label}
                    </span>
                    <span className="text-xs text-foreground/45">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <p className="mb-0 mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground/85">
                    {item.message}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <FeedbackDialog
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        item={editing}
      />
    </Card>
  );
};

export default MyFeedback;
