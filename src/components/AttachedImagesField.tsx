import { useEffect, useRef } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { toast } from "@/lib/toast";
import { FEEDBACK_IMAGES_MAX } from "@/services/textLimits";
import { Attached, revokeAttached } from "@/services/attachedImages";

interface Props {
  value: Attached[];
  onChange: (next: Attached[]) => void;
  /** Aucun ajout possible (catégorie pas encore choisie, envoi en cours). */
  disabled?: boolean;
  /** Le collage (Ctrl+V) n'écoute que popup ouverte. */
  active?: boolean;
}

/**
 * Images jointes à une demande ou à une note de backlog : vignettes carrées et
 * une case « + » tant qu'il reste de la place (3 au plus). Glisser-déposer sur
 * la rangée, coller (Ctrl+V) n'importe où dans la popup, ou parcourir.
 */
const AttachedImagesField = ({
  value,
  onChange,
  disabled = false,
  active = true,
}: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  // Les gestionnaires lisent la dernière liste via une ref : le collage est
  // branché une fois par ouverture.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const addFiles = (files: File[]) => {
    const picked = files.filter((f) => f.type.startsWith("image/"));
    if (!picked.length) return;
    const prev = valueRef.current;
    const room = FEEDBACK_IMAGES_MAX - prev.length;
    if (picked.length > room) {
      toast({
        title: `${FEEDBACK_IMAGES_MAX} images au plus`,
        description: "Les images en trop ont été écartées.",
        status: "warning",
        duration: 4000,
      });
    }
    onChangeRef.current([
      ...prev,
      ...picked.slice(0, Math.max(0, room)).map((file) => ({
        kind: "file" as const,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeAt = (i: number) => {
    revokeAttached([value[i]]);
    onChange(value.filter((_, idx) => idx !== i));
  };

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  useEffect(() => {
    if (!active) return;
    const onPaste = (e: ClipboardEvent) => {
      if (disabledRef.current) return;
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
  }, [active]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!disabled) addFiles(Array.from(e.dataTransfer.files));
      }}
      className="flex flex-wrap items-center gap-2"
    >
      {value.map((a, i) => (
        <div
          key={a.url}
          className="group relative h-16 w-16 overflow-hidden rounded-lg bg-muted ring-1 ring-border"
        >
          <img src={a.url} alt="" className="h-full w-full object-cover" />
          {/* Toujours visible au doigt (pas de survol sur mobile). */}
          <button
            type="button"
            onClick={() => removeAt(i)}
            disabled={disabled}
            aria-label="Retirer l'image"
            className="absolute right-0.5 top-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            <FiX className="h-3 w-3" />
          </button>
        </div>
      ))}
      {value.length < FEEDBACK_IMAGES_MAX && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          aria-label="Joindre une image"
          className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-border text-foreground/45 transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground/45"
        >
          <FiPlus className="h-5 w-5" />
          <span className="text-[10px] font-medium tabular-nums">
            {value.length}/{FEEDBACK_IMAGES_MAX}
          </span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default AttachedImagesField;
