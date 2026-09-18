import {
  feedbackImageUrl,
  removeFromBucket,
  uploadImageToBucket,
} from "./uploadImage";
import { FEEDBACK_BUCKET, feedbackImagePathBase } from "./storagePaths";

/**
 * Image jointe, telle qu'un formulaire la tient : déjà en ligne (chemin du
 * bucket, contenu en cours de correction) ou tout juste choisie (fichier, pas
 * encore envoyé). Une seule liste pour les deux : l'ordre affiché est l'ordre
 * enregistré.
 */
export type Attached =
  | { kind: "stored"; path: string; url: string }
  | { kind: "file"; file: File; url: string };

/** Captures d'écran surtout : pas de contrôle de résolution, on réduit juste
 *  ce qui dépasse et on réencode en WebP. */
const IMAGE_COMPRESS = { maxSize: 1600, quality: 0.85 };

/** Liste de départ d'un formulaire, depuis les chemins enregistrés. */
export const fromStored = (paths: string[] = []): Attached[] =>
  paths.map((path) => ({ kind: "stored", path, url: feedbackImageUrl(path) }));

/** Les prévisualisations des fichiers choisis sont des object URLs : à
 *  révoquer quand on les retire, et au démontage. */
export const revokeAttached = (list: Attached[]) =>
  list.forEach((a) => a.kind === "file" && URL.revokeObjectURL(a.url));

/** Vrai si la liste est exactement celle enregistrée (rien à écrire). */
export const sameAsStored = (list: Attached[], paths: string[]) =>
  list.length === paths.length &&
  list.every((a, i) => a.kind === "stored" && a.path === paths[i]);

/**
 * Envoie les nouveaux fichiers dans le bucket (dossier de `userId`) et renvoie
 * les chemins dans l'ordre de la liste, ainsi que ceux qui viennent d'être
 * créés — à effacer si l'écriture en base échoue ensuite, pour ne pas laisser
 * d'orphelins derrière.
 */
export const uploadAttached = async (list: Attached[], userId: string) => {
  const paths: string[] = [];
  const uploaded: string[] = [];
  for (const a of list) {
    if (a.kind === "stored") {
      paths.push(a.path);
      continue;
    }
    const { path } = await uploadImageToBucket(
      a.file,
      feedbackImagePathBase(userId),
      IMAGE_COMPRESS,
      FEEDBACK_BUCKET
    );
    uploaded.push(path);
    paths.push(path);
  }
  return { paths, uploaded };
};

/** Nettoyage best effort après un échec d'écriture. */
export const discardUploaded = (paths: string[]) =>
  removeFromBucket(paths, FEEDBACK_BUCKET).catch(() => {});
