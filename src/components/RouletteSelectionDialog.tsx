import { FiCheck } from "react-icons/fi";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Restaurant } from "@/hooks/useRestaurants";
import noImage from "@/assets/no-image.jpg";
import { cn } from "@/lib/utils";

interface RouletteSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Restos filtrés (respecte filtres + favoris). */
  pool: Restaurant[];
  /** Ids exclus de la roue (décochés). Modèle par exclusion : par défaut vide = tout coché. */
  excludedIds: Set<number>;
  onExcludedChange: (next: Set<number>) => void;
  /** Valide la sélection et relance la roue. */
  onConfirm: () => void;
}

const RouletteSelectionDialog = ({
  open,
  onClose,
  pool,
  excludedIds,
  onExcludedChange,
  onConfirm,
}: RouletteSelectionDialogProps) => {
  const selectedCount = pool.filter((r) => !excludedIds.has(r.id)).length;

  const toggleId = (id: number) => {
    const next = new Set(excludedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onExcludedChange(next);
  };
  const selectAll = () => onExcludedChange(new Set());
  const deselectAll = () => onExcludedChange(new Set(pool.map((r) => r.id)));

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg overflow-hidden">
      <DialogTitle>Restaurants de la roue</DialogTitle>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-foreground/60">
            {selectedCount}/{pool.length} sélectionné{selectedCount > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAll}
              className="cursor-pointer font-medium text-primary hover:underline"
            >
              Tout cocher
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="cursor-pointer font-medium text-primary hover:underline"
            >
              Tout décocher
            </button>
          </div>
        </div>

        <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-card border border-border">
          {pool.map((r) => {
            const checked = !excludedIds.has(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleId(r.id)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted"
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded border transition",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent"
                  )}
                >
                  <FiCheck className="h-3.5 w-3.5" />
                </span>
                <img
                  src={r.image || noImage}
                  alt=""
                  className="h-9 w-12 shrink-0 rounded object-cover"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-card-foreground">
                  {r.name}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          className="mt-4 w-full"
          disabled={selectedCount === 0}
          onClick={onConfirm}
        >
          Lancer la roue
          {selectedCount > 0 ? ` (${selectedCount})` : ""}
        </Button>
      </div>
    </Dialog>
  );
};

export default RouletteSelectionDialog;
