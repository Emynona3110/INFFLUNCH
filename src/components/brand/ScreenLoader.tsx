import { useEffect, useState, useSyncExternalStore } from "react";
import {
  acquireScreenLoader,
  releaseScreenLoader,
  screenLoaderBusy,
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
 * prolongent. Renvoie true tant que le contenu doit rester masqué.
 */
export function useScreenLoader(loading: boolean) {
  useEffect(() => {
    if (!loading) return;
    acquireScreenLoader();
    return releaseScreenLoader;
  }, [loading]);

  // À l'écran (snapshot = demandes en cours, -1 sinon).
  const leaving =
    useSyncExternalStore(subscribeScreenLoader, screenLoaderSnapshot) >= 0;

  // Seul un contenu qui a attendu patiente : une section déjà prête (cache)
  // ne se masque pas parce qu'une autre fait disparaître le monogramme.
  const [waited, setWaited] = useState(loading);
  if (loading && !waited) setWaited(true);
  if (!loading && waited && !leaving) setWaited(false);

  return loading || (waited && leaving);
}

/**
 * Vrai tant que le monogramme plein écran est affiché (ou en train de
 * s'effacer) : pour un contenu qui n'attend pas de données mais ne doit pas
 * apparaître sous lui (ex. l'intro du logo de la connexion, qui s'y jouait
 * sans être vue).
 */
/**
 * Une attente est en cours quelque part (demandée, même pas encore affichée,
 * ou monogramme encore à l'écran) : la page n'est pas complète.
 */
export function useScreenLoaderBusy() {
  return useSyncExternalStore(subscribeScreenLoader, screenLoaderBusy);
}

export function useScreenLoaderOnScreen() {
  return (
    useSyncExternalStore(subscribeScreenLoader, screenLoaderSnapshot) >= 0
  );
}
