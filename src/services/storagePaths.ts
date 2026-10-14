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

/**
 * Miniature d'une couverture (chemin ou URL) : `cover-X.webp|jpg|png` →
 * `cover-X-thumb.webp`, rangée à côté. Affichée dans les cartes et listes à la
 * place de la couverture pleine taille (~250 Ko contre ~30 Ko). null si ce
 * n'est pas une couverture du bucket (lien externe, image locale).
 * ⚠️ Même règle dans scripts/backfill-cover-thumbs.mjs et
 * scripts/migrate-bucket-structure.mjs (--clean).
 */
export const coverThumbOf = (pathOrUrl: string): string | null => {
  const thumb = pathOrUrl.replace(/(\/cover-[^/?.]+)\.(webp|jpe?g|png)$/i, "$1-thumb.webp");
  return thumb === pathOrUrl ? null : thumb;
};

/** Plus grand côté de la miniature de couverture (px). 640 en qualité 0,7 :
 *  ~45 % plus léger que 800/0,8, pour une netteté encore correcte sur carte. */
export const COVER_THUMB_MAX = 640;
export const COVER_THUMB_QUALITY = 0.7;

/** Chemin (sans extension) d'une photo de galerie d'un resto. */
export const galleryPathBase = (slug: string) =>
  `${slug}/${storageStamp()}-${shortId()}`;

/** Chemin (sans extension) d'un fichier de menu d'un resto (pdf/image). */
export const menuPathBase = (slug: string) =>
  `${slug}/menu/${storageStamp()}-${shortId()}`;

/** Bucket des images jointes aux demandes (un dossier par auteur). */
export const FEEDBACK_BUCKET = "feedback-images";

/** Chemin (sans extension) d'une image jointe à une demande. */
export const feedbackImagePathBase = (userId: string) =>
  `${userId}/${storageStamp()}-${shortId()}`;
