import { Card } from "@/components/ui/card";
import { useScreenLoader } from "@/components/brand/ScreenLoader";
import { cn } from "@/lib/utils";
import CandyArt from "./CandyArt";
import useCandies, { CANDY_IDS } from "./useCandies";

/**
 * Où en est sa chasse aux bonbons, sur SON profil seulement, pendant
 * Halloween 2026 : les quatre bonbons, en couleur une fois trouvés, grisés
 * sinon. Aucune cachette dévoilée. Le profil attend sa lecture (monogramme
 * de chargement) : pas d'encart qui surgit après coup.
 */
const QuestProgress = () => {
  const { found, loading, on } = useCandies();
  useScreenLoader(loading);
  if (!on || loading) return null;

  return (
    <Card className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
      <div className="min-w-0 font-display text-sm font-bold text-card-foreground sm:text-base">
        Chasse aux bonbons
      </div>
      <div className="flex shrink-0 gap-1 sm:gap-1.5">
        {CANDY_IDS.map((c) => {
          const has = found.includes(c);
          return (
            <span
              key={c}
              role="img"
              aria-label={has ? "Bonbon trouvé" : "Bonbon à trouver"}
            >
              <CandyArt
                candy={c}
                clipId={`hl-progress-${c}`}
                className={cn("block h-7 w-7 sm:h-8 sm:w-8", !has && "hl-candy-missing")}
              />
            </span>
          );
        })}
      </div>
    </Card>
  );
};

export default QuestProgress;
