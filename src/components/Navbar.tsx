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
  Button,
} from "@chakra-ui/react";
import { BsChevronDown } from "react-icons/bs";
import darkLogo from "../assets/infflux.svg";
import lightLogo from "../assets/w-infflux.svg";
import ColorModeSwitch from "./ColorModeSwitch";

interface NavbarProps {
  page: string;
  setPage: (page: string) => void;
}

const Navbar = ({ page, setPage }: NavbarProps) => {
  const items = ["Restaurants", "Avis", "Favoris", "À propos"];
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <HStack justifyContent="space-between" h="100%">
      <HStack spacing="5px" h="100%">
        <Box
          display="flex"
          alignItems="center"
          onClick={() => setPage("Restaurants")}
          _hover={{ cursor: "pointer" }}
          mr="10px"
        >
          <Image src={useColorModeValue(darkLogo, lightLogo)} boxSize="32px" />
          <Text fontSize="20px" fontWeight="bold">
            INFFLUNCH
          </Text>
        </Box>

        {isMobile ? (
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<BsChevronDown />}
              variant="ghost"
              fontSize={"20px"}
            >
              {page}
            </MenuButton>
            <MenuList>
              {items.map((item) => (
                <MenuItem
                  key={item}
                  onClick={() => setPage(item)}
                  fontWeight={page === item ? "bold" : "normal"}
                  fontSize={"16px"}
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
                <Box key={item} paddingX="10px" h="100%">
                  <Box
                    role="group"
                    height="100%"
                    display="flex"
                    alignItems="center"
                    borderBottom={
                      isActive ? "2px solid" : "2px solid transparent"
                    }
                    _hover={{
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setPage(item);
                    }}
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

      <ColorModeSwitch />
    </HStack>
  );
};

export default Navbar;
