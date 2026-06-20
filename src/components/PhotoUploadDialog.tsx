import { useEffect, useRef, useState } from "react";
import { FiUploadCloud, FiX } from "react-icons/fi";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useUsers from "@/hooks/useUsers";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  /** Upload effectif (compression incluse). authorId = admin attribuant un autre. */
  onSubmit: (files: File[], authorId?: string) => Promise<void>;
}

interface Picked {
  file: File;
  url: string; // object URL pour la prévisualisation
}

/**
 * Saisie d'images conviviale : zone qui accepte le glisser-déposer, le
 * copier-coller (Ctrl+V) ou le parcours de fichiers. Pour un admin, un
 * sélecteur permet d'attribuer la/les photo(s) à un autre collaborateur.
 */
const PhotoUploadDialog = ({ isOpen, onClose, isAdmin, onSubmit }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);
  const [authorId, setAuthorId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: users = [] } = useUsers(isAdmin && isOpen);

  // Non-admin : une seule photo autorisée.
  const multiple = isAdmin;

  const reset = () => {
    setPicked((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setAuthorId("");
    setDragging(false);
  };

  // Réinitialise à l'ouverture/fermeture.
  useEffect(() => {
    if (!isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Nettoyage des object URLs au démontage (ref pour viser la dernière liste
  // sans révoquer à chaque changement une vignette encore affichée).
  const pickedRef = useRef<Picked[]>([]);
  pickedRef.current = picked;
  useEffect(
    () => () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url)),
    []
  );

  const addFiles = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    const mapped = images.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPicked((prev) => (multiple ? [...prev, ...mapped] : mapped.slice(0, 1)));
  };

  const removeAt = (i: number) =>
    setPicked((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });

  // Coller (Ctrl+V) une image depuis le presse-papiers.
  useEffect(() => {
    if (!isOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((it) => it.kind === "file")
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, multiple]);

  const handleConfirm = async () => {
    if (!picked.length) return;
    setBusy(true);
    try {
      await onSubmit(
        picked.map((p) => p.file),
        authorId || undefined
      );
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      <DialogTitle>Ajouter une photo</DialogTitle>

      <div className="mt-5 space-y-4">
        {/* Zone de dépôt */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <FiUploadCloud className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Glisse une image, colle-la (Ctrl+V) ou clique pour parcourir
          </p>
          <p className="text-xs text-foreground/50">
            JPEG, PNG, WebP — compressée automatiquement avant l'envoi
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>

        {/* Prévisualisations */}
        {picked.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {picked.map((p, i) => (
              <div
                key={p.url}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Retirer"
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sélecteur d'auteur (admin) */}
        {isAdmin && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Auteur</span>
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <option value="">Moi (par défaut)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatAuthorName(u.email)} — {u.email}
                </option>
              ))}
            </select>
            <span className="text-xs text-foreground/45">
              Laisse « Moi » pour publier en ton nom, ou choisis un collaborateur.
            </span>
          </label>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button onClick={handleConfirm} disabled={busy || picked.length === 0}>
          {busy
            ? "Envoi…"
            : picked.length > 1
            ? `Envoyer ${picked.length} photos`
            : "Envoyer"}
        </Button>
      </div>
    </Dialog>
  );
};

export default PhotoUploadDialog;
