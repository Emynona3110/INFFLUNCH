import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import useTags from "@/hooks/useTags";
import { TAG_CATEGORIES } from "@/services/tagCategories";
import { slugify } from "@/utils/slugify";
import { cn } from "@/lib/utils";

interface TagPickerProps {
  /** Tags déjà choisis : ils disparaissent de la liste. */
  selected: string[];
  onPick: (label: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Choix d'un tag : mini barre de recherche + liste au premier plan (tous les
 * tags tant qu'on n'a rien tapé), groupée par catégorie.
 *
 * Remplace le `<select>` natif, dont la touche Échap validait l'option
 * survolée au lieu d'annuler — on ajoutait un tag sans l'avoir voulu. Ici Échap
 * ne fait que refermer la liste (et ne ferme pas la modale parente tant que la
 * liste est ouverte, d'où le `stopPropagation`).
 */
const TagPicker = ({ selected, onPick, placeholder, className }: TagPickerProps) => {
  const { data: availableTags } = useTags();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Recherche par slug : insensible à la casse ET aux accents ("pate" trouve
  // "Pâtes"), comme la recherche de restaurants.
  const groups = useMemo(() => {
    const needle = slugify(search);
    return TAG_CATEGORIES.map((category) => ({
      key: category.value,
      label: category.label,
      options: (availableTags ?? [])
        .filter(
          (tag) =>
            tag.category === category.value &&
            !selected.includes(tag.label) &&
            (!needle || slugify(tag.label).includes(needle))
        )
        .map((tag) => tag.label)
        .sort((a, b) => a.localeCompare(b, "fr")),
    })).filter((group) => group.options.length > 0);
  }, [availableTags, selected, search]);

  // Liste à plat : sert à la navigation au clavier, qui ignore les en-têtes.
  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups]);

  useEffect(() => setHighlight(0), [search, open]);

  // Garde l'option survolée visible pendant la navigation au clavier.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  // Clic ailleurs (y compris ailleurs dans la modale) : on referme la liste.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const pick = (label: string) => {
    onPick(label);
    setSearch("");
    setHighlight(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      if (flat.length === 0) return;
      setHighlight((i) =>
        e.key === "ArrowDown"
          ? (i + 1) % flat.length
          : (i - 1 + flat.length) % flat.length
      );
      return;
    }

    if (e.key === "Enter") {
      // Empêche la validation du formulaire parent (RestaurantDialog).
      e.preventDefault();
      if (open && flat[highlight]) pick(flat[highlight]);
    }
  };

  let index = -1;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="tag-picker-list"
        value={search}
        placeholder={placeholder ?? "Chercher un tag…"}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
      />

      {open && (
        <div
          id="tag-picker-list"
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-card border border-border bg-card py-1 shadow-xl"
        >
          {flat.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-foreground/60">
              {search ? "Aucun tag ne correspond." : "Tous les tags sont déjà choisis."}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
                  {group.label}
                </div>
                {group.options.map((label) => {
                  index += 1;
                  const current = index;
                  return (
                    <button
                      key={label}
                      type="button"
                      role="option"
                      aria-selected={current === highlight}
                      data-index={current}
                      onMouseEnter={() => setHighlight(current)}
                      onClick={() => pick(label)}
                      className={cn(
                        "block w-full cursor-pointer px-3 py-1.5 text-left text-sm text-card-foreground transition",
                        current === highlight && "bg-primary/10 text-primary"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TagPicker;
