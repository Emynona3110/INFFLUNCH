/**
 * Attribution OpenStreetMap, obligatoire sur toute carte affichant des tuiles
 * OSM (licence ODbL — https://osmfoundation.org/wiki/Licence/Attribution_Guidelines).
 * On remplace le contrôle natif de Leaflet (`attributionControl={false}`) par
 * cette pastille accordée au thème, en bas à gauche (le bas droit est réservé
 * aux boutons distance / itinéraire).
 */
export default function OsmAttribution() {
  return (
    <a
      href="https://www.openstreetmap.org/copyright"
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-1 left-1 z-[500] rounded bg-card/80 px-1.5 py-0.5 text-[10px] leading-tight text-foreground/70 hover:text-foreground hover:underline"
    >
      © OpenStreetMap contributors
    </a>
  );
}
