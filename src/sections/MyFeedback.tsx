import { useEffect, useState } from "react";
import { FiArrowUpRight, FiMessageSquare } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useFeedbackSeen from "@/hooks/useFeedbackSeen";
import useFeedback, { Feedback } from "@/hooks/useFeedback";
import { feedbackStatus, feedbackType } from "@/services/feedbackTypes";
import FeedbackDialog from "@/components/FeedbackDialog";
import FeedbackViewDialog from "@/components/FeedbackViewDialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Demande classée sans retour possible : son auteur ne peut plus la corriger. */
const frozen = (item: Feedback) =>
  item.status === "termine" || item.status === "refuse";

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
  const { data: items = [], isPending, cancel } = useFeedback("mine");
  // Deux popups, comme le carnet de backlog : lire (clic sur la tuile), puis
  // corriger si besoin. On ne modifie donc pas par accident ce qu'on venait
  // relire. Corriger remet la demande en attente côté admin.
  const [viewing, setViewing] = useState<Feedback | null>(null);
  const [editing, setEditing] = useState<Feedback | null>(null);

  // Lire cette liste vaut acquittement : la puce s'éteint, y compris pour un
  // classement qui arriverait en direct pendant qu'on la regarde.
  const { markSeen } = useFeedbackSeen();
  useEffect(() => {
    markSeen();
  }, [markSeen]);

  /** « Supprimer » : effacée pour de bon tant que personne n'y a répondu,
   *  simplement retirée de ma liste une fois traitée. Ce qui a été porté au
   *  carnet de backlog y reste dans tous les cas — c'est l'admin qui le gère. */
  const destroy = async (item: Feedback) => {
    try {
      const erased = await cancel.mutateAsync(item);
      setViewing(null);
      toast({
        title: erased ? "Demande supprimée" : "Demande retirée",
        status: "success",
        duration: 2500,
      });
    } catch (e: any) {
      toast({
        title: "Suppression impossible",
        description: e?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    }
  };

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
            const status = feedbackStatus(item.status);
            return (
              <li
                key={item.id}
                className={cn(
                  "group relative flex items-start gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/40",
                  // Classée sans retour possible : grisée, comme les notes
                  // terminées du carnet et les demandes traitées côté admin.
                  frozen(item) && "opacity-55"
                )}
              >
                {/* Toute la tuile ouvre la lecture ; modifier et supprimer sont
                    dans cette popup, plus rien ne dispute le clic. */}
                <button
                  type="button"
                  onClick={() => setViewing(item)}
                  title="Voir la demande"
                  className="min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Chez soi, la nature se lit en toutes lettres : pas de
                        code couleur à décoder, c'est la liste de SES demandes. */}
                    <span className="text-sm font-medium text-foreground">
                      {type.label}
                    </span>
                    <span className="text-sm text-foreground/45">
                      {formatDate(item.updated_at ?? item.created_at)}
                    </span>
                    {/* Le sort de la demande, rendu à son auteur : c'est la
                        réponse qu'on lui doit. */}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        status.chip
                      )}
                    >
                      {status.label}
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

      {/* Une demande classée sans retour possible — terminée ou refusée — ne se
          corrige plus : le bouton Modifier disparaît, il ne reste qu'à la relire
          (ou à la retirer de sa liste). */}
      <FeedbackViewDialog
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        item={viewing}
        busy={cancel.isPending}
        onEdit={
          viewing && !frozen(viewing)
            ? () => {
                setEditing(viewing);
                setViewing(null);
              }
            : undefined
        }
        onDelete={() => viewing && destroy(viewing)}
      />

      <FeedbackDialog
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        item={editing}
      />
    </Card>
  );
};

export default MyFeedback;
