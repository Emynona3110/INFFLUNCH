import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaStar } from "react-icons/fa";
import MapZoomControl from "@/components/MapZoomControl";
import OsmAttribution from "@/components/OsmAttribution";
import { INFFLUX_COORDS } from "@/services/geocode";
import { useTheme } from "@/lib/theme";
import { Restaurant } from "@/hooks/useRestaurants";
import { clusterize } from "@/services/mapClusters";

/**
 * Carte globale des restaurants situés (lat/lng en base ; les fermés sont
 * écartés en amont par la grille), positionnés
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

// Marqueur INFFLUX : même goutte que les restos, en bleu de marque.
const inffluxIcon = pinIcon("#113894");

/** Groupe de restaurants trop proches pour être distingués : une pastille
 *  ronde portant leur nombre, dans l'orange des pins qu'elle remplace. Elle
 *  s'ancre en son centre, là où une goutte s'ancre sur sa pointe. */
const clusterIcon = (count: number) => {
  const size = count >= 10 ? 38 : 32;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#f79220;border:2px solid #fff;box-shadow:0 3px 8px rgba(2,8,40,.45);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${
      count >= 10 ? 14 : 13
    }px">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MapReady = ({ onReady }: { onReady: (m: L.Map) => void }) => {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
};

/** Le regroupement des pins dépend du zoom, et de lui seul : un simple
 *  déplacement ne change rien aux distances à l'écran. */
const ZoomWatcher = ({
  onZoom,
  onZoomStart,
}: {
  onZoom: (z: number) => void;
  onZoomStart: () => void;
}) => {
  // `moveend` en plus de `zoomend` : la carte est montée sans zoom initial
  // (c'est le cadrage sur INFFLUX et les restaurants qui le fixe), et poser la
  // valeur de départ demande un événement dont on soit sûr.
  //
  // `zoomstart` et non `zoomend` pour refermer : les groupes sont recomposés au
  // nouveau zoom, une bulle laissée ouverte parlerait d'un groupe qui n'existe
  // plus. On la referme donc dès que le mouvement s'amorce. Un simple
  // déplacement, lui, ne change rien aux groupes et n'y touche pas — on fait
  // souvent glisser la carte justement pour mieux voir la bulle.
  const map = useMapEvents({
    zoomstart: () => onZoomStart(),
    zoomend: () => onZoom(map.getZoom()),
    moveend: () => onZoom(map.getZoom()),
  });
  return null;
};

/** Marge gardée entre une bulle ouverte et le bord de la carte. */
const BUBBLE_MARGIN = 12;

/** Tap sur la carte (hors pin) : referme la bulle ouverte sur mobile. */
const MapTap = ({ onTap }: { onTap: () => void }) => {
  useMapEvents({ click: onTap });
  return null;
};

/** Écran tactile sans survol (téléphone/tablette) : la bulle ne peut pas
 *  s'ouvrir au survol, on la montre au 1er tap et on navigue au 2e. */
const isTouch =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(hover: none)").matches;

interface Props {
  restaurants: Restaurant[];
}

