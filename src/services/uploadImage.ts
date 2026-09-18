import supabaseClient from "./supabaseClient";
import { compressImage, CompressOptions } from "../utils/imageCompress";
import { FEEDBACK_BUCKET, PHOTOS_BUCKET } from "./storagePaths";

/**
 * Compresse une image puis l'upload dans le bucket Storage, et renvoie son URL
 * publique + son chemin. `pathBase` = chemin SANS extension (l'extension est
 * ajoutée selon le format compressé). Mutualise compress → upload → getPublicUrl
 * (galerie ET image de couverture des restaurants).
 */
export async function uploadImageToBucket(
  file: File,
  pathBase: string,
  compress?: CompressOptions,
  bucket: string = PHOTOS_BUCKET
): Promise<{ url: string; path: string }> {
  const { blob, ext } = await compressImage(file, compress);
  const path = `${pathBase}.${ext}`;

  const { error } = await supabaseClient.storage
    .from(bucket)
    .upload(path, blob, { contentType: `image/${ext}`, upsert: false });
  if (error) throw new Error(error.message);

  return { url: publicUrlOf(bucket, path), path };
}

/** URL publique d'un fichier d'un bucket public. */
export const publicUrlOf = (bucket: string, path: string) =>
  supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;

/** URL publique d'une image jointe à une demande. */
export const feedbackImageUrl = (path: string) =>
  publicUrlOf(FEEDBACK_BUCKET, path);

/**
 * Extrait le chemin interne au bucket depuis une URL publique Supabase, ou null
 * si l'URL ne pointe pas vers notre bucket (ex. ancien lien externe).
 */
export function bucketPathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${PHOTOS_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

/** Supprime un ou plusieurs fichiers du bucket (best effort). */
export async function removeFromBucket(
  paths: string | string[],
  bucket: string = PHOTOS_BUCKET
): Promise<void> {
  const list = Array.isArray(paths) ? paths : [paths];
  if (list.length) await supabaseClient.storage.from(bucket).remove(list);
}
