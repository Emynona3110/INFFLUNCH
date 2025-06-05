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
  Icon,
} from "@chakra-ui/react";
import { BsChevronDown } from "react-icons/bs";
import darkLogo from "../assets/infflux.svg";
import lightLogo from "../assets/w-infflux.svg";
import ColorModeSwitch from "../components/ColorModeSwitch";
import { adminSections } from "../pages/AdminPage";
import { useNavigate } from "react-router-dom";

interface AdminNavbarProps {
  page: string;
  setPage: (page: string) => void;
}

const AdminNavbar = ({ page, setPage }: AdminNavbarProps) => {
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const navigate = useNavigate();

  const currentLabel =
    adminSections.find((item) => item.path === page)?.label ?? "Menu";

  return (
    <HStack justifyContent="space-between" h="100%" spacing={1} width="100%">
      <HStack spacing="15px" h="100%" userSelect={"none"}>
        <Box
          display="flex"
          alignItems="center"
          onClick={() => navigate("/user")}
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
              px={3}
              py={1}
              rounded="md"
              borderWidth="1px"
              borderColor={useColorModeValue("gray.200", "gray.600")}
              _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
            >
              <HStack>
                <Text>{currentLabel}</Text>
                <Icon as={BsChevronDown} />
              </HStack>
            </MenuButton>
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
