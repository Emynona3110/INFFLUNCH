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
import {
  defaultRestaurantFilters,
  RestaurantFilters,
  userSections,
} from "../pages/UserPage";
import FavoritesToggle from "./FavoritesToggle";

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

  return (
    <HStack justifyContent="space-between" h="100%" spacing={1} width="100%">
      <HStack spacing="5px" h="100%" userSelect={"none"}>
        <Box
          display="flex"
          alignItems="center"
          onClick={() => {
            onFilterChange(defaultRestaurantFilters);
            setPage("restaurants");
          }}
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
              {userSections.map((item) => (
                <MenuItem
                  key={item.path}
                  onClick={() => setPage(item.path)}
                  fontWeight={page === item.path ? "bold" : "normal"}
                  fontSize="16px"
                >
                  {item.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        ) : (
          <HStack h="100%">
            {userSections.map((item) => {
              const isActive = item.path === page;

              return (
                <Box key={item.path} px="10px" h="100%">
                  <Box
                    role="group"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    borderBottom={
                      isActive ? "2px solid" : "2px solid transparent"
                    }
                    _hover={{ cursor: "pointer" }}
                    onClick={() => setPage(item.path)}
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

      {page === "restaurants" && (
        <>
          <Box flex="1" paddingX={2}>
            <SearchInput onSearch={onSearch} />
          </Box>

          <HStack spacing={2}>
            <FavoritesToggle
              isChecked={!!restaurantFilters.favoritesOnly}
              onChange={(checked) =>
                onFilterChange({ ...restaurantFilters, favoritesOnly: checked })
              }
            />
            <FilterDialog
              restaurantFilters={restaurantFilters}
              onFilterChange={onFilterChange}
            />
            <ColorModeSwitch />
          </HStack>
        </>
      )}

      {page !== "restaurants" && <ColorModeSwitch />}
    </HStack>
  );
};

export default Navbar;
