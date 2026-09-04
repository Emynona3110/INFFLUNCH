import { useEffect, useRef, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NOTE_CATEGORIES, NoteCategory } from "@/services/noteCategories";
import { AdminNote } from "@/hooks/useAdminNotes";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Note à modifier ; absente = création. */
  note?: AdminNote | null;
  onSubmit: (values: {
    description: string;
    category: NoteCategory;
  }) => Promise<void>;
}

/**
 * Saisie d'une note de backlog : un descriptif libre et une catégorie. Sert
 * aussi bien à créer qu'à modifier — le contenu d'une note tient en un champ,
 * inutile d'avoir deux écrans.
 */
const AdminNoteDialog = ({ isOpen, onClose, note, onSubmit }: Props) => {
  const [description, setDescription] = useState("");
  // Pas de catégorie par défaut à la création : on la choisit, sinon tout
  // finirait en « Amélioration » sans y penser.
  const [category, setCategory] = useState<NoteCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Repart du contenu de la note à chaque ouverture (ou d'un formulaire vierge).
  useEffect(() => {
    if (!isOpen) return;
    setDescription(note?.description ?? "");
    setCategory(note?.category ?? null);
  }, [isOpen, note]);

  const submit = async () => {
    const text = description.trim();
    if (!category || !text) return;
    setBusy(true);
    try {
      await onSubmit({ description: text, category });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      <DialogTitle>{note ? "Modifier la note" : "Nouvelle note"}</DialogTitle>

      <div className="mt-5 space-y-4">
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
                  title={c.hint}
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
            rows={5}
            value={description}
            disabled={!category}
            onChange={(e) => setDescription(e.target.value)}
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
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-muted/40"
          />
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button
          onClick={submit}
          loading={busy}
          disabled={!category || !description.trim()}
        >
          {note ? "Enregistrer" : "Ajouter"}
        </Button>
      </div>
    </Dialog>
  );
};

export default AdminNoteDialog;
