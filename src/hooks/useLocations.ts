import { useState } from "react";
import { geocodeAddress, INFFLUX_COORDS, Coords as Coordinates } from "../services/geocode";
import { distanceKm as getDistanceInKm } from "../services/distance";

const companyCoords = INFFLUX_COORDS;

interface LocationResult {
  coords: Coordinates;
  distanceKm: number;
  formattedDistance: string;
}

const useLocations = () => {
  const [data, setData] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = async (address: string) => {
    setLoading(true);
    setError(null);

    try {
      const coords = await geocodeAddress(address);
      const distanceKm = getDistanceInKm(companyCoords, coords);
      const formatted =
        distanceKm >= 1
          ? `${(Math.round(distanceKm * 10) / 10).toFixed(1)}km`
          : `${Math.round((distanceKm * 1000) / 10) * 10}m`;

      setData({ coords, distanceKm, formattedDistance: formatted });
      return { coords, distanceKm, formattedDistance: formatted };
    } catch (err: any) {
      setError(err.message || "Erreur lors du géocodage");
      setData(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchLocation };
};

export default useLocations;
