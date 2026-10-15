import supabaseClient from "./supabaseClient";

/**
 * Notifications push (Web Push) — côté navigateur.
 *
 * Usage actuel : les admins reçoivent une notification quand une demande
 * d'accès arrive (envoi par l'Edge Function `notify-admins`, déclenchée par un
 * webhook sur `waiting_list`).
 *
 * ⚠️ iOS/iPadOS : le push n'existe QUE pour une PWA ajoutée à l'écran d'accueil
 * (iOS 16.4+). Dans un onglet Safari, `PushManager` est absent ou l'abonnement
 * échoue → on le détecte pour afficher la bonne consigne (cf. `pushBlockedOnIOS`).
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

/** Clé publique VAPID (base64url) → octets, format attendu par la Push API. */
const applicationServerKey = (base64: string) => {
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

/** L'app tourne-t-elle en PWA installée (écran d'accueil / fenêtre dédiée) ? */
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // Safari iOS n'implémente pas display-mode : propriété maison.
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS moderne se présente comme un Mac tactile.
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Le navigateur sait-il faire du push ? */
export const pushSupported = () =>
  !!VAPID_PUBLIC_KEY &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** iOS dans un onglet : rien ne marchera tant que l'app n'est pas installée. */
export const pushBlockedOnIOS = () => isIOS() && !isStandalone();

/**
 * Marche à suivre pour débloquer des notifications refusées, selon
 * l'environnement (le chemin des réglages diffère d'un navigateur à l'autre).
 */
const deniedHelp = () => {
  const intro = "Notifications bloquées pour INFFLUNCH sur cet appareil.";
  const ua = navigator.userAgent;
  if (isIOS()) {
    return `${intro} Réglages de l'iPhone → Notifications → INFFLUNCH → Autoriser les notifications.`;
  }
  if (isStandalone()) {
    return `${intro} Menu ⋯ de l'app → Infos sur l'application (ou Paramètres du site) → Notifications → Autoriser, puis réessayez.`;
  }
  if (/Firefox\//.test(ua)) {
    return `${intro} Cliquez sur le cadenas à gauche de l'adresse → retirez le blocage des notifications, puis réessayez.`;
  }
  if (/Safari\//.test(ua) && !/Chrome\/|Chromium\//.test(ua)) {
    return `${intro} Safari → Réglages → Sites web → Notifications → INFFLUNCH → Autoriser, puis réessayez.`;
  }
  return `${intro} Cliquez sur le cadenas à gauche de l'adresse → Notifications → Autoriser, puis rechargez la page et réessayez.`;
};

/** Enregistre le service worker (appelé une fois au démarrage de l'app). */
export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch((e) => {
    console.warn("[push] service worker non enregistré :", e);
  });
};

/** Abonnement push existant pour cet appareil (null s'il n'y en a pas). */
export const getPushSubscription = async () => {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

/**
 * Demande la permission, s'abonne et enregistre l'appareil en base.
 * Renvoie une erreur explicite (message affichable) en cas d'échec.
 */
export const enablePush = async (): Promise<{ error?: string }> => {
  if (!pushSupported()) {
    return {
      error: pushBlockedOnIOS()
        ? "Sur iPhone, ajoutez d'abord INFFLUNCH à l'écran d'accueil (Partager → Sur l'écran d'accueil), puis ouvrez l'app depuis cette icône."
        : "Ce navigateur ne gère pas les notifications.",
    };
  }

  // Une fois refusée, le navigateur ne réaffiche plus jamais la demande :
  // inutile de la relancer, seul l'utilisateur peut débloquer dans ses réglages.
  if (Notification.permission === "denied") return { error: deniedHelp() };

  const permission = await Notification.requestPermission();
  if (permission === "denied") return { error: deniedHelp() };
  if (permission !== "granted") {
    // Fenêtre fermée sans choisir : elle reviendra au prochain clic.
    return {
      error:
        "Autorisation non accordée. Cliquez à nouveau et choisissez « Autoriser ».",
    };
  }

  const registration = await navigator.serviceWorker.ready;
  // Un abonnement peut déjà exister (autorisation redonnée) : on le réutilise.
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(VAPID_PUBLIC_KEY!),
    }));

  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) {
    return { error: "Abonnement incomplet renvoyé par le navigateur." };
  }

  const { data } = await supabaseClient.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { error: "Session expirée." };

  const { error } = await supabaseClient.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      user_id: userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" }
  );
  if (error) return { error: error.message };

  return {};
};

/** Désabonne cet appareil (navigateur + base). */
export const disablePush = async (): Promise<{ error?: string }> => {
  const subscription = await getPushSubscription();
  if (!subscription) return {};

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  const { error } = await supabaseClient
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) return { error: error.message };

  return {};
};
