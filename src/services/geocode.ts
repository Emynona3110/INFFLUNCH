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

/**
 * Géocodage INVERSE (coords → adresse) via Nominatim. Sert à proposer la
 * correction d'adresse quand on repositionne l'épingle sur la carte. Reconstruit
 * une adresse concise depuis les composants (numéro + rue, code postal + ville).
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
  if (!res.ok) throw new Error("Géocodage inverse impossible");
  const data = await res.json();
  const a = data?.address ?? {};
  const line1 = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.municipality || "";
  const line2 = [a.postcode, city].filter(Boolean).join(" ");
  const concise = [line1, line2].filter(Boolean).join(", ");
  return concise || data?.display_name || "";
};
