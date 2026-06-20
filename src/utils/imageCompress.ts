/**
 * Compression/redimensionnement d'image côté client AVANT upload.
 * But : ne jamais envoyer un original de plusieurs Mo dans le bucket. On borne
 * la plus grande dimension et on réencode en WebP (bon rapport qualité/poids).
 * Économise le stockage et l'egress Supabase tout en gardant une bonne qualité.
 */

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  ext: string;
}

export interface CompressOptions {
  /** Plus grande dimension autorisée (px). Au-delà, l'image est réduite. */
  maxSize?: number;
  /** Qualité WebP 0..1. */
  quality?: number;
}

/** Charge un File en HTMLImageElement (via object URL, révoqué après). */
const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    img.src = url;
  });

export const compressImage = async (
  file: File,
  { maxSize = 1600, quality = 0.82 }: CompressOptions = {}
): Promise<CompressedImage> => {
  const img = await loadImage(file);

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );
  if (!blob) throw new Error("Échec de la compression");

  return { blob, width, height, ext: "webp" };
};