const RestaurantsMap = ({ restaurants }: Props) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [map, setMap] = useState<L.Map | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  // Mobile : pin dont la bulle est ouverte (1er tap) ; le 2e tap ouvre la fiche.
  const [activeId, setActiveId] = useState<number | null>(null);
  // Groupe dont la liste est ouverte. Agrandir ne suffisait pas : deux
  // restaurants à la même adresse ne se séparent à aucun zoom, leurs fiches
  // devenaient inaccessibles. La liste y mène toujours.
  const [openCluster, setOpenCluster] = useState<string | null>(null);

  const located = useMemo(
    () => restaurants.filter((r) => r.lat != null && r.lng != null),
    [restaurants]
  );
  const missing = restaurants.length - located.length;

  // Pins regroupés tant qu'ils se chevauchent ; un groupe d'un seul reste un
  // pin ordinaire, avec sa bulle.
  const clusters = useMemo(
    () => (map && zoom != null ? clusterize(map, zoom, located) : []),
    [map, zoom, located]
  );

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

  /**
   * Bulle ouverte : on lui rend la molette et les clics, puis on ramène la
   * carte sous elle si elle déborde.
   *
   * Leaflet capte tout ce qui se passe au-dessus de la carte — sans cela,
   * faire défiler la liste zoomait. Et une bulle s'ouvre vers le haut à
   * l'aplomb de son pin : près d'un bord, elle sortait du cadre, sans que
   * Leaflet ne la replace (un tooltip n'a pas l'`autoPan` d'un popup).
   *
   * En ref de rappel : Leaflet s'abonne à l'élément lui-même, les écouteurs
   * s'en vont avec lui. Le recadrage attend la frame suivante, le temps que la
   * bulle soit posée et mesurable.
   */
  const openedBubble = (el: HTMLElement | null) => {
    if (!el) return;
    L.DomEvent.disableScrollPropagation(el);
    L.DomEvent.disableClickPropagation(el);

    requestAnimationFrame(() => {
      const bubble = el.closest(".leaflet-tooltip");
      if (!map || !bubble) return;
      const box = bubble.getBoundingClientRect();
      const frame = map.getContainer().getBoundingClientRect();

      // Déplacement à appliquer À LA VUE : la carte va d'un côté, la bulle de
      // l'autre. Un débordement par la gauche donne un écart négatif, donc une
      // vue qui recule, donc une bulle qui avance vers l'intérieur.
      let dx = 0;
      let dy = 0;
      if (box.left < frame.left + BUBBLE_MARGIN) {
        dx = box.left - (frame.left + BUBBLE_MARGIN);
      } else if (box.right > frame.right - BUBBLE_MARGIN) {
        dx = box.right - (frame.right - BUBBLE_MARGIN);
      }
      if (box.top < frame.top + BUBBLE_MARGIN) {
        dy = box.top - (frame.top + BUBBLE_MARGIN);
      } else if (box.bottom > frame.bottom - BUBBLE_MARGIN) {
        dy = box.bottom - (frame.bottom - BUBBLE_MARGIN);
      }
      if (dx || dy) map.panBy([dx, dy]);
    });
  };

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
        <MapReady
          onReady={(m) => {
            setMap(m);
            setZoom(m.getZoom());
          }}
        />
        <ZoomWatcher
          onZoom={setZoom}
          onZoomStart={() => {
            setOpenCluster(null);
            setActiveId(null);
          }}
        />
        <MapTap
          onTap={() => {
            setActiveId(null);
            setOpenCluster(null);
          }}
        />

        <Marker
          position={[INFFLUX_COORDS.lat, INFFLUX_COORDS.lng]}
          icon={inffluxIcon}
        />

        {clusters.map((cluster) => {
          if (cluster.items.length > 1) {
            const listed = openCluster === cluster.id;
            return (
              <Marker
                key={cluster.id}
                position={[cluster.lat, cluster.lng]}
                icon={clusterIcon(cluster.items.length)}
                eventHandlers={{
                  click: () => setOpenCluster(listed ? null : cluster.id),
                }}
              >
                {/* Survolée, la bulle annonce le groupe ; ouverte, elle donne
                    la main sur chaque fiche. La clé force le remontage :
                    Leaflet ne change pas `permanent` à chaud. */}
                <Tooltip
                  key={listed ? "listed" : "hover"}
                  direction="top"
                  offset={[0, -20]}
                  opacity={1}
                  permanent={listed}
                  interactive={listed}
                >
                  <div className="min-w-[160px]">
                    <div className="font-display text-sm font-bold text-card-foreground">
                      {cluster.items.length} restaurants ici
                    </div>

                    {listed ? (
                      // Une dizaine de restaurants au même endroit tiendrait
                      // plus haut que la carte : la liste défile.
                      <ul
                        ref={openedBubble}
                        className="mb-0 mt-1 max-h-48 list-none space-y-0.5 overflow-y-auto p-0"
                      >
                        {cluster.items.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => navigate(`/restaurant/${r.slug}`)}
                              className="w-full cursor-pointer rounded px-1.5 py-1 text-left text-xs font-medium text-primary transition hover:bg-primary/10"
                            >
                              {r.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <>
                        {/* Quelques noms suffisent à savoir si le groupe
                            intéresse ; au-delà, la bulle couvrirait la carte. */}
                        <div className="mt-0.5 text-xs text-foreground/70">
                          {cluster.items
                            .slice(0, 4)
                            .map((r) => r.name)
                            .join(", ")}
                          {cluster.items.length > 4 &&
                            ` et ${cluster.items.length - 4} autre${
                              cluster.items.length > 5 ? "s" : ""
                            }`}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-primary">
                          {isTouch
                            ? "Toucher pour les voir"
                            : "Cliquer pour les voir"}
                        </div>
                      </>
                    )}
                  </div>
                </Tooltip>
              </Marker>
            );
          }

          const r = cluster.items[0];
          const open = () => navigate(`/restaurant/${r.slug}`);
          const active = isTouch && activeId === r.id;
          return (
            <Marker
              key={r.id}
              position={[r.lat as number, r.lng as number]}
              icon={pinIcon("#f79220")}
              eventHandlers={{
                click: () => {
                  if (isTouch && !active) setActiveId(r.id);
                  else open();
                },
              }}
            >
              {/* Desktop : infos au survol, clic = fiche. Mobile : 1er tap =
                  bulle épinglée (tap dessus ou sur le pin = fiche). La clé
                  force le remontage : Leaflet ne change pas `permanent` à chaud. */}
              <Tooltip
                key={active ? "pinned" : "hover"}
                direction="top"
                offset={[0, -18]}
                opacity={1}
                permanent={active}
                interactive={active}
                eventHandlers={active ? { click: open } : undefined}
              >
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
                    {isTouch ? "Toucher pour voir la fiche" : "Cliquer pour voir la fiche"}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      <MapZoomControl map={map} />
      <OsmAttribution />

      {missing > 0 && (
        <span className="absolute bottom-3 right-3 z-[500] inline-flex h-7 items-center rounded-full bg-card px-3 text-xs font-medium text-foreground/60 shadow">
          {missing} sans localisation
        </span>
      )}
    </div>
  );
};

export default RestaurantsMap;
