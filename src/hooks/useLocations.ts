import { useEffect, useState } from "react";
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

const useLocations = (address: string) => {
  const [data, setData] = useState<LocationResult | null>(null);

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    geocodeAddress(address)
      .then((coords) => {
        const distanceKm = getDistanceInKm(companyCoords, coords);
        const formatted =
          distanceKm >= 1
            ? `${(Math.round(distanceKm * 10) / 10).toFixed(1)}km`
            : `${Math.round((distanceKm * 1000) / 10) * 10}m`;

        if (!cancelled) {
          setData({ coords, distanceKm, formattedDistance: formatted });
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return data;
};

export default useLocations;
