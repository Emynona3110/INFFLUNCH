import { useEffect, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import TrophyStage from "@/components/TrophyStage";
import { preloadTrophy } from "@/lib/trophyAssets";
import { useTheme } from "@/lib/theme";
import type { EarnedTrophy } from "@/hooks/useTrophies";

/** Fiche d'un trophée : intro à l'ouverture, saut au survol, et ses infos. */
const TrophyDialog = ({ trophy, onClose }: { trophy: EarnedTrophy | null; onClose: () => void }) => (
  // `overflow-hidden` : le haut de la popup rogne la chute de l'intro.
  <Dialog open={!!trophy} onClose={onClose} showClose className="max-w-sm overflow-hidden">
    {trophy && (
      <>
        <TrophyStage trophy={trophy.def} className="mx-auto h-52 w-40 cursor-pointer sm:h-60 sm:w-48" />
        <div className="mt-3 text-center">
          <DialogTitle>{trophy.def.title}</DialogTitle>
          <p className="mb-0 mt-0.5 text-sm font-semibold text-primary">{trophy.def.event}</p>
          <p className="mb-0 mt-2 text-sm text-foreground/70">{trophy.def.description}</p>
        </div>
      </>
    )}
  </Dialog>
);

/**
 * Trophées d'une personne (évènements passés : chasse aux bonbons…) en petits
 * badges (l'image seule, sans pastille), à côté de son nom, à part des succès. Un clic ouvre la fiche
 * du trophée. Rien tant qu'elle n'en a aucun.
 */
const TrophyBadges = ({ trophies }: { trophies: EarnedTrophy[] }) => {
  const dark = useTheme().theme === "dark";
  const [opened, setOpened] = useState<EarnedTrophy | null>(null);
  // La fiche s'ouvre sans attendre ses animations.
  useEffect(() => {
    trophies.forEach((t) => preloadTrophy(t.def, dark));
  }, [trophies, dark]);

  if (trophies.length === 0) return null;
  return (
    <>
      <div role="group" aria-label="Trophées" className="flex shrink-0 items-center gap-1">
        {trophies.map((t) => (
          <button
            key={t.def.id}
            type="button"
            aria-label={`Trophée ${t.def.title}, ${t.def.event}`}
            onClick={() => setOpened(t)}
            // Hauteur de la police du nom (text-xl / sm:text-2xl).
            className="block h-5 cursor-pointer rounded-sm outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-6"
          >
            {/* Image cadrée au plus juste : la citrouille entière, anse
                comprise, à la hauteur du texte. */}
            <img src={dark ? t.def.badgeDark : t.def.badge} alt="" className="block h-full w-auto" />
          </button>
        ))}
      </div>
      <TrophyDialog trophy={opened} onClose={() => setOpened(null)} />
    </>
  );
};

export default TrophyBadges;
