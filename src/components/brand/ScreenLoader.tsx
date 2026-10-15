import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  acquireScreenLoader,
  releaseScreenLoader,
  screenLoaderSnapshot,
  subscribeScreenLoader,
} from "./screenLoaderControl";

/**
 * Attente plein écran : affiche le monogramme unique de la page (cf.
 * screenLoaderControl.ts) tant que ce composant est monté. Ne rend rien lui-même.
 */
export default function ScreenLoader() {
  useEffect(() => {
    acquireScreenLoader();
    return releaseScreenLoader;
  }, []);
  return null;
}

/**
 * Attente d'une page ou d'une section : le monogramme tant que `loading`, puis
 * le contenu une fois le monogramme effacé — il finit son cycle avant de
 * partir, le contenu n'apparaît pas par-dessus, même si d'autres attentes le
 * prolongent. `yieldToOthers` (cadre de page) : si d'autres attentes le
 * gardent affiché, apparaître sans attendre, le monogramme au centre.
 * Renvoie true tant que le contenu doit rester masqué.
 */
export function useScreenLoader(
  loading: boolean,
  { yieldToOthers = false }: { yieldToOthers?: boolean } = {},
) {
  const acquired = useRef(false);
  useEffect(() => {
    if (!loading) return;
    acquired.current = true;
    acquireScreenLoader();
    return () => {
      acquired.current = false;
      releaseScreenLoader();
    };
  }, [loading]);

  const snapshot = useSyncExternalStore(subscribeScreenLoader, screenLoaderSnapshot);
  // À l'écran (snapshot = demandes en cours, -1 sinon). Avec `yieldToOthers` :
  // seulement s'il s'efface pour de bon, plus aucune autre demande que la
  // nôtre (encore comptée au rendu qui suit la fin du chargement).
  const leaving = yieldToOthers
    ? snapshot >= 0 && snapshot - (acquired.current ? 1 : 0) === 0
    : snapshot >= 0;

  // Seul un contenu qui a attendu patiente : une section déjà prête (cache)
  // ne se masque pas parce qu'une autre fait disparaître le monogramme.
  const [waited, setWaited] = useState(loading);
  if (loading && !waited) setWaited(true);
  if (!loading && waited && !leaving) setWaited(false);

  return loading || (waited && leaving);
}
