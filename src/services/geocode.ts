/**
 * Géocodage d'adresse et coordonnées de référence d'INFFLUX. Centralisé ici
 * pour être partagé par la minimap (fallback d'affichage) et le calcul de
 * distance (useLocations).
 *
 * ⚠️ Les appels partent de l'Edge Function `geocode`, PAS du navigateur :
 * Nominatim refuse les requêtes front (sa réponse d'erreur n'a pas d'en-tête
 * `Access-Control-Allow-Origin` → « blocked by CORS policy » à l'enregistrement
 * d'un resto). Côté serveur il n'y a pas de CORS, et la fonction essaie
 * OpenRouteService avant Nominatim.
 *
 * ⚠️ En production, les coordonnées des restos sont stockées en base
 * (restaurants.lat/lng, géocodées une seule fois à l'enregistrement admin) :
 * ce module ne sert qu'au géocodage ponctuel (admin save) et au fallback.
 */

import supabaseClient from "./supabaseClient";

export interface Coords {
  lat: number;
  lng: number;
}

/** Localisation d'INFFLUX (point de départ des distances/itinéraires). */
export const INFFLUX_COORDS: Coords = { lat: 48.8487433, lng: 2.4280408 };

// Cache module-level : on ne re-géocode pas une adresse déjà résolue.
const cache = new Map<string, Coords>();

export const geocodeAddress = async (address: string): Promise<Coords> => {
  const cached = cache.get(address);
  if (cached) return cached;

  const { data, error } = await supabaseClient.functions.invoke("geocode", {
    body: { q: address },
  });
  if (error) throw new Error("Géocodage impossible");

  const { lat, lng } = (data ?? {}) as Partial<Coords>;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Adresse introuvable");
  }

  const coords: Coords = { lat, lng };
  cache.set(address, coords);
  return coords;
};

/**
 * Géocodage INVERSE (coords → adresse). Sert à proposer la correction
 * d'adresse quand on repositionne l'épingle sur la carte ; l'Edge Function
 * recompose une adresse concise (numéro + rue, code postal + ville).
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string> => {
  const { data, error } = await supabaseClient.functions.invoke("geocode", {
    body: { lat, lng },
  });
  if (error) throw new Error("Géocodage inverse impossible");
  return ((data as { address?: string })?.address ?? "").trim();
};
