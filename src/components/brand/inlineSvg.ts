/**
 * SVG embarqué dans le JS (import `?raw`) puis servi en data-URI : aucune
 * requête réseau, l'animation est disponible dès que la page s'exécute —
 * même en connexion lente, où une image à télécharger arriverait après le
 * contenu qu'elle est censée faire patienter.
 */
export const svgDataUri = (raw: string) =>
  `data:image/svg+xml,${encodeURIComponent(raw)}`;
