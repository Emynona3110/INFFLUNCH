import { useCallback, useState } from "react";

/**
 * Sous-onglet mémorisé le temps de la visite : on quitte une section par la
 * navbar, on y revient au même endroit. La mémoire vit dans le module — pas
 * dans le navigateur — donc recharger le site remet tout sur l'onglet par
 * défaut, à dessein.
 *
 * `preferred` prend le pas sur la mémoire (un `?tab=` dans l'URL, par exemple) ;
 * `isValid` écarte une valeur mémorisée qui ne correspondrait plus à rien.
 */
const remembered = new Map<string, string>();

const useRememberedTab = <T extends string>(
  scope: string,
  fallback: T,
  isValid: (value: string | null) => value is T,
  preferred?: T | null
) => {
  const [active, setActiveState] = useState<T>(() => {
    if (preferred) return preferred;
    const stored = remembered.get(scope) ?? null;
    return isValid(stored) ? stored : fallback;
  });

  const setActive = useCallback(
    (next: T) => {
      setActiveState(next);
      remembered.set(scope, next);
    },
    [scope]
  );

  return [active, setActive] as const;
};

export default useRememberedTab;
