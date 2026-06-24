import supabaseClient from "./supabaseClient";

// Temps de marche réel (réseau piéton) depuis INFFLUX.
// Source : Edge Function `walk-time` (OpenRouteService, clé côté serveur).
// Si indisponible (quota, hors zone…), on retombe sur une estimation à partir
// de la distance à vol d'oiseau.

/**
 * Estimation de repli : distance vol d'oiseau (km) → minutes à pied.
 * ~5 km/h, majorée de 30 % pour approcher les détours réels.
 */
export const estimateWalkMinutes = (distanceKm: number): number =>
  Math.max(1, Math.round((distanceKm / 5) * 60 * 1.3));

/**
 * Temps de marche réel en minutes via l'Edge Function ORS.
 * Renvoie null si le service est indisponible (l'appelant décide du repli).
 */
export async function fetchWalkMinutes(
  lat: number,
  lng: number
): Promise<number | null> {
  try {
    const { data, error } = await supabaseClient.functions.invoke("walk-time", {
      body: { lat, lng },
    });
    if (error) return null;
    const minutes = (data as { minutes?: number | null })?.minutes;
    return typeof minutes === "number" ? minutes : null;
  } catch {
    return null;
  }
}
