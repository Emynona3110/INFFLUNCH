import { useEffect, useRef } from "react";
import { FiLock, FiTrash2 } from "react-icons/fi";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import useAchievements from "@/hooks/useAchievements";
import useAchievementStats from "@/hooks/useAchievementStats";
import useAchievementsSeen from "@/hooks/useAchievementsSeen";
import useSecretConditions from "@/hooks/useSecretConditions";
import useIsAdmin from "@/hooks/useIsAdmin";
import { ACHIEVEMENTS, AchievementId } from "@/data/achievements";
import { toast } from "@/lib/toast";
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

/**
 * Galerie « Mes succès » (Mon compte). Succès débloqués = en couleur (icône,
 * intitulé, phrase, date). Verrouillés = grisés et masqués (aucune fuite de la
 * condition ni de l'intitulé avant déblocage).
 */
const AchievementsGallery = () => {
  const { unlockedIds, unlockedAt, resetOne, loading } = useAchievements();
  const { percentById, ready: statsReady } = useAchievementStats();
  // Conditions des secrets débloqués (en base, pas dans le bundle).
  const secretConditions = useSecretConditions();
  // Pastille « nouveau » sur chaque succès débloqué depuis la dernière visite.
  // On fige la date « vue » telle qu'elle était à l'OUVERTURE de la galerie :
  // le parent marque tout comme vu dès l'ouverture, les pastilles doivent
  // pourtant rester le temps de la consultation.
  const { seenAt } = useAchievementsSeen();
  const seenAtOnOpen = useRef<string | null>(null);
  useEffect(() => {
    if (seenAtOnOpen.current === null && seenAt !== null)
      seenAtOnOpen.current = seenAt;
  }, [seenAt]);
  const isNew = (date?: string) =>
    !!date && seenAtOnOpen.current !== null && date > seenAtOnOpen.current;
  const isAdmin = useIsAdmin();
  const unlockedCount = ACHIEVEMENTS.filter((a) =>
    unlockedIds.includes(a.id),
  ).length;

  // Tri : du plus courant au plus rare (% d'obtention décroissant → les plus
  // rares à la fin), puis par intitulé pour les raretés égales. Un succès sans
  // stat (personne ne l'a encore) = 0 % → tout en bas.
  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const ra = percentById[a.id] ?? 0;
    const rb = percentById[b.id] ?? 0;
    if (ra !== rb) return rb - ra;
    return a.title.localeCompare(b.title, "fr");
  });

  // Reverrouillage d'UN succès (admin seulement) : outil de test pour revoir
  // son toast de déblocage. S'il est toujours mérité, il revient aussitôt.
  const handleReset = async (id: AchievementId) => {
    try {
      await resetOne(id);
      toast({
        title: "Succès reverrouillé",
        status: "success",
        duration: 2500,
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : String(e),
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
      <div className={cn(SECTION_HEAD, "hidden sm:flex")}>
        <div role="heading" aria-level={2} className={SECTION_TITLE}>
          Succès
          <span className="ml-2 hidden text-sm font-medium text-foreground/45 sm:inline">
            ({unlockedCount}/{ACHIEVEMENTS.length})
          </span>
        </div>
      </div>
      <div className={SECTION_BODY}>
        {loading ? (
          <div className="flex justify-center py-5 sm:py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
          /* Mobile : lignes empilées séparées d'un filet, directement dans le cadre
             de la section ; desktop : tuiles arrondies espacées. */
          <ul className="m-0 list-none divide-y divide-border p-0 sm:divide-y-0 sm:space-y-2">
            {sorted.map((a) => {
              const unlocked = unlockedIds.includes(a.id);
              const date = unlockedAt[a.id];
              const percent = percentById[a.id] ?? 0;
              // Secret non débloqué = condition masquée ; sinon on révèle (grisé si verrouillé).
              const revealed = unlocked || !a.secret;
              return (
                <li key={a.id} className="relative">
                  {unlocked && isNew(date) && (
                    <span
                      aria-label="Nouveau succès"
                      className="absolute -right-1 -top-1 z-[1] h-3 w-3 rounded-full bg-primary ring-2 ring-card"
                    />
                  )}
                  <div
                    className={cn(
                      "flex h-full min-h-[60px] items-center gap-3 px-3 py-2.5 sm:min-h-0 sm:rounded-xl sm:border sm:border-border sm:p-3",
                      unlocked ? "sm:bg-background" : "bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl sm:h-14 sm:w-14 sm:text-3xl",
                        // Cadre coloré uniquement pour les emojis ; les images
                        // occupent tout l'espace sans fond.
                        unlocked && !a.image && "bg-primary/10",
                        !unlocked && "text-muted-foreground",
                      )}
                    >
                      {/* Image visible seulement une fois débloqué (verrouillé =
                        cadenas), même pour les succès non secrets. */}
                      {unlocked ? (
                        a.image ? (
                          <img
                            src={a.image}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          a.icon
                        )
                      ) : (
                        <FiLock className="h-5 w-5 sm:h-7 sm:w-7" />
                      )}
                    </div>

                    {revealed ? (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p
                            className={cn(
                              "m-0 truncate text-sm font-bold leading-tight",
                              unlocked
                                ? "text-card-foreground"
                                : "text-foreground/50",
                            )}
                          >
                            {a.title}
                          </p>
                          {date && (
                            <span className="hidden shrink-0 whitespace-nowrap text-[11px] leading-none text-foreground/40 sm:inline">
                              {formatDate(date)}
                            </span>
                          )}
                          {/* Mobile : % à droite du titre. */}
                          {statsReady && (
                            <span className="ml-auto shrink-0 text-xs font-semibold text-foreground/45 sm:hidden">
                              {percent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "m-0 mt-0.5 flex min-w-0 items-baseline gap-2 text-xs leading-snug",
                            unlocked
                              ? "text-foreground/55"
                              : "text-foreground/40",
                          )}
                        >
                          {/* Mobile : date courte puis condition sur une ligne. */}
                          {date && (
                            <span className="shrink-0 tabular-nums text-foreground/40 sm:hidden">
                              {formatShortDate(date)}
                            </span>
                          )}
                          <span className="truncate sm:whitespace-normal">
                            {a.condition ?? secretConditions[a.id]}
                          </span>
                        </p>
                      </div>
                    ) : (
                      // Secret : le titre se montre, seule la condition reste à
                      // deviner — un nom qui intrigue vaut mieux qu'un blanc.
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="m-0 truncate text-sm font-bold leading-tight text-foreground/50">
                            {a.title}
                          </p>
                          {statsReady && (
                            <span className="ml-auto shrink-0 text-xs font-semibold text-foreground/45 sm:hidden">
                              {percent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <p className="m-0 mt-0.5 text-xs leading-snug text-foreground/40">
                          Succès secret
                        </p>
                      </div>
                    )}

                    {/* Pourcentage d'obtention affiché pour TOUS les succès (y
                      compris 0 %, secrets et verrouillés), une fois chargé. */}
                    {statsReady && (
                      <span className="hidden shrink-0 whitespace-nowrap pl-2 text-xs font-semibold text-foreground/45 sm:inline">
                        {percent.toFixed(1)}%
                      </span>
                    )}

                    {/* Reverrouiller ce succès (admin) : outil de test. */}
                    {isAdmin && unlocked && (
                      <HoldToDeleteButton
                        onConfirm={() => handleReset(a.id)}
                        aria-label="Maintenir pour reverrouiller ce succès"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                        progressClassName="bg-destructive/15"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </HoldToDeleteButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default AchievementsGallery;
