import { useCallback, useEffect, useState } from "react";
import { latestChangelogDate } from "@/data/changelog";

const KEY = "infflunch:changelog-seen";
const EVENT = "infflunch:changelog-seen-change";

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/**
 * Suit la dernière nouveauté « vue » par l'utilisateur (stockée en localStorage)
 * pour afficher une pastille sur l'onglet « Nouveautés » tant qu'une entrée plus
 * récente n'a pas été consultée. Les instances (navbar + section) restent
 * synchronisées via un évènement window (et l'évènement natif `storage`).
 */
const useChangelogSeen = () => {
  const [seen, setSeen] = useState<string>(read);

  useEffect(() => {
    const sync = () => setSeen(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(KEY, latestChangelogDate);
    } catch {
      /* stockage indisponible : pas bloquant */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // Comparaison lexicographique d'ISO dates → fiable. "" (jamais vu) < toute date.
  const hasUnseen = latestChangelogDate > seen;

  return { hasUnseen, markSeen };
};

export default useChangelogSeen;
