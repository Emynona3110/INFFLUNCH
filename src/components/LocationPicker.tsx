import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { INFFLUX_COORDS } from "@/services/geocode";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import MapZoomControl from "@/components/MapZoomControl";
import inffluxLogo from "@/assets/infflux.svg";

/**
 * Sélecteur de position (dialog Carte) : carte avec une épingle resto
 * DÉPLAÇABLE (drag) + clic sur la carte pour repositionner, doublée de champs
 * lat/lng éditables synchronisés. Sert à corriger les adresses mal géocodées.
 * Layout flexible : la carte occupe toute la hauteur dispo (flex-1).
 */

const restoIcon = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#EA580C;box-shadow:0 3px 6px rgba(2,8,40,.45);border:2px solid #fff"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

const inffluxIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(2,8,40,.45);border:2px solid #113894"><img src="${inffluxLogo}" alt="" style="width:16px;height:16px" /></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Récupère l'instance de carte (pour le contrôle zoom partagé).
function MapRef({ onReady }: { onReady: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

// Recentre uniquement si le point sort de la vue → pas de saut pendant un drag.
function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null) return;
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

// Recalcule la taille après montage (la carte naît dans un dialog dont le
// layout n'est pas encore stabilisé → tuiles grises sinon).
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function ClickToPlace({ onPick }: { onPick: (c: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (c: { lat: number; lng: number }) => void;
  className?: string;
}

export default function LocationPicker({ lat, lng, onChange, className }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [map, setMap] = useState<L.Map | null>(null);
  const hasCoords = lat != null && lng != null;

  // Recentrage initial (une fois par ouverture) sur le RESTO au zoom max, dès
  // que la carte et les coords sont prêtes. Le composant est remonté à chaque
  // ouverture du dialog → le focus se rejoue à chaque fois.
  const focusedRef = useRef(false);
  useEffect(() => {
    if (focusedRef.current || !map || lat == null || lng == null) return;
    focusedRef.current = true;
    map.setView([lat, lng], map.getMaxZoom());
  }, [map, lat, lng]);
  const center: [number, number] = hasCoords
    ? [lat as number, lng as number]
    : [INFFLUX_COORDS.lat, INFFLUX_COORDS.lng];

  // Édition d'un champ : on complète l'autre coord (fallback INFFLUX si vide).
  const setField = (which: "lat" | "lng", value: string) => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return;
    onChange({
      lat: which === "lat" ? n : lat ?? INFFLUX_COORDS.lat,
      lng: which === "lng" ? n : lng ?? INFFLUX_COORDS.lng,
    });
  };

  const inputCls =
    "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="shrink-0 text-xs text-foreground/50">
        Glisser l'épingle orange ou cliquer sur la carte pour repositionner le restaurant.
      </p>
      <div
        className={`osm-map relative min-h-[240px] flex-1 overflow-hidden rounded-lg border border-border${
          isDark ? " is-dark" : ""
        }`}
      >
        <MapContainer
          className="h-full w-full"
          center={center}
          zoom={16}
          scrollWheelZoom
          zoomControl={false}
          attributionControl={false}
          style={{ background: "var(--muted)" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains="abc"
            attribution="&copy; OpenStreetMap"
          />
          <Marker position={[INFFLUX_COORDS.lat, INFFLUX_COORDS.lng]} icon={inffluxIcon} />
          {hasCoords && (
            <Marker
              position={[lat as number, lng as number]}
              icon={restoIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  onChange({ lat: p.lat, lng: p.lng });
                },
              }}
            />
          )}
          <ClickToPlace onPick={onChange} />
          <Recenter lat={lat} lng={lng} />
          <InvalidateSize />
          <MapRef onReady={setMap} />
        </MapContainer>

        <MapZoomControl map={map} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/60">Latitude</span>
          <input
            type="number"
            step="any"
            value={lat ?? ""}
            onChange={(e) => setField("lat", e.target.value)}
            placeholder="48.8487"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/60">Longitude</span>
          <input
            type="number"
            step="any"
            value={lng ?? ""}
            onChange={(e) => setField("lng", e.target.value)}
            placeholder="2.4280"
            className={inputCls}
          />
        </label>
      </div>
    </div>
  );
}
