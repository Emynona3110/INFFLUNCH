import {
  useColorModeValue,
  HStack,
  Image,
  Text,
  Box,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useBreakpointValue,
  IconButton,
  Icon,
} from "@chakra-ui/react";
import { FiMoreVertical } from "react-icons/fi";
import darkLogo from "../assets/infflux.svg";
import lightLogo from "../assets/w-infflux.svg";
import ColorModeSwitch from "./ColorModeSwitch";
import SearchInput from "./SearchInput";
import FilterDialog from "./FilterDialog";
import { RestaurantFilters } from "../App";
import { slugify } from "../utils/slugify";

interface NavbarProps {
  page: string;
  setPage: (page: string) => void;
  restaurantFilters: RestaurantFilters;
  onFilterChange: (query: RestaurantFilters) => void;
  onSearch: (input: string) => void;
}

const Navbar = ({
  page,
  setPage,
  restaurantFilters,
  onFilterChange,
  onSearch,
}: NavbarProps) => {
  const isMobile = useBreakpointValue({ base: true, lg: false });

  // Prépare les onglets avec leurs slugs
  const menuItems = ["Restaurants", "Avis", "Favoris", "À propos"].map(
    (label) => ({
      label,
      slug: slugify(label),
    })
  );

  return (
    <HStack justifyContent="space-between" h="100%" spacing={4} width="100%">
      <HStack spacing="5px" h="100%">
        <Box
          display="flex"
          alignItems="center"
          onClick={() => setPage("restaurants")}
          _hover={{ cursor: "pointer" }}
        >
          <Image src={useColorModeValue(darkLogo, lightLogo)} boxSize="32px" />
          {!isMobile && (
            <Text fontSize="20px" fontWeight="bold" mr={4}>
              INFFLUNCH
            </Text>
          )}
        </Box>

        {isMobile ? (
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<Icon as={FiMoreVertical} boxSize="24px" />}
              variant="transparent"
              aria-label="Menu"
            />
            <MenuList>
              {menuItems.map((item) => (
                <MenuItem
                  key={item.slug}
                  onClick={() => setPage(item.slug)}
                  fontWeight={page === item.slug ? "bold" : "normal"}
                  fontSize="16px"
                >
                  {item.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        ) : (
          <HStack h="100%">
            {menuItems.map((item) => {
              const isActive = item.slug === page;

              return (
                <Box key={item.slug} px="10px" h="100%">
                  <Box
                    role="group"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    borderBottom={
                      isActive ? "2px solid" : "2px solid transparent"
                    }
                    _hover={{ cursor: "pointer" }}
                    onClick={() => setPage(item.slug)}
                  >
                    <Text
                      fontSize="20px"
                      color={
                        isActive
                          ? "inherit"
                          : useColorModeValue("gray.500", "gray.400")
                      }
                      _groupHover={{ color: "inherit" }}
                      transition="color 0.2s ease"
                    >
                      {item.label}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </HStack>
        )}
      </HStack>

      <Box flex="1">
        <SearchInput onSearch={onSearch} />
      </Box>

      {page === "restaurants" && (
        <FilterDialog
          restaurantFilters={restaurantFilters}
          onFilterChange={onFilterChange}
        />
      )}
      <ColorModeSwitch />
    </HStack>
  );
};

export default Navbar;
