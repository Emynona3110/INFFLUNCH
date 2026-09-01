import { BsSearch } from "react-icons/bs";
import { FiX } from "react-icons/fi";
import { useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";

interface SearchInputProps {
  /** Recherche courante, conservée au niveau page : la barre est démontée
   *  quand on change d'onglet, sans elle le champ revenait vide alors que le
   *  filtre, lui, restait actif. */
  value?: string;
  onSearch: (input: string) => void;
  delay?: number;
}

const SearchInput = ({ value: current = "", onSearch, delay = 300 }: SearchInputProps) => {
  // État local pour que la frappe reste fluide (la remontée est débouncée),
  // resynchronisé dès que la valeur change à l'extérieur (retour sur l'onglet,
  // réinitialisation des filtres via le logo…).
  const [value, setValue] = useState(current);
  useEffect(() => setValue(current), [current]);

  const debouncedSearch = useMemo(
    () => debounce((val: string) => onSearch(val), delay),
    [onSearch, delay]
  );

  const clear = () => {
    debouncedSearch.cancel();
    setValue("");
    onSearch("");
  };

  return (
    <div className="relative flex w-full items-center">
      <BsSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
      <input
        type="text"
        placeholder="Chercher un restaurant..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          debouncedSearch(e.target.value);
        }}
        className="block h-10 w-full rounded-full border border-border bg-muted pl-9 pr-9 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/25"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Effacer la recherche"
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full leading-none text-foreground/45 transition hover:bg-foreground/10 hover:text-foreground"
        >
          <FiX className="block h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
