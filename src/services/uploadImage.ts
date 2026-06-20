import supabaseClient from "./supabaseClient";
import { compressImage, CompressOptions } from "../utils/imageCompress";
import { PHOTOS_BUCKET } from "../hooks/useRestaurantPhotos";

/**
 * Compresse une image puis l'upload dans le bucket Storage, et renvoie son URL
 * publique + son chemin. Mutualise la logique compress → upload → getPublicUrl
 * (galerie ET image de couverture des restaurants).
 */
export async function uploadImageToBucket(
  file: File,
  folder: string,
  compress?: CompressOptions
): Promise<{ url: string; path: string }> {
  const { blob, ext } = await compressImage(file, compress);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseClient.storage
    .from(PHOTOS_BUCKET)
    .upload(path, blob, { contentType: `image/${ext}`, upsert: false });
  if (error) throw new Error(error.message);

  const url = supabaseClient.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data
    .publicUrl;
  return { url, path };
}

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

/** Supprime un fichier du bucket (best effort). */
export async function removeFromBucket(path: string): Promise<void> {
  await supabaseClient.storage.from(PHOTOS_BUCKET).remove([path]);
}
