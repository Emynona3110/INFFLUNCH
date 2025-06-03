import { Menu, MenuButton, Button, MenuList, MenuItem } from "@chakra-ui/react";
import { BsChevronDown } from "react-icons/bs";

export type SortOrder =
  | "relevance"
  | "reviews"
  | "rating"
  | "created_at"
  | "distance";

interface SortSelectorProps {
  onSelectSortOrder: (sortOrder: SortOrder) => void;
  selectedSortOrder: SortOrder;
}

const SortSelector = ({
  onSelectSortOrder,
  selectedSortOrder,
}: SortSelectorProps) => {
  const sortOrders = [
    { value: "", label: "Pertinence" },
    { value: "reviews", label: "Avis" },
    { value: "rating", label: "Note" },
    { value: "date", label: "Date d'ajout" },
  ];

  const selectedSortOrderLabel =
    sortOrders.find((order) => order.value === selectedSortOrder)?.label ??
    "Relevance";

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<BsChevronDown />}
        width="225px"
        textAlign="left"
      >
        Trier par : {selectedSortOrderLabel}
      </MenuButton>

      <MenuList>
        {sortOrders.map((order) => (
          <MenuItem
            key={order.value}
            onClick={() => onSelectSortOrder(order.value as SortOrder)}
          >
            {order.label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};

export default SortSelector;
