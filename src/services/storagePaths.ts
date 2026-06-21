/**
 * Conventions de nommage du bucket Storage des photos de restaurants.
 * Un dossier par restaurant, nommé par son **slug** (unique), contenant toutes
 * ses images (couverture + galerie), à plat :
 *  - couverture : `{slug}/cover-{horodatage}.webp`
 *  - galerie    : `{slug}/{horodatage}-{court}.webp`
 * Noms horodatés (triables, lisibles) plutôt que des UUID nus.
 */

export const PHOTOS_BUCKET = "restaurant-photos";

/** Horodatage lisible et triable : AAAAMMJJ-HHmmss. */
export const storageStamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
};

/** Court suffixe aléatoire (anti-collision quand plusieurs uploads/seconde). */
const shortId = () => Math.random().toString(36).slice(2, 6);

/** Chemin (sans extension) de l'image de couverture d'un resto. */
export const coverPathBase = (slug: string) => `${slug}/cover-${storageStamp()}`;

/** Chemin (sans extension) d'une photo de galerie d'un resto. */
export const galleryPathBase = (slug: string) =>
  `${slug}/${storageStamp()}-${shortId()}`;

/** Chemin (sans extension) d'un fichier de menu d'un resto (pdf/image). */
export const menuPathBase = (slug: string) =>
  `${slug}/menu/${storageStamp()}-${shortId()}`;
