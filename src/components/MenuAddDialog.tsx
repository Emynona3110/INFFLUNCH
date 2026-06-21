import { useEffect, useRef, useState } from "react";
import { FiUploadCloud, FiX, FiLink, FiFileText, FiImage } from "react-icons/fi";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useUsers from "@/hooks/useUsers";
import { formatAuthorName } from "@/utils/authorName";
import {
  checkImageResolution,
  MIN_IMAGE_LONG_EDGE,
} from "@/utils/imageCompress";
import { MenuKind } from "@/hooks/useRestaurantMenus";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onSubmit: (args: {
    kind: MenuKind;
    file?: File;
    url?: string;
    title?: string;
    authorId?: string;
  }) => Promise<void>;
}

const KINDS: { value: MenuKind; label: string; icon: typeof FiLink }[] = [
  { value: "link", label: "Lien", icon: FiLink },
  { value: "pdf", label: "PDF", icon: FiFileText },
  { value: "image", label: "Image", icon: FiImage },
];

/**
 * Ajout d'un menu de restaurant (collaboratif). Trois formats au choix : lien
 * web, PDF, ou image. Pour un admin, un sélecteur permet d'attribuer l'entrée à
 * un autre collaborateur.
 */
const MenuAddDialog = ({ isOpen, onClose, isAdmin, onSubmit }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<MenuKind>("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null); // object URL (image)
  const [dragging, setDragging] = useState(false);
  const [authorId, setAuthorId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: users = [] } = useUsers(isAdmin && isOpen);

  const clearFile = () => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFile(null);
  };

  const reset = () => {
    setKind("link");
    setUrl("");
    setTitle("");
    clearFile();
    setAuthorId("");
    setDragging(false);
  };

  // Réinitialise à l'ouverture/fermeture + nettoyage de l'object URL au démontage.
  useEffect(() => {
    if (!isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const previewRef = useRef<string | null>(null);
  previewRef.current = preview;
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const acceptAttr = kind === "pdf" ? "application/pdf" : "image/*";

  const pickFile = async (f?: File) => {
    if (!f) return;
    if (kind === "pdf") {
      if (f.type !== "application/pdf") {
        toast({ title: "Le fichier doit être un PDF", status: "error", duration: 4000 });
        return;
      }
      clearFile();
      setFile(f);
      return;
    }
    // image : contrôle de résolution comme la galerie.
    if (!f.type.startsWith("image/")) {
      toast({ title: "Le fichier doit être une image", status: "error", duration: 4000 });
      return;
    }
    const { level, longEdge } = await checkImageResolution(f).catch(() => ({
      level: "ok" as const,
      longEdge: 0,
    }));
    if (level === "block") {
      toast({
        title: "Image trop petite",
        description: `Minimum ${MIN_IMAGE_LONG_EDGE}px sur le grand côté (ici ${longEdge}px).`,
        status: "error",
        duration: 5000,
      });
      return;
    }
    if (level === "warn") {
      toast({
        title: "Qualité limitée",
        description: `Image un peu petite (${longEdge}px), elle peut manquer de netteté.`,
        status: "warning",
        duration: 4000,
      });
    }
    clearFile();
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // Coller (Ctrl+V) un fichier (image ou PDF selon le mode).
  useEffect(() => {
    if (!isOpen || kind === "link") return;
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.items ?? [])
        .filter((it) => it.kind === "file")
        .map((it) => it.getAsFile())
        .find((x): x is File => !!x);
      if (f) {
        e.preventDefault();
        pickFile(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, kind]);

  // Changement de format : on repart propre (un PDF déjà choisi n'a pas de sens
  // en mode image, etc.).
  const switchKind = (k: MenuKind) => {
    if (k === kind) return;
    setKind(k);
    setUrl("");
    clearFile();
  };

  const canSubmit =
    kind === "link" ? url.trim().length > 0 : !!file;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit({
        kind,
        file: file ?? undefined,
        url: kind === "link" ? url : undefined,
        title: title.trim() || undefined,
        authorId: authorId || undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      <DialogTitle>Ajouter un menu</DialogTitle>

      <div className="mt-5 space-y-4">
        {/* Choix du format */}
        <div className="flex gap-2">
          {KINDS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => switchKind(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                kind === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground/60 hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Saisie selon le format */}
        {kind === "link" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              Adresse du menu
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </label>
        ) : file ? (
          // Fichier choisi : aperçu (image) ou nom (pdf).
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            {preview ? (
              <img
                src={preview}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-border"
              />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-background ring-1 ring-border">
                <FiFileText className="h-7 w-7 text-primary" />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {file.name}
            </span>
            <button
              type="button"
              onClick={clearFile}
              aria-label="Retirer le fichier"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-foreground/60 transition hover:bg-muted hover:text-foreground"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // Zone de dépôt
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
              pickFile(e.dataTransfer.files?.[0]);
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
              {kind === "pdf"
                ? "Glisse un PDF, colle-le (Ctrl+V) ou clique pour parcourir"
                : "Glisse une image, colle-la (Ctrl+V) ou clique pour parcourir"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={acceptAttr}
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* Titre optionnel */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            Titre <span className="text-foreground/45">(optionnel)</span>
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. Carte du midi, Menu des vins…"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </label>

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
          </label>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button onClick={handleConfirm} loading={busy} disabled={!canSubmit}>
          {busy ? "Envoi…" : "Ajouter"}
        </Button>
      </div>
    </Dialog>
  );
};

export default MenuAddDialog;
