import { useCallback, useEffect, useState } from "react";
import useAchievements from "./useAchievements";

const KEY = "infflunch:achievements-seen";
const EVENT = "infflunch:achievements-seen-change";

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/**
 * Suit le dernier succès « vu » par l'utilisateur (date de déblocage la plus
 * récente, stockée en localStorage) pour afficher une pastille sur « Mon
 * Profil » et sur l'onglet « Succès » tant qu'un déblocage plus récent n'a pas
 * été consulté. Même mécanique que [useChangelogSeen] : les instances (navbar +
 * section) restent synchronisées par un évènement window (et `storage`).
 */
const useAchievementsSeen = () => {
  const { unlockedAt } = useAchievements();
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

  // Déblocage le plus récent ("" si aucun succès). Les dates viennent toutes de
  // Postgres au même format ISO UTC → comparaison lexicographique fiable.
  const latest = Object.values(unlockedAt).reduce<string>(
    (max, date) => (date && date > max ? date : max),
    ""
  );

  const markSeen = useCallback(() => {
    if (!latest) return;
    try {
      localStorage.setItem(KEY, latest);
    } catch {
      /* stockage indisponible : pas bloquant */
    }
    window.dispatchEvent(new Event(EVENT));
  }, [latest]);

  const hasUnseen = !!latest && latest > seen;

  return { hasUnseen, markSeen };
};

export default useAchievementsSeen;
