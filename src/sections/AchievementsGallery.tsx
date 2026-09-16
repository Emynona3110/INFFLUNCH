import { useEffect, useRef } from "react";
import { FiLock, FiTrash2 } from "react-icons/fi";
import { Card } from "@/components/ui/card";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import useAchievements from "@/hooks/useAchievements";
import useAchievementStats from "@/hooks/useAchievementStats";
import useAchievementsSeen from "@/hooks/useAchievementsSeen";
import useSecretConditions from "@/hooks/useSecretConditions";
import useIsAdmin from "@/hooks/useIsAdmin";
import { ACHIEVEMENTS, AchievementId } from "@/data/achievements";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

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
    if (seenAtOnOpen.current === null && seenAt !== null) seenAtOnOpen.current = seenAt;
  }, [seenAt]);
  const isNew = (date?: string) =>
    !!date && seenAtOnOpen.current !== null && date > seenAtOnOpen.current;
  const isAdmin = useIsAdmin();
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id)).length;

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
    <Card className="p-6">
      <div
        role="heading"
        aria-level={2}
        className="mb-4 font-display text-lg font-bold text-card-foreground"
      >
        Succès
        <span className="ml-2 text-sm font-medium text-foreground/45">
          ({unlockedCount}/{ACHIEVEMENTS.length})
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
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
                    "flex h-full items-center gap-3 rounded-xl border border-border p-3",
                    unlocked ? "bg-background" : "bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-3xl",
                      // Cadre coloré uniquement pour les emojis ; les images
                      // occupent tout l'espace sans fond.
                      unlocked && !a.image && "bg-primary/10",
                      !unlocked && "text-muted-foreground"
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
                      <FiLock className="h-7 w-7" />
                    )}
                  </div>

                  {revealed ? (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p
                          className={cn(
                            "m-0 truncate text-sm font-bold leading-tight",
                            unlocked ? "text-card-foreground" : "text-foreground/50"
                          )}
                        >
                          {a.title}
                        </p>
                        {date && (
                          <span className="shrink-0 whitespace-nowrap text-[11px] leading-none text-foreground/40">
                            {formatDate(date)}
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          "m-0 mt-0.5 text-xs leading-snug",
                          unlocked ? "text-foreground/55" : "text-foreground/40"
                        )}
                      >
                        {a.condition ?? secretConditions[a.id]}
                      </p>
                    </div>
                  ) : (
                    // Secret : le titre se montre, seule la condition reste à
                    // deviner — un nom qui intrigue vaut mieux qu'un blanc.
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-bold leading-tight text-foreground/50">
                        {a.title}
                      </p>
                      <p className="m-0 mt-0.5 text-xs leading-snug text-foreground/40">
                        Succès secret
                      </p>
                    </div>
                  )}

                  {/* Pourcentage d'obtention affiché pour TOUS les succès (y
                      compris 0 %, secrets et verrouillés), une fois chargé. */}
                  {statsReady && (
                    <span className="shrink-0 whitespace-nowrap pl-2 text-xs font-semibold text-foreground/45">
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
    </Card>
  );
};

export default AchievementsGallery;
