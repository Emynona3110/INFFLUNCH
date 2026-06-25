import L from "leaflet";
import { INFFLUX_COORDS, Coords } from "./geocode";

// Distance vol d'oiseau depuis INFFLUX + formatage, partagés (dialog resto,
// useLocations). Identique au calcul historique (Leaflet distanceTo).

/** Distance à vol d'oiseau (km) entre INFFLUX et un point. */
export const distanceKmFromInfflux = (c: Coords): number =>
  L.latLng(INFFLUX_COORDS.lat, INFFLUX_COORDS.lng).distanceTo(
    L.latLng(c.lat, c.lng)
  ) / 1000;

/** Format historique : "1.2km" (≥ 1 km) ou "350m" (arrondi à la dizaine). */
export const formatDistance = (km: number): string =>
  km >= 1
    ? `${(Math.round(km * 10) / 10).toFixed(1)}km`
    : `${Math.round((km * 1000) / 10) * 10}m`;
