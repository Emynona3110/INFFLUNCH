import { useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { cn } from "@/lib/utils";

export type SortOrder =
  | "relevance"
  | "reviews"
  | "rating"
  | "created_at"
  | "distance"
  | "price";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "relevance", label: "Pertinence" },
  { value: "rating", label: "Meilleures notes" },
  { value: "distance", label: "Proximité" },
  { value: "price", label: "Prix" },
  { value: "reviews", label: "Nombre d'avis" },
  { value: "created_at", label: "Ajout récent" },
];

interface SortSelectorProps {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}

/**
 * Choix du tri, avec la même liste que le TagPicker (au premier plan, option
 * survolée teintée) plutôt qu'un `<select>` natif. Comme lui, Échap ne fait que
 * refermer la liste, sans fermer la modale parente.
 */
const SortSelector = ({ value, onChange }: SortSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  // À l'ouverture, l'option survolée est le tri en cours.
  useEffect(() => {
    if (open) setHighlight(SORT_OPTIONS.findIndex((o) => o.value === value));
  }, [open, value]);

  // Clic ailleurs (y compris ailleurs dans la modale) : on referme la liste.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const pick = (v: SortOrder) => {
    onChange(v);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      if (!open) return; // laisse la modale parente se fermer
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const n = SORT_OPTIONS.length;
      setHighlight((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      pick(SORT_OPTIONS[highlight].value);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls="sort-selector-list"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className="flex h-10 w-full cursor-pointer items-center rounded-lg border border-border bg-background pl-3 pr-9 text-left text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
      >
        {current.label}
      </button>
      <FiChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-5 h-4 w-4 -translate-y-1/2 text-foreground opacity-50 transition-transform",
          open && "rotate-180",
        )}
      />

      {open && (
        <div
          id="sort-selector-list"
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-card border border-border bg-card py-1 shadow-xl"
        >
          {SORT_OPTIONS.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(o.value)}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-card-foreground transition",
                i === highlight && "bg-primary/10 text-primary",
              )}
            >
              {o.label}
              {o.value === value && <FiCheck className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SortSelector;
