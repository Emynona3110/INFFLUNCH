import { useEffect, useRef, useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { toast } from "@/lib/toast";
import useRestaurantSuggestions, {
  RestaurantSuggestion,
  SUGGESTION_STATUSES,
} from "@/hooks/useRestaurantSuggestions";
import useSuggestionsSeen from "@/hooks/useSuggestionsSeen";
import ProposeRestaurantDialog from "@/components/ProposeRestaurantDialog";
import SuggestionViewDialog from "@/components/SuggestionViewDialog";
import ChefHatPlus from "@/components/icons/ChefHatPlus";
import { cn } from "@/lib/utils";
import {
  SECTION,
  SECTION_BODY,
  SECTION_HEAD,
  SECTION_TITLE,
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

/** Tranchée par l'admin : plus rien ne se corrige, la tuile est grisée. */
const frozen = (s: RestaurantSuggestion) => s.status !== "nouveau";

/**
 * « Mes ajouts » : les restos que j'ai proposés et ce que l'admin en a fait,
 * en tuiles comme « Mes demandes ». Un clic ouvre la lecture ; de là, on
 * corrige tant que la proposition attend, et on la supprime (effacée en
 * attente, retirée de la liste une fois tranchée). L'envoi se fait depuis la
 * toque de la navbar.
 */
const MySuggestions = () => {
  const { data: fetched = [], isPending, cancel } = useRestaurantSuggestions("mine");
  // En attente d'abord, puis les tranchées, chaque groupe du plus récent au
  // plus ancien.
  const items = [...fetched.filter((s) => !frozen(s)), ...fetched.filter(frozen)];

  const [viewing, setViewing] = useState<RestaurantSuggestion | null>(null);
  const [editing, setEditing] = useState<RestaurantSuggestion | null>(null);
  // La popup lit toujours la version courante (une décision arrivée en direct
  // s'y affiche).
  const viewingLive = viewing
    ? (fetched.find((s) => s.id === viewing.id) ?? viewing)
    : null;

  // Puce sur chaque proposition tranchée depuis la dernière visite : date « vue »
  // figée à l'ouverture (déclaré AVANT l'acquittement pour capter l'ancienne).
  const { markSeen, seenAt } = useSuggestionsSeen();
  const seenAtOnOpen = useRef<string | null>(null);
  useEffect(() => {
    if (seenAtOnOpen.current === null && seenAt !== null)
      seenAtOnOpen.current = seenAt;
  }, [seenAt]);
  useEffect(() => {
    markSeen();
  }, [markSeen]);
  // Ouvrir une proposition vaut lecture : sa puce s'éteint aussitôt.
  const [acked, setAcked] = useState<Set<number>>(() => new Set());
  const isNew = (s: RestaurantSuggestion) =>
    seenAtOnOpen.current !== null &&
    !acked.has(s.id) &&
    !!s.handled_at &&
    s.handled_at > seenAtOnOpen.current;
  const open = (s: RestaurantSuggestion) => {
    setAcked((prev) => new Set(prev).add(s.id));
    setViewing(s);
  };

  const destroy = async (s: RestaurantSuggestion) => {
    try {
      const erased = await cancel.mutateAsync(s);
      setViewing(null);
      toast({
        title: erased ? "Proposition supprimée" : "Proposition retirée",
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
      className={cn(SECTION, "sm:p-6 sm:shadow-[0_10px_30px_-12px_rgba(2,8,40,0.18)]")}
    >
      {/* Mobile : pas de titre (le sous-onglet le porte). */}
      <div className={cn(SECTION_HEAD, "hidden sm:flex")}>
        <div role="heading" aria-level={2} className={SECTION_TITLE}>
          Mes ajouts
          {items.length > 0 && (
            <span className="ml-2 text-sm font-medium text-foreground/45">
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
            Un resto manque à l'appel ? Propose-le en cliquant sur{" "}
            <ChefHatPlus className="inline h-4 w-4 align-text-bottom text-primary" />
            {/* La flèche dit où le trouver : en haut à droite, dans la barre. */}
            <FiArrowUpRight className="inline h-4 w-4 align-text-bottom text-foreground opacity-40" />
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-border p-0 sm:space-y-2 sm:divide-y-0">
            {items.map((s) => {
              const status = SUGGESTION_STATUSES[s.status];
              const date = s.updated_at ?? s.created_at;
              return (
                <li
                  key={s.id}
                  className="group relative flex min-h-[60px] items-center gap-3 px-3 py-2.5 transition sm:min-h-0 sm:items-start sm:rounded-xl sm:border sm:border-border sm:bg-background sm:p-3 sm:hover:border-primary/40"
                >
                  {isNew(s) && (
                    <span
                      aria-label="Du nouveau depuis ta dernière visite"
                      className="absolute right-1 top-1 z-[1] h-3 w-3 rounded-full bg-[#ea580c] ring-2 ring-card sm:-right-1 sm:-top-1"
                    />
                  )}
                  {/* Toute la tuile ouvre la lecture ; modifier et supprimer
                      sont dans la popup. */}
                  <button
                    type="button"
                    onClick={() => open(s)}
                    aria-label="Voir la proposition"
                    className={cn(
                      "min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']",
                      // Grisé sur le contenu, pas la tuile : la puce reste vive.
                      frozen(s) && "opacity-55",
                    )}
                  >
                    <div className="flex items-center gap-2 sm:flex-wrap">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground sm:flex-none">
                        {s.name}
                      </span>
                      <span className="hidden text-sm text-foreground/45 sm:inline">
                        {formatDate(date)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          status.chip,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mb-0 mt-0.5 flex min-w-0 items-baseline gap-2 text-[13px] text-foreground/85 sm:mt-1.5 sm:block sm:text-sm">
                      <span className="shrink-0 text-xs tabular-nums text-foreground/45 sm:hidden">
                        {formatShortDate(date)}
                      </span>
                      <span className="truncate sm:block">{s.address}</span>
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SuggestionViewDialog
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        item={viewingLive}
        busy={cancel.isPending}
        onEdit={
          viewingLive && !frozen(viewingLive)
            ? () => {
                setEditing(viewingLive);
                setViewing(null);
              }
            : undefined
        }
        onDelete={() => viewingLive && destroy(viewingLive)}
      />

      <ProposeRestaurantDialog
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        item={editing}
      />
    </section>
  );
};

export default MySuggestions;
