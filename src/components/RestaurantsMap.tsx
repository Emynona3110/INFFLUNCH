import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaStar } from "react-icons/fa";
import MapZoomControl from "@/components/MapZoomControl";
import { INFFLUX_COORDS } from "@/services/geocode";
import { useTheme } from "@/lib/theme";
import { Restaurant } from "@/hooks/useRestaurants";
import inffluxLogo from "@/assets/infflux.svg";
import inffluxLogoWhite from "@/assets/w-infflux.svg";

/**
 * Carte globale de TOUS les restaurants situés (lat/lng en base), positionnés
 * autour d'INFFLUX. Même socle open source que la minimap (Leaflet + tuiles OSM,
 * dark mode via filtre CSS .osm-map.is-dark). Les restos sans coordonnées sont
 * ignorés (badge récap en bas).
 */

const pinIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 3px 6px rgba(2,8,40,.45);border:2px solid #fff"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });

const inffluxIcon = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;border-radius:9999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(2,8,40,.45);border:2px solid #113894"><img src="${inffluxLogo}" alt="" style="width:18px;height:18px" /></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const MapReady = ({ onReady }: { onReady: (m: L.Map) => void }) => {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
};

interface Props {
  restaurants: Restaurant[];
}

const RestaurantsMap = ({ restaurants }: Props) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [map, setMap] = useState<L.Map | null>(null);

  const located = useMemo(
    () => restaurants.filter((r) => r.lat != null && r.lng != null),
    [restaurants]
  );
  const missing = restaurants.length - located.length;

  // Cadre la vue sur INFFLUX + tous les restos situés.
  const fit = useCallback(() => {
    if (!map) return;
    const points: [number, number][] = [
      [INFFLUX_COORDS.lat, INFFLUX_COORDS.lng],
      ...located.map((r) => [r.lat as number, r.lng as number] as [number, number]),
    ];
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 16 });
    } else {
      map.setView([INFFLUX_COORDS.lat, INFFLUX_COORDS.lng], 14);
    }
  }, [map, located]);
  useEffect(() => fit(), [fit]);

  return (
    <div
      className={`osm-map relative h-full w-full overflow-hidden rounded-card border border-border${
        isDark ? " is-dark" : ""
      }`}
    >
      <MapContainer
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        style={{ background: "var(--muted)" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains="abc"
          attribution="&copy; OpenStreetMap"
        />
        <MapReady onReady={setMap} />

        <Marker
          position={[INFFLUX_COORDS.lat, INFFLUX_COORDS.lng]}
          icon={inffluxIcon}
        />

        {located.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat as number, r.lng as number]}
            icon={pinIcon("#f79220")}
            eventHandlers={{ click: () => navigate(`/restaurant/${r.slug}`) }}
          >
            {/* Infos au survol ; le clic sur le pin ouvre la fiche. */}
            <Tooltip direction="top" offset={[0, -18]} opacity={1}>
              <div className="min-w-[150px]">
                <div className="font-display text-sm font-bold text-card-foreground">
                  {r.name}
                </div>
                {r.rating != null && r.rating > 0 && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-foreground/70">
                    <FaStar className="h-3 w-3 text-amber-500" />
                    {r.rating}
                    {r.reviews > 0 && <span>· {r.reviews} avis</span>}
                  </div>
                )}
                <div className="mt-0.5 text-xs text-foreground/55">
                  {r.distanceLabel}
                  {r.walk_minutes != null && ` · ${r.walk_minutes} min`}
                </div>
                <div className="mt-1 text-[11px] font-medium text-primary">
                  Cliquer pour voir la fiche
                </div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <MapZoomControl map={map} />

      {/* Recentrage sur l'ensemble */}
      <div className="absolute bottom-3 right-3 z-[500] flex items-center gap-2">
        {missing > 0 && (
          <span className="inline-flex h-7 items-center rounded-full bg-card px-3 text-xs font-medium text-foreground/60 shadow">
            {missing} sans localisation
          </span>
        )}
        <button
          type="button"
          onClick={fit}
          aria-label="Recentrer la carte"
          title="Recentrer la carte"
          className="grid h-7 w-7 place-items-center rounded-full bg-card shadow transition hover:bg-muted"
        >
          <img src={isDark ? inffluxLogoWhite : inffluxLogo} alt="" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default RestaurantsMap;
