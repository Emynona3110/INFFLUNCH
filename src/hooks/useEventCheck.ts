import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { currentEvent } from "@/events";
import { PREVIEW_KEY, scheduledEvent } from "@/events/calendar";

const CHECK_INTERVAL_MS = 10 * 60_000;

/** Aperçu admin actif (Admin › Évènements) : il prime sur le calendrier. */
const previewing = () => {
  try {
    return localStorage.getItem(PREVIEW_KEY) !== null;
  } catch {
    return false;
  }
};

/**
 * Début ou fin d'un évènement (Halloween…) pendant que le site est ouvert :
 * l'évènement n'est choisi qu'au chargement de la page (index.html). Comme
 * pour une nouvelle version (useVersionCheck), on recharge au prochain
 * changement de page — mais sans toast : la surprise reste entière.
 *
 * Vérifications : au retour sur l'onglet (app iPhone ressortie de
 * l'arrière-plan…) et toutes les 10 min.
 */
export function useEventCheck() {
  const { pathname } = useLocation();
  const outdated = useRef(false);

  useEffect(() => {
    const check = () => {
      if (outdated.current || document.hidden || previewing()) return;
      if (scheduledEvent() !== currentEvent) outdated.current = true;
    };
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  // Rechargement transparent dès que l'utilisateur navigue.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (outdated.current) location.reload();
  }, [pathname]);
}
