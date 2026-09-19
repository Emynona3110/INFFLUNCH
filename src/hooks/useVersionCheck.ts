import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const CHECK_INTERVAL_MS = 10 * 60_000;
const TOAST_ID = "new-version";

/**
 * Détecte qu'un nouveau build a été déployé (dist/version.json ≠ build chargé)
 * et pousse l'utilisateur à recharger : toast persistant avec bouton, et
 * rechargement automatique au prochain changement de route (il ne perd rien
 * puisqu'il change de page de toute façon).
 *
 * Vérifications : au montage, au retour sur l'onglet, et toutes les 10 min.
 */
export function useVersionCheck() {
  const { pathname } = useLocation();
  const outdated = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const check = async () => {
      if (outdated.current || document.hidden) return;
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: string };
        if (!id || id === __BUILD_ID__) return;
        outdated.current = true;
        toast.info("Nouvelle version disponible", {
          id: TOAST_ID,
          description: "Rechargez la page pour en profiter.",
          duration: Infinity,
          action: { label: "Recharger", onClick: () => location.reload() },
        });
      } catch {
        // Hors ligne ou serveur injoignable : on réessaiera.
      }
    };

    check();
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
