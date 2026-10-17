import { useEffect, useState, useSyncExternalStore } from "react";
import {
  acquireScreenLoader,
  releaseScreenLoader,
  screenLoaderBusy,
  screenLoaderSnapshot,
  subscribeScreenLoader,
} from "./screenLoaderControl";
import { usePageRevealed } from "@/components/pageRevealContext";

/**
 * Attente plein écran : affiche le monogramme unique de la page (cf.
 * screenLoaderControl.ts) tant que ce composant est monté — sauf dans une
 * page déjà affichée (cf. pageRevealContext). Ne rend rien lui-même.
 */
export default function ScreenLoader() {
  const pageShown = usePageRevealed();
  useEffect(() => {
    if (pageShown) return;
    acquireScreenLoader();
    return releaseScreenLoader;
  }, [pageShown]);
  return null;
}

/**
 * Attente d'une page ou d'une section : le monogramme tant que `loading`, puis
 * le contenu une fois le monogramme effacé — il finit son cycle avant de
 * partir, le contenu n'apparaît pas par-dessus, même si d'autres attentes le
 * prolongent. Renvoie true tant que le contenu doit rester masqué.
 *
 * Dans une page déjà affichée (cf. pageRevealContext) : pas de monogramme,
 * le contenu attend simplement ses données.
 */
export function useScreenLoader(loading: boolean) {
  const pageShown = usePageRevealed();
  const show = loading && !pageShown;
  useEffect(() => {
    if (!show) return;
    acquireScreenLoader();
    return releaseScreenLoader;
  }, [show]);

  // À l'écran (snapshot = demandes en cours, -1 sinon).
  const leaving =
    useSyncExternalStore(subscribeScreenLoader, screenLoaderSnapshot) >= 0;

  // Seul un contenu qui a attendu patiente : une section déjà prête (cache)
  // ne se masque pas parce qu'une autre fait disparaître le monogramme.
  const [waited, setWaited] = useState(loading);
  if (loading && !waited) setWaited(true);
  if (!loading && waited && !leaving) setWaited(false);

  return loading || (!pageShown && waited && leaving);
}

/**
 * Une attente est en cours quelque part (demandée, même pas encore affichée,
 * ou monogramme encore à l'écran) : la page n'est pas complète.
 */
export function useScreenLoaderBusy() {
  return useSyncExternalStore(subscribeScreenLoader, screenLoaderBusy);
}

/**
 * Vrai tant que le monogramme plein écran est affiché (ou en train de
 * s'effacer) : pour un contenu qui n'attend pas de données mais ne doit pas
 * apparaître sous lui (ex. l'intro du logo de la connexion, qui s'y jouait
 * sans être vue).
 */
export function useScreenLoaderOnScreen() {
  return (
    useSyncExternalStore(subscribeScreenLoader, screenLoaderSnapshot) >= 0
  );
}
