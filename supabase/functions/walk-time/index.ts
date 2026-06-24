// Edge Function : walk-time
// Calcule le temps de marche RÉEL (réseau piéton, pas vol d'oiseau) depuis
// INFFLUX jusqu'à un resto, via OpenRouteService (profil foot-walking).
//
// Pourquoi une Edge Function : la clé ORS reste un SECRET serveur, jamais dans
// le bundle front. Appelée par le dialog resto (à l'enregistrement) ET par le
// script de backfill → une seule intégration ORS.
//
// Entrée  : { lat: number, lng: number }   (coordonnées du resto)
// Sortie  : { minutes: number | null, meters: number | null }
//           minutes = null si ORS indisponible → le front bascule sur une
//           estimation (vol d'oiseau × 1,3).
//
// Secret requis (Dashboard → Edge Functions → walk-time → Secrets) :
//   ORS_API_KEY   (clé OpenRouteService, gratuite, NE PAS exposer côté front)
//
// Déploiement : Dashboard Supabase → Edge Functions → coller ce code → Deploy.
// Laisser "Verify JWT" activé (la clé anon envoyée par functions.invoke suffit).

const ORS_URL =
  "https://api.openrouteservice.org/v2/directions/foot-walking";

// Point de départ = INFFLUX (identique à INFFLUX_COORDS côté front).
const INFFLUX = { lat: 48.8487433, lng: 2.4280408 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ORS_KEY = Deno.env.get("ORS_API_KEY");
    if (!ORS_KEY) return json({ error: "Service mal configuré." }, 500);

    const { lat, lng } = await req.json().catch(() => ({}));
    if (typeof lat !== "number" || typeof lng !== "number") {
      return json({ error: "Coordonnées invalides." }, 400);
    }

    // ORS attend l'ordre lng,lat.
    const url =
      `${ORS_URL}?api_key=${ORS_KEY}` +
      `&start=${INFFLUX.lng},${INFFLUX.lat}&end=${lng},${lat}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      // Quota dépassé, hors zone, etc. → le front fera une estimation.
      return json({ minutes: null, meters: null }, 200);
    }

    const data = await res.json();
    const summary = data?.features?.[0]?.properties?.summary;
    const seconds = summary?.duration;
    const meters = summary?.distance;

    if (typeof seconds !== "number") {
      return json({ minutes: null, meters: null }, 200);
    }

    return json(
      {
        minutes: Math.max(1, Math.round(seconds / 60)),
        meters: typeof meters === "number" ? Math.round(meters) : null,
      },
      200
    );
  } catch {
    return json({ minutes: null, meters: null }, 200);
  }
});
