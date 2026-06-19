import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * Minimap d'un restaurant situé par rapport à INFFLUX. Géocodage de l'adresse
 * via Nominatim (OpenStreetMap, gratuit) — la même brique que le calcul de
 * distance (cf. useLocations). Tuiles OSM (gratuites). Aucune clé requise.
 */

type Coords = { lat: number; lng: number };

const INFFLUX: Coords = { lat: 48.8487433, lng: 2.4280408 };

// Cache module-level : on ne re-géocode pas une adresse déjà résolue.
const geocodeCache = new Map<string, Coords>();

const geocodeAddress = async (address: string): Promise<Coords> => {
  const cached = geocodeCache.get(address);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`;
  const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
  if (!res.ok) throw new Error("Géocodage impossible");
  const data = await res.json();
  if (!data?.length) throw new Error("Adresse introuvable");

  const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  geocodeCache.set(address, coords);
  return coords;
};

// Marqueur "goutte" coloré (divIcon → pas d'image cassée par le bundler).
const pinIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 3px 6px rgba(2,8,40,.45);border:2px solid #fff"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });

// Cadre la vue sur les deux points au montage.
const FitBounds = ({ points }: { points: Coords[] }) => {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [38, 38], maxZoom: 15 });
  }, [map, points]);
  return null;
};

interface Props {
  address: string;
  name: string;
  distanceLabel?: string;
}

const RestaurantMiniMap = ({ address, name, distanceLabel }: Props) => {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    geocodeAddress(address)
      .then((c) => {
        if (cancelled) return;
        setCoords(c);
        setStatus("ok");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (status !== "ok" || !coords) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center bg-muted/40 text-sm text-foreground/50">
        {status === "error" ? (
          "Emplacement indisponible"
        ) : (
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
        )}
      </div>
    );
  }

  const points = [INFFLUX, coords];

  return (
    <div className="relative h-full min-h-[220px]">
      <MapContainer
        className="h-full w-full"
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ background: "var(--muted)" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <FitBounds points={points} />
        <Polyline
          positions={points.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#113894", weight: 3, dashArray: "6 7", opacity: 0.7 }}
        />
        <Marker position={[INFFLUX.lat, INFFLUX.lng]} icon={pinIcon("#113894")} />
        <Marker position={[coords.lat, coords.lng]} icon={pinIcon("#EA580C")} />
      </MapContainer>

      {/* Légende */}
      <div className="pointer-events-none absolute left-3 top-3 z-[500] flex flex-col gap-1 rounded-lg bg-card/85 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
        <Tooltip label="Point de départ">
          <span className="pointer-events-auto flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" /> INFFLUX
          </span>
        </Tooltip>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
          <span className="max-w-[120px] truncate">{name}</span>
        </span>
      </div>

      {distanceLabel && (
        <div className="absolute bottom-3 right-3 z-[500] rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
          {distanceLabel}
        </div>
      )}
    </div>
  );
};

export default RestaurantMiniMap;
