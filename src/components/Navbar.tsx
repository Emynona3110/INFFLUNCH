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
import { RestaurantQuery } from "../App";

interface NavbarProps {
  page: string;
  setPage: (page: string) => void;
  restaurantQuery: RestaurantQuery;
  onFilterChange: (query: RestaurantQuery) => void;
}

const Navbar = ({
  page,
  setPage,
  restaurantQuery,
  onFilterChange,
}: NavbarProps) => {
  const items = ["Restaurants", "Avis", "Favoris", "À propos"];
  const isMobile = useBreakpointValue({ base: true, lg: false });

  return (
    <HStack justifyContent="space-between" h="100%" spacing={4} width="100%">
      <HStack spacing="5px" h="100%">
        <Box
          display="flex"
          alignItems="center"
          onClick={() => setPage("Restaurants")}
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
              {items.map((item) => (
                <MenuItem
                  key={item}
                  onClick={() => setPage(item)}
                  fontWeight={page === item ? "bold" : "normal"}
                  fontSize="16px"
                >
                  {item}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        ) : (
          <HStack h="100%">
            {items.map((item) => {
              const isActive = item === page;

              return (
                <Box key={item} px="10px" h="100%">
                  <Box
                    role="group"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    borderBottom={
                      isActive ? "2px solid" : "2px solid transparent"
                    }
                    _hover={{ cursor: "pointer" }}
                    onClick={() => setPage(item)}
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
                      {item}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </HStack>
        )}
      </HStack>

      {/* Search input : flexible */}
      <Box flex="1">
        <SearchInput onSearch={(searchText) => console.log(searchText)} />
      </Box>

      <FilterDialog
        restaurantQuery={restaurantQuery}
        onFilterChange={onFilterChange}
      />
      {/* Color mode switch */}
      <ColorModeSwitch />
    </HStack>
  );
};

export default Navbar;
