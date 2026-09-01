import { FormEvent, useEffect, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { FiX } from "react-icons/fi";

interface SearchInputProps {
  /** Recherche courante, conservée au niveau page : la barre est démontée
   *  quand on change d'onglet, sans elle le champ revenait vide alors que le
   *  filtre, lui, restait actif. */
  value?: string;
  onSearch: (input: string) => void;
}

/**
 * Barre de recherche des restaurants. La recherche ne part QU'À la validation
 * (touche Entrée ou clic sur la loupe) : la remontée à chaque frappe, même
 * débouncée, relançait une requête par mot tapé pour un gain nul à notre
 * échelle. La croix, elle, vide et relance aussitôt.
 */
const SearchInput = ({ value: current = "", onSearch }: SearchInputProps) => {
  // État local libre pendant la frappe, resynchronisé dès que la valeur change
  // à l'extérieur (retour sur l'onglet, réinitialisation via le logo…).
  const [value, setValue] = useState(current);
  useEffect(() => setValue(current), [current]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(value.trim());
  };

  const clear = () => {
    setValue("");
    onSearch("");
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className="relative flex w-full items-center"
    >
      <button
        type="submit"
        aria-label="Rechercher"
        className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-foreground/50 transition hover:bg-foreground/10 hover:text-foreground"
      >
        <BsSearch className="h-4 w-4" />
      </button>
      <input
        type="search"
        placeholder="Chercher un restaurant..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="block h-10 w-full rounded-full border border-border bg-muted pl-9 pr-9 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/25 [&::-webkit-search-cancel-button]:hidden"
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
    </form>
  );
};

export default SearchInput;
