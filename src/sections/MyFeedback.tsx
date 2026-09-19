import { useEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiMessageSquare } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useFeedbackSeen, { feedbackTouchedAt } from "@/hooks/useFeedbackSeen";
import useFeedback, { Feedback } from "@/hooks/useFeedback";
import useSession from "@/hooks/useSession";
import {
  FEEDBACK_DELETED,
  feedbackStatus,
  feedbackType,
  isFeedbackFrozen,
} from "@/services/feedbackTypes";
import FeedbackDialog from "@/components/FeedbackDialog";
import FeedbackViewDialog from "@/components/FeedbackViewDialog";
import { cn } from "@/lib/utils";
import {
  SECTION,
  SECTION_HEAD,
  SECTION_TITLE,
  SECTION_BODY,
} from "@/lib/sectionClasses";

/** Demande classée sans retour possible, ou supprimée par l'admin : son
 *  auteur ne peut plus la corriger ni écrire dans son fil. */
const frozen = (item: Feedback) =>
  isFeedbackFrozen(item.status) || !!item.deleted_at;

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

/**
 * « Mes demandes » : ce que j'ai signalé et où ça en est. Le pendant visible de
 * l'envoi — sans lui, une demande part dans le vide.
 */
const MyFeedback = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const {
    data: fetched = [],
    isPending,
    cancel,
    reply,
    editMessage,
  } = useFeedback("mine");
  // Ce qui attend encore quelque chose d'abord ; les demandes closes
  // (terminées, refusées) descendent en bas, chaque groupe gardant l'ordre
  // du plus récent au plus ancien.
  const items = [
    ...fetched.filter((item) => !frozen(item)),
    ...fetched.filter(frozen),
  ];
  // Deux popups, comme le carnet de backlog : lire (clic sur la tuile), puis
  // corriger si besoin — tant que la demande est en attente seulement ;
  // après, on précise dans le fil.
  const [viewing, setViewing] = useState<Feedback | null>(null);
  const [editing, setEditing] = useState<Feedback | null>(null);
  // La popup lit toujours la version courante de la demande (fil compris) :
  // mon message envoyé, ou une réponse arrivée en direct, s'y affichent.
  const viewingLive = viewing
    ? (fetched.find((f) => f.id === viewing.id) ?? viewing)
    : null;

  // Puce sur chaque demande classée ou répondue depuis la dernière visite. On fige la date
  // « vue » telle qu'elle était à l'OUVERTURE de la liste : on marque tout
  // comme vu dès l'ouverture (ci-dessous), les puces doivent pourtant rester
  // le temps de la consultation. Cet effet est déclaré AVANT l'acquittement
  // pour capturer la valeur d'avant.
  const { markSeen, seenAt } = useFeedbackSeen();
  const seenAtOnOpen = useRef<string | null>(null);
  useEffect(() => {
    if (seenAtOnOpen.current === null && seenAt !== null)
      seenAtOnOpen.current = seenAt;
  }, [seenAt]);
  // Ouvrir une demande vaut lecture : sa puce s'éteint aussitôt, même si la
  // liste, elle, garde les autres allumées jusqu'à ce qu'on la quitte.
  const [acked, setAcked] = useState<Set<number>>(() => new Set());
  const isNew = (item: Feedback) =>
    seenAtOnOpen.current !== null &&
    !acked.has(item.id) &&
    feedbackTouchedAt(item, userId) > seenAtOnOpen.current;
  const open = (item: Feedback) => {
    setAcked((prev) => new Set(prev).add(item.id));
    setViewing(item);
  };

  // Lire cette liste vaut acquittement : la puce de l'onglet s'éteint, y
  // compris pour un classement qui arriverait en direct pendant qu'on la
  // regarde (celui-ci garde sa puce à lui, plus récent que l'ouverture).
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
    <section
      className={cn(
        SECTION,
        "sm:p-6 sm:shadow-[0_10px_30px_-12px_rgba(2,8,40,0.18)]",
      )}
    >
      {/* Mobile : pas de titre (le sous-onglet le porte), lignes empilées
          dans le cadre de la section, comme Avis et Succès. */}
      <div className={cn(SECTION_HEAD, "hidden sm:flex")}>
        <div role="heading" aria-level={2} className={SECTION_TITLE}>
          Mes demandes
          {items.length > 0 && (
            <span className="ml-2 hidden text-sm font-medium text-foreground/45 sm:inline">
              ({items.length})
            </span>
          )}
        </div>
      </div>

      <div className={SECTION_BODY}>
        {isPending ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-foreground/55">
            Un souci ? Une idée ? Exprime-toi en cliquant sur{" "}
            <FiMessageSquare className="inline h-4 w-4 align-text-bottom text-primary" />
            {/* La flèche dit où le trouver : en haut à droite, dans la barre. */}
            <FiArrowUpRight className="inline h-4 w-4 align-text-bottom text-foreground/40" />
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-border p-0 sm:divide-y-0 sm:space-y-2">
            {items.map((item) => {
              const type = feedbackType(item.type);
              // Supprimée par l'admin : c'est ce qu'on lit, quel que soit
              // l'état où elle en était.
              const status = item.deleted_at
                ? FEEDBACK_DELETED
                : feedbackStatus(item.status);
              return (
                <li
                  key={item.id}
                  className={cn(
                    "group relative flex min-h-[60px] items-center gap-3 px-3 py-2.5 transition sm:min-h-0 sm:items-start sm:rounded-xl sm:border sm:border-border sm:bg-background sm:p-3 sm:hover:border-primary/40",
                  )}
                >
                  {isNew(item) && (
                    <span
                      aria-label="Du nouveau depuis ta dernière visite"
                      className="absolute right-1 top-1 z-[1] h-3 w-3 rounded-full bg-primary ring-2 ring-card sm:-right-1 sm:-top-1"
                    />
                  )}
                  {/* Toute la tuile ouvre la lecture ; modifier et supprimer sont
                    dans cette popup, plus rien ne dispute le clic. */}
                  <button
                    type="button"
                    onClick={() => open(item)}
                    aria-label="Voir la demande"
                    className={cn(
                      "min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']",
                      // Classée sans retour possible : grisée, comme les notes
                      // terminées du carnet et les demandes traitées côté admin.
                      // Sur le contenu et non la tuile, pour que la puce
                      // « classée depuis ta visite » reste bien visible.
                      frozen(item) && "opacity-55",
                    )}
                  >
                    {/* Mobile : type à gauche, statut à droite ; dessous date
                      courte + message sur une ligne (…). Desktop : inchangé. */}
                    <div className="flex items-center gap-2 sm:flex-wrap">
                      {/* Chez soi, la nature se lit en toutes lettres : pas de
                        code couleur à décoder, c'est la liste de SES demandes. */}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground sm:flex-none">
                        {type.label}
                      </span>
                      <span className="hidden text-sm text-foreground/45 sm:inline">
                        {formatDate(item.updated_at ?? item.created_at)}
                      </span>
                      {/* Le sort de la demande, rendu à son auteur : c'est la
                        réponse qu'on lui doit. */}
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          status.chip,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mb-0 mt-0.5 flex min-w-0 items-baseline gap-2 text-[13px] text-foreground/85 sm:mt-1.5 sm:block sm:whitespace-pre-wrap sm:break-words sm:text-sm">
                      <span className="shrink-0 text-xs tabular-nums text-foreground/45 sm:hidden">
                        {formatShortDate(item.updated_at ?? item.created_at)}
                      </span>
                      <span className="truncate sm:whitespace-pre-wrap">
                        {item.message}
                      </span>
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Corriger n'est proposé qu'en attente : dès que l'admin s'est
          prononcé (ou a répondu), le texte est figé et c'est le fil qui sert
          à préciser. Il reste à relire, ou à retirer la demande de sa liste. */}
      <FeedbackViewDialog
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        item={viewingLive}
        busy={cancel.isPending}
        currentUserId={userId}
        // Répondre dans le fil, tant que la demande n'est pas figée
        // (terminée, refusée, clôturée) : le fil reste lisible, plus rien
        // ne s'y ajoute.
        onReply={
          viewingLive && !frozen(viewingLive)
            ? async (body) => {
                try {
                  await reply.mutateAsync({ id: viewingLive.id, body });
                } catch (e: any) {
                  toast({
                    title: "Envoi impossible",
                    description: e?.message ?? "Réessaie.",
                    status: "error",
                    duration: 5000,
                  });
                  throw e;
                }
              }
            : undefined
        }
        onEditMessage={
          viewingLive && !frozen(viewingLive)
            ? async (id, body) => {
                try {
                  await editMessage.mutateAsync({ id, body });
                } catch (e: any) {
                  toast({
                    title: "Modification impossible",
                    description: e?.message ?? "Réessaie.",
                    status: "error",
                    duration: 5000,
                  });
                  throw e;
                }
              }
            : undefined
        }
        onEdit={
          viewingLive?.status === "nouveau"
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
    </section>
  );
};

export default MyFeedback;
