import {
  VStack,
  Box,
  Heading,
  Button,
  HStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const sections = [
  { label: "Restaurants", path: "restaurants" },
  { label: "Tags", path: "tags" },
  { label: "Badges", path: "badges" },
  { label: "Utilisateurs", path: "users" },
  { label: "Avis", path: "reviews" },
];

export const AdminPage = () => {
  const location = useLocation();

  return (
    <VStack
      spacing={8}
      align="stretch"
      p={4}
      height="calc(100vh - 60px)" // 60px = hauteur de la navbar
      overflow="hidden"
    >
      <Heading size="lg">Espace Administrateur</Heading>

      <HStack spacing={4} wrap="wrap">
        {sections.map(({ label, path }) => (
          <Button
            key={path}
            as={NavLink}
            to={`/admin/${path}`}
            variant="outline"
            colorScheme="blue"
            isActive={location.pathname === `/admin/${path}`}
            _activeLink={{
              bg: useColorModeValue("blue.100", "blue.700"),
            }}
          >
            {label}
          </Button>
        ))}
      </HStack>

      <Box
        flex="1"
        minHeight={0}
        maxHeight="calc(100vh - 120px)" // 60px navbar + 60px footer
        overflow="auto"
      >
        <Outlet />
      </Box>
    </VStack>
  );
};

export default AdminPage;
