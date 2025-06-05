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
import ColorModeSwitch from "../components/ColorModeSwitch";
import { adminSections } from "./AdminPage";

interface AdminNavbarProps {
  page: string;
  setPage: (page: string) => void;
}

const AdminNavbar = ({ page, setPage }: AdminNavbarProps) => {
  const isMobile = useBreakpointValue({ base: true, lg: false });

  return (
    <HStack justifyContent="space-between" h="100%" spacing={1} width="100%">
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
              ADMINFFLUNCH
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
              {adminSections.map((item) => (
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
            {adminSections.map((item) => {
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

      <ColorModeSwitch />
    </HStack>
  );
};

export default AdminNavbar;
