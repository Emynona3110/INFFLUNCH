import rawIcon from "@/assets/bg-infflux.svg?raw";

/**
 * Pastille sur l'icône d'onglet du navigateur : dès qu'une puce est affichée
 * dans l'app (demandes en attente, nouveautés, succès, déjeuner), le favicon
 * reçoit le même point de couleur. Le SVG source est inliné au build (`?raw`)
 * puis recomposé en data-URI — pas de canvas, pas de requête réseau.
 *
 * En prime, si l'app tourne en PWA installée (écran d'accueil iOS/Android,
 * fenêtre installée desktop), on pose aussi le badge d'application natif.
 */

// Même orange que la puce « demandes » de la navbar.
const BADGE_COLOR = "#f79220";

// `bg-infflux.svg` porte un `height="px"` invalide hérité de son export : on
// retire width/height et on laisse le viewBox (0 0 100 100) dimensionner.
const plain = rawIcon
  .replace(/<\?xml[^>]*\?>/, "")
  .replace(/<svg([^>]*?)\s+width="[^"]*"/, "<svg$1")
  .replace(/<svg([^>]*?)\s+height="[^"]*"/, "<svg$1")
  .trim();

// Anneau blanc + disque coloré en bas à droite, pour détacher la pastille du logo.
const badged = plain.replace(
  /<\/svg>\s*$/,
  `<circle cx="72" cy="72" r="30" fill="#ffffff"/>` +
    `<circle cx="72" cy="72" r="23" fill="${BADGE_COLOR}"/></svg>`
);

const toHref = (svg: string) =>
  `data:image/svg+xml,${encodeURIComponent(svg)}`;

let applied: boolean | null = null;

const setAppBadge = (active: boolean) => {
  // API Badging : absente de lib.dom, et non supportée partout → best effort.
  const nav = navigator as Navigator & {
    setAppBadge?: () => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    const promise = active ? nav.setAppBadge?.() : nav.clearAppBadge?.();
    promise?.catch(() => {
      /* refusé par le navigateur : pas bloquant */
    });
  } catch {
    /* API indisponible : pas bloquant */
  }
};

/** Affiche (ou retire) la pastille sur l'icône d'onglet. Idempotent. */
export const setFaviconBadge = (active: boolean) => {
  if (applied === active) return;
  applied = active;

  // Certains navigateurs ignorent une simple mise à jour du href : on remplace
  // le nœud <link> pour forcer le rafraîchissement.
  document.querySelectorAll("link[rel~='icon']").forEach((l) => l.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = toHref(active ? badged : plain);
  document.head.appendChild(link);

  setAppBadge(active);
};

export default setFaviconBadge;
