import { useCallback, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FiNavigation, FiPlus, FiMinus } from "react-icons/fi";
import { geocodeAddress, INFFLUX_COORDS, Coords } from "@/services/geocode";
import { useTheme } from "@/lib/theme";
import inffluxLogo from "@/assets/infflux.svg";
import inffluxLogoWhite from "@/assets/w-infflux.svg";

/**
 * Minimap d'un restaurant situé par rapport à INFFLUX. 100 % open source :
 * - Lib Leaflet (BSD) + données/tuiles OpenStreetMap (projet associatif).
 * - Dark mode : filtre CSS sur les tuiles claires (cf. .osm-map dans tailwind.css),
 *   pas de fournisseur de tuiles sombres tiers.
 * - Coordonnées : lit en priorité celles stockées en base (restaurants.lat/lng) ;
 *   fallback géocodage Nominatim si absentes (restos pas encore backfillés).
 * - Bouton « itinéraire » vers Google Maps depuis INFFLUX (meilleure UX de
 *   routage ; le reste de la carte reste open source OSM).
 */

// Marqueur "goutte" coloré (divIcon → pas d'image cassée par le bundler).
const pinIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 3px 6px rgba(2,8,40,.45);border:2px solid #fff"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });

// Marqueur INFFLUX : pastille blanche avec le logo du site.
const inffluxIcon = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;border-radius:9999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(2,8,40,.45);border:2px solid #113894"><img src="${inffluxLogo}" alt="" style="width:18px;height:18px" /></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Récupère l'instance de carte une fois prête (pour le recentrage).
const MapReady = ({ onReady }: { onReady: (m: L.Map) => void }) => {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
};

// Centre la vue sur INFFLUX tout en gardant le resto visible : on cadre une
// zone symétrique autour d'INFFLUX (le resto et son point miroir) → INFFLUX
// reste au centre.
const centerOnInfflux = (map: L.Map, target: Coords) => {
  const mirror = {
    lat: 2 * INFFLUX_COORDS.lat - target.lat,
    lng: 2 * INFFLUX_COORDS.lng - target.lng,
  };
  const bounds = L.latLngBounds([
    [target.lat, target.lng],
    [mirror.lat, mirror.lng],
  ]);
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
};

interface Props {
  address: string;
  /** Coordonnées stockées en base (prioritaires). */
  lat?: number | null;
  lng?: number | null;
  distanceLabel?: string;
}

const RestaurantMiniMap = ({ address, lat, lng, distanceLabel }: Props) => {
  const { theme } = useTheme();
  const hasStored = lat != null && lng != null;

  const [coords, setCoords] = useState<Coords | null>(
    hasStored ? { lat: lat as number, lng: lng as number } : null
  );
  const [status, setStatus] = useState<"loading" | "ok" | "error">(
    hasStored ? "ok" : "loading"
  );

  useEffect(() => {
    if (hasStored) {
      setCoords({ lat: lat as number, lng: lng as number });
      setStatus("ok");
      return;
    }
    // Fallback : géocodage à la volée si les coords ne sont pas en base.
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
  }, [hasStored, lat, lng, address]);

  // Recentrage sur INFFLUX (vue initiale + bouton viseur).
  const [map, setMap] = useState<L.Map | null>(null);
  const recenter = useCallback(() => {
    if (map && coords) centerOnInfflux(map, coords);
  }, [map, coords]);
  useEffect(() => recenter(), [recenter]);

  if (status !== "ok" || !coords) {
    return (
      <div className="flex h-60 items-center justify-center bg-muted/40 text-sm text-foreground/50">
        {status === "error" ? (
          "Emplacement indisponible"
        ) : (
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
        )}
      </div>
    );
  }

  const points = [INFFLUX_COORDS, coords];
  const isDark = theme === "dark";

  // Itinéraire Google Maps depuis INFFLUX vers le resto.
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${INFFLUX_COORDS.lat},${INFFLUX_COORDS.lng}&destination=${coords.lat},${coords.lng}`;

  return (
    <div className={`osm-map relative h-60${isDark ? " is-dark" : ""}`}>
      <MapContainer
        className="h-full w-full"
        scrollWheelZoom={false}
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
        <Polyline
          positions={points.map((p) => [p.lat, p.lng])}
          pathOptions={{
            color: isDark ? "#5B82E6" : "#113894",
            weight: 3,
            dashArray: "6 7",
            opacity: 0.75,
          }}
        />
        <Marker position={[INFFLUX_COORDS.lat, INFFLUX_COORDS.lng]} icon={inffluxIcon} />
        <Marker position={[coords.lat, coords.lng]} icon={pinIcon("#EA580C")} />
      </MapContainer>

      {/* Zoom +/- */}
      <div className="absolute right-3 top-3 z-[500] flex flex-col overflow-hidden rounded-full bg-card shadow">
        <button
          type="button"
          onClick={() => map?.zoomIn()}
          aria-label="Zoomer"
          className="grid h-7 w-7 place-items-center text-foreground/80 transition hover:bg-muted hover:text-primary"
        >
          <FiPlus className="h-4 w-4" />
        </button>
        <span className="h-px bg-border" />
        <button
          type="button"
          onClick={() => map?.zoomOut()}
          aria-label="Dézoomer"
          className="grid h-7 w-7 place-items-center text-foreground/80 transition hover:bg-muted hover:text-primary"
        >
          <FiMinus className="h-4 w-4" />
        </button>
      </div>

      {/* Distance + recentrage INFFLUX + itinéraire */}
      <div className="absolute bottom-3 right-3 z-[500] flex items-center gap-2">
        {distanceLabel && (
          <span className="inline-flex h-7 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow">
            {distanceLabel}
          </span>
        )}
        <button
          type="button"
          onClick={recenter}
          aria-label="Recentrer sur INFFLUX"
          title="Recentrer sur INFFLUX"
          className="grid h-7 w-7 place-items-center rounded-full bg-card shadow transition hover:bg-muted"
        >
          <img
            src={isDark ? inffluxLogoWhite : inffluxLogo}
            alt=""
            className="h-4 w-4"
          />
        </button>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold text-foreground shadow transition hover:bg-muted"
        >
          <FiNavigation className="h-3.5 w-3.5" />
          Itinéraire
        </a>
      </div>
    </div>
  );
};

export default RestaurantMiniMap;
