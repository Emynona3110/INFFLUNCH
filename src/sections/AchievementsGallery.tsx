import { FiLock } from "react-icons/fi";
import { Card } from "@/components/ui/card";
import useAchievements from "@/hooks/useAchievements";
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
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id)).length;

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
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.includes(a.id);
            const date = unlockedAt[a.id];
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
                      unlocked ? "bg-primary/10" : "text-muted-foreground"
                    )}
                  >
                    {unlocked ? a.icon : <FiLock className="h-7 w-7" />}
                  </div>

                  {unlocked ? (
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="m-0 truncate text-sm font-bold leading-tight text-card-foreground">
                          {a.title}
                        </p>
                        {date && (
                          <span className="shrink-0 whitespace-nowrap text-[11px] leading-none text-foreground/40">
                            {formatDate(date)}
                          </span>
                        )}
                      </div>
                      <p className="m-0 mt-0.5 text-xs italic leading-snug text-foreground/60">
                        {a.flavor}
                      </p>
                      <p className="m-0 mt-1 text-[11px] leading-snug text-foreground/45">
                        {a.condition}
                      </p>
                    </div>
                  ) : (
                    <p className="m-0 text-sm font-medium text-foreground/40">
                      Succès verrouillé
                    </p>
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
