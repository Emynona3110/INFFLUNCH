import { useState } from "react";
import L from "leaflet";

interface Coordinates {
  lat: number;
  lng: number;
}

const companyCoords: Coordinates = {
  lat: 48.8487433,
  lng: 2.4280408,
};

const geocodeAddress = async (address: string): Promise<Coordinates> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "leaflet-distance-app",
    },
  });

  if (!response.ok) throw new Error("Erreur lors du géocodage");

  const data = await response.json();
  if (!data || data.length === 0) throw new Error("Adresse non trouvée");

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
};

const getDistanceInKm = (a: Coordinates, b: Coordinates): number => {
  const pointA = L.latLng(a.lat, a.lng);
  const pointB = L.latLng(b.lat, b.lng);
  return pointA.distanceTo(pointB) / 1000;
};

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
