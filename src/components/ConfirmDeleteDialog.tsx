import { ReactNode, useEffect, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const CONFIRM_WORD = "supprimer";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Action exécutée une fois le mot saisi ; la modale se ferme ensuite. */
  onConfirm: () => void | Promise<void>;
  title?: string;
  /** Description de ce qui va être perdu (irréversible). */
  description?: ReactNode;
}

/**
 * Modale de confirmation forte pour les suppressions à risque (utilisateur,
 * restaurant…) : l'utilisateur doit taper « supprimer » pour valider.
 */
const ConfirmDeleteDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Confirmer la suppression",
  description,
}: Props) => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  const ok = value.trim().toLowerCase() === CONFIRM_WORD;

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? () => {} : onClose}
    >
      <DialogTitle>{title}</DialogTitle>
      {description && (
        <p className="mt-2 text-sm text-foreground/70">{description}</p>
      )}
      <p className="mt-3 text-sm text-foreground/70">
        Cette action est irréversible. Tape{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-destructive">
          {CONFIRM_WORD}
        </code>{" "}
        pour confirmer.
      </p>
      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={CONFIRM_WORD}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" variant="destructive" disabled={!ok} loading={busy}>
            Supprimer
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default ConfirmDeleteDialog;
