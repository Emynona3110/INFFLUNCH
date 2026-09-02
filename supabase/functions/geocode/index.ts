// Edge Function : geocode
// Géocodage direct (adresse → coordonnées) et inverse (coordonnées → adresse).
//
// Pourquoi une Edge Function : Nominatim (OpenStreetMap) REFUSE les appels
// venant d'un navigateur — sa réponse d'erreur n'a pas d'en-tête
// `Access-Control-Allow-Origin`, ce qui donne côté front un « blocked by CORS
// policy » à chaque enregistrement de resto. Depuis un serveur il n'y a pas de
// CORS du tout, et on peut envoyer le User-Agent que leur politique d'usage
// exige. On profite au passage de la clé ORS déjà en place pour un géocodeur
// primaire plus fiable (Pelias), Nominatim ne servant plus que de secours.
//
// Entrée  : { q: string }              → géocodage direct
//           { lat: number, lng: number } → géocodage inverse
// Sortie  : { lat, lng } | { address: string } | { error: string }
//
// Secret utilisé (déjà défini pour walk-time, les secrets sont partagés par
// toutes les fonctions du projet) :
//   ORS_API_KEY   (OpenRouteService ; optionnel — sans lui on passe direct
//                  sur Nominatim)
//
// Déploiement : Dashboard Supabase → Edge Functions → coller ce code → Deploy.
// Laisser "Verify JWT" activé (la clé anon envoyée par functions.invoke suffit).

const ORS_GEOCODE = "https://api.openrouteservice.org/geocode";
const NOMINATIM = "https://nominatim.openstreetmap.org";

// Nominatim exige un User-Agent identifiant l'application (sinon 403).
const UA = "INFFLUNCH/1.0 (https://infflunch.com)";

// Recherches biaisées vers la France : les restos sont tous autour du bureau.
const COUNTRY = "FR";

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

/** Recompose « 112 Rue Marceau, 93100 Montreuil » depuis des champs séparés. */
function formatAddress(
  houseNumber: string,
  street: string,
  postcode: string,
  city: string
): string {
  const line1 = [houseNumber, street].filter(Boolean).join(" ");
  const line2 = [postcode, city].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ");
}

/* ------------------------------ géocodage direct ------------------------------ */

async function forwardOrs(q: string, key: string) {
  const url =
    `${ORS_GEOCODE}/search?api_key=${key}` +
    `&text=${encodeURIComponent(q)}&boundary.country=${COUNTRY}&size=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  // Pelias renvoie les coordonnées dans l'ordre [lng, lat].
  const c = data?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  return { lat: Number(c[1]), lng: Number(c[0]) };
}

async function forwardNominatim(q: string) {
  const url =
    `${NOMINATIM}/search?format=json&limit=1&countrycodes=fr` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "fr" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.[0];
  if (!hit) return null;
  return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
}

/* ----------------------------- géocodage inverse ----------------------------- */

async function reverseOrs(lat: number, lng: number, key: string) {
  const url =
    `${ORS_GEOCODE}/reverse?api_key=${key}` +
    `&point.lat=${lat}&point.lon=${lng}&size=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const p = (await res.json())?.features?.[0]?.properties;
  if (!p) return null;
  return (
    formatAddress(p.housenumber ?? "", p.street ?? "", p.postalcode ?? "",
      p.locality ?? p.county ?? "") || p.label || null
  );
}

async function reverseNominatim(lat: number, lng: number) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "fr" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const a = data?.address ?? {};
  const city = a.city || a.town || a.village || a.municipality || "";
  return (
    formatAddress(a.house_number ?? "", a.road ?? "", a.postcode ?? "", city) ||
    data?.display_name ||
    null
  );
}

/* ---------------------------------- handler ---------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get("ORS_API_KEY") ?? "";
    const { q, lat, lng } = await req.json().catch(() => ({}));

    // --- géocodage inverse ---
    if (typeof lat === "number" && typeof lng === "number") {
      const address =
        (key ? await reverseOrs(lat, lng, key).catch(() => null) : null) ??
        (await reverseNominatim(lat, lng).catch(() => null));
      if (!address) return json({ error: "Géocodage inverse impossible" }, 502);
      return json({ address }, 200);
    }

    // --- géocodage direct ---
    if (typeof q === "string" && q.trim()) {
      const coords =
        (key ? await forwardOrs(q, key).catch(() => null) : null) ??
        (await forwardNominatim(q).catch(() => null));
      // 200 volontaire : `functions.invoke` transforme tout statut non-2xx en
      // erreur générique côté front, ce qui masquerait « adresse introuvable »
      // (cas normal d'une saisie approximative) derrière « géocodage impossible ».
      if (!coords) return json({ error: "Adresse introuvable" }, 200);
      return json(coords, 200);
    }

    return json({ error: "Paramètres invalides." }, 400);
  } catch {
    return json({ error: "Géocodage impossible" }, 500);
  }
});
