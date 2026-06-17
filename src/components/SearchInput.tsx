import { BsSearch } from "react-icons/bs";
import { useMemo, useState } from "react";
import debounce from "lodash.debounce";

interface SearchInputProps {
  onSearch: (input: string) => void;
  delay?: number;
}

const SearchInput = ({ onSearch, delay = 300 }: SearchInputProps) => {
  const [value, setValue] = useState("");

  const debouncedSearch = useMemo(
    () => debounce((val: string) => onSearch(val), delay),
    [onSearch, delay]
  );

  return (
    <div className="relative w-full">
      <BsSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
      <input
        type="text"
        placeholder="Chercher un restaurant..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          debouncedSearch(e.target.value);
        }}
        className="h-10 w-full rounded-full border border-border bg-muted pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/25"
      />
    </div>
  );
};

export default SearchInput;
