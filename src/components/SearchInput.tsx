import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { BsSearch } from "react-icons/bs";
import { useMemo, useRef } from "react";
import debounce from "lodash.debounce";

interface SearchInputProps {
  onSearch: (input: string) => void;
  delay?: number; // optionnel, pour customiser le délai
}

const SearchInput = ({ onSearch, delay = 300 }: SearchInputProps) => {
  const ref = useRef<HTMLInputElement>(null);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        onSearch(value);
      }, delay),
    [onSearch, delay]
  );

  return (
    <InputGroup>
      <InputLeftElement paddingLeft={2} children={<BsSearch />} />
      <Input
        ref={ref}
        borderRadius={20}
        placeholder="Chercher un restaurant..."
        variant="filled"
        onChange={(e) => debouncedSearch(e.target.value)}
      />
    </InputGroup>
  );
};

export default SearchInput;
