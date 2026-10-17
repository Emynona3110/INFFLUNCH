import { useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useScreenLoaderBusy } from "@/components/brand/ScreenLoader";
import useSession from "@/hooks/useSession";
import { EVENTS } from "../calendar";
import CandyArt from "./CandyArt";
import { useCelebration } from "./celebration";
import useCandies, { CANDY_IDS } from "./useCandies";

/** Vue une fois par personne (réglage du navigateur : au pire, revue sur
 *  un autre appareil). */
const SEEN_PREFIX = "quete-bonbons-2026-vue:";
const seenKey = (userId: string) => `${SEEN_PREFIX}${userId}`;

/** Admin › Évènements : l'annonce se rouvrira (rechargement). */
export const replayAnnounce = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(SEEN_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Stockage indisponible : rien à effacer.
  }
  location.reload();
};
const readSeen = (userId: string) => {
  try {
    return localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    return false;
  }
};
const markSeen = (userId: string) => {
  try {
    localStorage.setItem(seenKey(userId), "1");
  } catch {
    // Stockage indisponible : elle reviendra, sans gravité.
  }
};

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** Dernier jour de la chasse (fin d'Halloween au calendrier) : « 2 novembre ». */
const lastDay = (() => {
  const to = EVENTS.find((e) => e.id === "halloween")?.to ?? "11-02";
  const [m, d] = to.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
})();

/**
 * Annonce de la chasse aux bonbons, une seule fois par personne pendant
 * Halloween 2026 : les quatre bonbons à trouver, le trophée à gagner, aucune
 * cachette. Ouverte une fois la page complète (monogramme de chargement
 * effacé), jamais par-dessus la fenêtre du trophée.
 */
const QuestAnnounce = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const { found, loading, on } = useCandies();
  const busy = useScreenLoaderBusy();
  const celebrating = useCelebration();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  // Décidé une fois, dès que tout est prêt (état mis à jour pendant le rendu).
  if (!checked && userId && on && !loading && !busy) {
    setChecked(true);
    if (!readSeen(userId) && found.length < CANDY_IDS.length) setOpen(true);
  }

  const close = () => {
    if (userId) markSeen(userId);
    setOpen(false);
  };

  return (
    <Dialog open={open && !celebrating} onClose={close} showClose className="max-w-sm">
      <div className="flex justify-center gap-2 pt-2" aria-hidden>
        {CANDY_IDS.map((c, i) => (
          <CandyArt
            key={c}
            candy={c}
            clipId={`hl-quest-${c}`}
            className="hl-quest-bob h-12 w-12 sm:h-14 sm:w-14"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <div className="mt-4 text-center">
        <DialogTitle>La chasse aux bonbons est ouverte</DialogTitle>
        <p className="mb-0 mt-2 text-sm text-foreground/70">
          Quatre bonbons sont cachés sur le site jusqu'au {lastDay}. Clique dessus pour les ramasser.
        </p>
      </div>
      <div className="mt-5 flex justify-center">
        <Button onClick={close}>À la chasse !</Button>
      </div>
    </Dialog>
  );
};

export default QuestAnnounce;
