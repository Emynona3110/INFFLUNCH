import { useCallback, useState } from "react";

/**
 * Onglet mémorisé le temps de la session (sessionStorage) : on quitte une
 * section par la navbar, on y revient au même sous-onglet. Fermer l'onglet du
 * navigateur remet tout à plat — pas de réglage qui colle d'un jour à l'autre.
 *
 * `preferred` prend le pas sur la mémoire (un `?tab=` dans l'URL, par exemple) ;
 * `isValid` écarte une valeur mémorisée qui ne correspondrait plus à rien.
 */
const useRememberedTab = <T extends string>(
  scope: string,
  fallback: T,
  isValid: (value: string | null) => value is T,
  preferred?: T | null
) => {
  const storageKey = `tab:${scope}`;

  const [active, setActiveState] = useState<T>(() => {
    if (preferred) return preferred;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (isValid(stored)) return stored;
    } catch {
      /* sessionStorage indisponible */
    }
    return fallback;
  });

  const setActive = useCallback(
    (next: T) => {
      setActiveState(next);
      try {
        sessionStorage.setItem(storageKey, next);
      } catch {
        /* sessionStorage indisponible */
      }
    },
    [storageKey]
  );

  return [active, setActive] as const;
};

export default useRememberedTab;
