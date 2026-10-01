import type L from "leaflet";

/**
 * Regroupement des pins trop proches pour être distingués, en fonction du zoom.
 *
 * Le calcul se fait en PIXELS et non en degrés : c'est le chevauchement à
 * l'écran qui gêne, et un même écart en degrés ne vaut pas la même chose selon
 * le zoom ni selon la latitude. `map.project` donne des coordonnées monde en
 * pixels pour un zoom donné, indépendantes du cadrage — le regroupement ne
 * change donc pas quand on se contente de déplacer la carte.
 */

/** Deux pins plus proches que cela (en pixels) fusionnent. Un pin fait 20 px
 *  de large et sa bulle déborde : en dessous, ils se chevauchent. */
const CLUSTER_RADIUS = 56;

export interface ClusterOf<T> {
  /** Stable tant que le groupe contient les mêmes éléments : sert de clé React. */
  id: string;
  lat: number;
  lng: number;
  items: T[];
}

interface Located {
  id: number;
  lat: number | null;
  lng: number | null;
}

/**
 * Regroupe par proximité, du premier au dernier : on prend un point non classé,
 * on lui agrège tous ceux qui sont à portée, et on recommence.
 *
 * Préféré à un découpage en damier, plus rapide mais qui sépare deux voisins
 * immédiats dès qu'une frontière de case passe entre eux — le défaut se voit
 * précisément là où le regroupement était attendu. Le coût quadratique est sans
 * objet ici : une centaine de restaurants au plus.
 */
export const clusterize = <T extends Located>(
  map: L.Map,
  zoom: number,
  items: T[]
): ClusterOf<T>[] => {
  const points = items
    .filter((item) => item.lat != null && item.lng != null)
    .map((item) => ({
      item,
      point: map.project([item.lat as number, item.lng as number], zoom),
    }));

  const taken = new Set<number>();
  const clusters: ClusterOf<T>[] = [];

  for (let i = 0; i < points.length; i += 1) {
    if (taken.has(i)) continue;
    taken.add(i);
    const group = [points[i]];

    for (let j = i + 1; j < points.length; j += 1) {
      if (taken.has(j)) continue;
      if (points[i].point.distanceTo(points[j].point) <= CLUSTER_RADIUS) {
        taken.add(j);
        group.push(points[j]);
      }
    }

    // Centre calculé en pixels puis reprojeté : la moyenne des latitudes
    // décalerait le groupe vers le haut (projection Mercator).
    const center = map.unproject(
      [
        group.reduce((sum, g) => sum + g.point.x, 0) / group.length,
        group.reduce((sum, g) => sum + g.point.y, 0) / group.length,
      ],
      zoom
    );

    clusters.push({
      id: group
        .map((g) => g.item.id)
        .sort((a, b) => a - b)
        .join("-"),
      lat: center.lat,
      lng: center.lng,
      items: group.map((g) => g.item),
    });
  }

  return clusters;
};

