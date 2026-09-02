import { useCallback, useEffect, useState } from "react";
import {
  disablePush,
  enablePush,
  getPushSubscription,
  pushBlockedOnIOS,
  pushSupported,
} from "@/services/push";

/**
 * État des notifications push POUR CET APPAREIL (l'abonnement est propre au
 * navigateur/téléphone, pas au compte : on peut être notifié sur son iPhone
 * sans l'être sur son poste). Sert au bouton cloche de la section Admin.
 */
const usePushNotifications = () => {
  const supported = pushSupported();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(!supported);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    // `serviceWorker.ready` ne résout jamais si l'enregistrement a échoué :
    // garde-fou pour ne pas laisser le bouton en attente indéfiniment.
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 5000)
    );
    Promise.race([getPushSubscription(), timeout])
      .catch(() => null)
      .then((subscription) => {
        if (cancelled) return;
        setEnabled(!!subscription);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  /** Bascule l'abonnement. Renvoie un message d'erreur si ça n'a pas marché. */
  const toggle = useCallback(async (): Promise<{ error?: string }> => {
    setBusy(true);
    const result = enabled ? await disablePush() : await enablePush();
    if (!result.error) setEnabled(!enabled);
    setBusy(false);
    return result;
  }, [enabled]);

  return {
    supported,
    // iOS dans un onglet : l'app doit d'abord être installée sur l'écran d'accueil.
    blockedOnIOS: pushBlockedOnIOS(),
    enabled,
    ready,
    busy,
    toggle,
  };
};

export default usePushNotifications;
