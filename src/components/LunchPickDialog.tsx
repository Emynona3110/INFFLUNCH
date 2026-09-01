import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Restaurant } from "@/hooks/useRestaurants";
import { slugify } from "@/utils/slugify";
import noImage from "@/assets/no-image.jpg";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tous les restaurants proposables. */
  restaurants: Restaurant[];
  /** Restaurant déjà choisi pour aujourd'hui (mis en avant), null sinon. */
  currentId: number | null;
  onPick: (restaurantId: number) => void;
}

/** Choix du restaurant où l'on déjeune aujourd'hui (recherche + liste). */
const LunchPickDialog = ({
  open,
  onClose,
  restaurants,
  currentId,
  onPick,
}: Props) => {
  const [search, setSearch] = useState("");

  const results = useMemo(() => {
    // Un restaurant fermé n'est plus proposable pour le midi.
    const open = restaurants.filter((r) => !r.closed);
    const needle = slugify(search);
    if (!needle) return open;
    return open.filter((r) => slugify(r.name).includes(needle));
  }, [restaurants, search]);

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg overflow-hidden">
      <DialogTitle>Où déjeunes-tu aujourd'hui ?</DialogTitle>

      <div className="mt-4">
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un restaurant…"
            className="pl-9"
          />
        </div>

        <div className="mt-3 max-h-80 divide-y divide-border overflow-y-auto rounded-card border border-border">
          {results.length === 0 && (
            <p className="p-6 text-center text-sm text-foreground/60">
              Aucun restaurant ne correspond.
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition hover:bg-muted",
                r.id === currentId && "bg-primary/5"
              )}
            >
              <img
                src={r.image || noImage}
                alt=""
                className="h-9 w-12 shrink-0 rounded object-cover"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-card-foreground">
                {r.name}
              </span>
              {r.id === currentId && (
                <span className="shrink-0 text-xs font-semibold text-primary">
                  Mon choix
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
};

export default LunchPickDialog;
