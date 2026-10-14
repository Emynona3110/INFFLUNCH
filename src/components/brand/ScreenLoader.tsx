import { useEffect } from "react";
import { acquireScreenLoader, releaseScreenLoader } from "./screenLoaderControl";

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
