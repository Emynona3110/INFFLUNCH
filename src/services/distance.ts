import { INFFLUX_COORDS, Coords } from "./geocode";

// Distance vol d'oiseau depuis INFFLUX + formatage, partagés (dialog resto,
// useLocations). Identique au calcul historique (Leaflet distanceTo), sans
// importer Leaflet : il reste ainsi dans le chunk de la carte.

/** Rayon terrestre de Leaflet (L.CRS.Earth.R), en mètres. */
const EARTH_RADIUS_M = 6371000;

/** Distance à vol d'oiseau (km) entre deux points : haversine, comme
 *  L.CRS.Earth.distance. */
export const distanceKm = (a: Coords, b: Coords): number => {
  const rad = Math.PI / 180;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const sinDLat = Math.sin(((b.lat - a.lat) * rad) / 2);
  const sinDLon = Math.sin(((b.lng - a.lng) * rad) / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return (EARTH_RADIUS_M * c) / 1000;
};

/** Distance à vol d'oiseau (km) entre INFFLUX et un point. */
export const distanceKmFromInfflux = (c: Coords): number =>
  distanceKm(INFFLUX_COORDS, c);

/** Format historique : "1.2km" (≥ 1 km) ou "350m" (arrondi à la dizaine). */
export const formatDistance = (km: number): string =>
  km >= 1
    ? `${(Math.round(km * 10) / 10).toFixed(1)}km`
    : `${Math.round((km * 1000) / 10) * 10}m`;
