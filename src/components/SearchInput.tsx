import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { BsSearch } from "react-icons/bs";
import { useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";

interface SearchInputProps {
  onSearch: (input: string) => void;
  delay?: number; // optionnel, pour customiser le délai
}

const SearchInput = ({ onSearch, delay = 300 }: SearchInputProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  const debouncedSearch = useMemo(
    () =>
      debounce((val: string) => {
        onSearch(val);
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
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          debouncedSearch(e.target.value);
        }}
        style={{ userSelect: value ? "auto" : "none" }}
      />
    </InputGroup>
  );
};

export default SearchInput;
