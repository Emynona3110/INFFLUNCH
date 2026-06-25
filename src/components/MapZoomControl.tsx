import type L from "leaflet";
import { FiPlus, FiMinus } from "react-icons/fi";
import { cn } from "@/lib/utils";

/**
 * Contrôle zoom +/- partagé (RestaurantMiniMap + LocationPicker) : pastille
 * arrondie en haut à droite de la carte. À utiliser à la place du zoomControl
 * Leaflet par défaut (`zoomControl={false}` sur le MapContainer).
 */
export default function MapZoomControl({
  map,
  className,
}: {
  map: L.Map | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute right-3 top-3 z-[500] flex flex-col overflow-hidden rounded-full bg-card shadow",
        className
      )}
    >
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
  );
}
