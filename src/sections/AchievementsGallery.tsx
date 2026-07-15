import { FiLock } from "react-icons/fi";
import { Card } from "@/components/ui/card";
import useAchievements from "@/hooks/useAchievements";
import useAchievementStats from "@/hooks/useAchievementStats";
import { ACHIEVEMENTS } from "@/data/achievements";
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
  const { unlockedIds, unlockedAt, loading } = useAchievements();
  const { percentById, ready: statsReady } = useAchievementStats();
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
            // Secret non débloqué = tout masqué ; sinon on révèle (grisé si verrouillé).
            const revealed = unlocked || !a.secret;
            return (
              <li key={a.id}>
                <div
                  className={cn(
                    "flex h-full items-center gap-3 rounded-xl border border-border p-3",
                    unlocked ? "bg-background" : "bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "grid h-14 w-14 shrink-0 place-items-center rounded-lg text-3xl",
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
                        {a.condition}
                      </p>
                    </div>
                  ) : (
                    <p className="m-0 flex-1 text-sm font-medium text-foreground/40">
                      Succès secret
                    </p>
                  )}

                  {/* Pourcentage d'obtention affiché pour TOUS les succès (y
                      compris 0 %, secrets et verrouillés), une fois chargé. */}
                  {statsReady && (
                    <span className="shrink-0 whitespace-nowrap pl-2 text-xs font-semibold text-foreground/45">
                      {percent.toFixed(1)}%
                    </span>
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
