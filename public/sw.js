/* Service worker INFFLUNCH.
 *
 * Rôle unique : recevoir les notifications push (demandes d'accès) et ouvrir
 * l'app au bon endroit quand on tape dessus. Volontairement PAS de cache
 * offline : l'app reste servie normalement par le réseau.
 *
 * Sur iOS, le push web n'existe que pour une PWA ajoutée à l'écran d'accueil
 * (iOS 16.4+) — un simple onglet Safari ne reçoit rien.
 */

// Nouvelle version active immédiatement, sans attendre la fermeture des onglets.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "INFFLUNCH";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    // Même tag → une notification en remplace une autre au lieu d'empiler.
    tag: payload.tag || "infflunch",
    renotify: true,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Fenêtre déjà ouverte : on la remet devant et on la navigue.
      for (const client of clients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(url);
            } catch {
              /* navigation refusée (origine différente) : on laisse en l'état */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
