import { useEffect, useRef, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiTrash2 } from "react-icons/fi";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import { NOTE_CATEGORIES, NoteCategory } from "@/services/noteCategories";
import { AdminNote } from "@/hooks/useAdminNotes";
import { cn } from "@/lib/utils";
import { MAX_TEXT } from "@/services/textLimits";
import useSession from "@/hooks/useSession";
import { toast } from "@/lib/toast";
import AttachedImagesField from "@/components/AttachedImagesField";
import {
  Attached,
  discardUploaded,
  fromStored,
  revokeAttached,
  sameAsStored,
  uploadAttached,
} from "@/services/attachedImages";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Note à modifier ; absente = création. */
  note?: AdminNote | null;
  onSubmit: (values: {
    description: string;
    category: NoteCategory;
    images: string[];
  }) => Promise<void>;
  /** Suppression (édition seulement) : appui long dans la popup. */
  onDelete?: () => Promise<void> | void;
}

/**
 * Saisie d'une note de backlog : un descriptif libre, une catégorie et jusqu'à
 * trois captures. Sert aussi bien à créer qu'à modifier — le contenu d'une
 * note tient en un champ, inutile d'avoir deux écrans.
 *
 * Les images sont envoyées dans le bucket AVANT d'appeler `onSubmit` (qui
 * écrit la note) ; si cette écriture échoue, on efface ce qu'on vient
 * d'envoyer.
 */
const AdminNoteDialog = ({
  isOpen,
  onClose,
  note,
  onSubmit,
  onDelete,
}: Props) => {
  const [description, setDescription] = useState("");
  // Pas de catégorie par défaut à la création : on la choisit, sinon tout
  // finirait en « Amélioration » sans y penser.
  const [category, setCategory] = useState<NoteCategory | null>(null);
  const [images, setImages] = useState<Attached[]>([]);
  const [busy, setBusy] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;

  const imagesRef = useRef<Attached[]>([]);
  imagesRef.current = images;
  useEffect(() => () => revokeAttached(imagesRef.current), []);

  // Repart du contenu de la note à chaque ouverture (ou d'un formulaire vierge).
  useEffect(() => {
    if (!isOpen) return;
    setDescription(note?.description ?? "");
    setCategory(note?.category ?? null);
    setImages((prev) => {
      revokeAttached(prev);
      return fromStored(note?.images);
    });
  }, [isOpen, note]);

  const unchanged =
    !!note &&
    category === note.category &&
    description.trim() === note.description &&
    sameAsStored(images, note.images);

  const submit = async () => {
    const text = description.trim();
    if (!category || !text) return;
    if (unchanged) {
      onClose();
      return;
    }
    setBusy(true);
    let uploaded: string[] = [];
    try {
      if (!userId) throw new Error("Session expirée");
      const sent = await uploadAttached(images, userId);
      uploaded = sent.uploaded;
      await onSubmit({ description: text, category, images: sent.paths });
      onClose();
    } catch (e) {
      await discardUploaded(uploaded);
      toast({
        title: "Enregistrement impossible",
        description: (e as Error)?.message ?? "Réessaie.",
        status: "error",
        duration: 5000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      <DialogTitle>{note ? "Modifier la note" : "Nouvelle note"}</DialogTitle>

      <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Catégorie</span>
          <div className="flex flex-wrap gap-2">
            {NOTE_CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setCategory(c.value);
                    descriptionRef.current?.focus();
                  }}
                  aria-label={c.hint}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/70 hover:bg-muted"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Descriptif</span>
          <textarea
            ref={descriptionRef}
            value={description}
            maxLength={MAX_TEXT}
            disabled={!category}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_TEXT))}
            placeholder={
              category
                ? "Ce que tu as repéré, en une ou deux phrases…"
                : "Choisir une catégorie"
            }
            onKeyDown={(e) => {
              // Ctrl/⌘+Entrée valide : la note se saisit souvent à la volée.
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
              }
            }}
            className="w-full h-[max(10rem,45dvh)] resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-muted/40"
          />
          <span className="text-right text-xs text-foreground/45">
            {description.length}/{MAX_TEXT}
          </span>
        </label>

        <AttachedImagesField
          value={images}
          onChange={setImages}
          disabled={!category || busy}
          active={isOpen}
        />
      </div>

      <div className="mt-4 sm:mt-6 flex items-center justify-between gap-2">
        <div>
          {note && onDelete && (
            <HoldToDeleteButton
              onConfirm={async () => {
                await onDelete();
                onClose();
              }}
              mobileConfirm={false}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-destructive px-3 text-sm font-medium text-white hover:bg-destructive/90 sm:px-4"
            >
              <FiTrash2 className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Supprimer</span>
            </HoldToDeleteButton>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            loading={busy}
            disabled={!category || !description.trim() || unchanged}
          >
            {note ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default AdminNoteDialog;
