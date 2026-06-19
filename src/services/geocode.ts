/**
 * Géocodage d'adresse via Nominatim (OpenStreetMap, gratuit, sans clé) et
 * coordonnées de référence d'INFFLUX. Centralisé ici pour être partagé par la
 * minimap (fallback d'affichage) et le calcul de distance (useLocations).
 *
 * ⚠️ En production, les coordonnées des restos sont stockées en base
 * (restaurants.lat/lng, géocodées une seule fois à l'enregistrement admin) :
 * ce module ne sert qu'au géocodage ponctuel (admin save) et au fallback.
 */

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

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`;
  const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
  if (!res.ok) throw new Error("Géocodage impossible");
  const data = await res.json();
  if (!data?.length) throw new Error("Adresse introuvable");

  const coords: Coords = {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
  cache.set(address, coords);
  return coords;
};
