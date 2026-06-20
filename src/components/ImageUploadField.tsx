import { useEffect, useRef } from "react";
import { FiUploadCloud, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface Props {
  /** Source à prévisualiser (URL existante ou object URL d'un fichier choisi). */
  previewUrl: string | null;
  /** Appelé avec le fichier choisi (drop, coller, parcourir). */
  onPick: (file: File) => void;
  /** Retire l'image courante. */
  onClear: () => void;
  disabled?: boolean;
}

/**
 * Champ d'image unique : prévisualisation + actions (changer / supprimer), ou
 * zone de dépôt acceptant le glisser-déposer, le coller (Ctrl+V) et le parcours
 * de fichiers. Ne gère PAS l'upload (le parent décide quand uploader).
 */
const ImageUploadField = ({ previewUrl, onPick, onClear, disabled }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFirstImage = (files: FileList | File[] | null | undefined) => {
    const img = Array.from(files ?? []).find((f) => f.type.startsWith("image/"));
    if (img) onPick(img);
  };

  // Coller une image depuis le presse-papiers (actif tant que le champ est monté).
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((it) => it.kind === "file")
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f && f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        onPick(files[0]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [disabled, onPick]);

  const open = () => inputRef.current?.click();

  return (
    <div>
      {previewUrl ? (
        <div className="group relative h-44 w-full overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={open}
              disabled={disabled}
              aria-label="Changer l'image"
              title="Changer"
              className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75 disabled:opacity-50"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              aria-label="Supprimer l'image"
              title="Supprimer"
              className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-destructive disabled:opacity-50"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") open();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!disabled) pickFirstImage(e.dataTransfer.files);
          }}
          className={cn(
            "flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 text-center transition hover:border-primary/50 hover:bg-muted/50",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <FiUploadCloud className="h-7 w-7 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Glisse une image, colle-la (Ctrl+V) ou clique pour parcourir
          </p>
          <p className="text-xs text-foreground/50">
            JPEG, PNG, WebP — compressée automatiquement à l'envoi
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pickFirstImage(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ImageUploadField;
