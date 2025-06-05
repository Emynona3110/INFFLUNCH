import {
  useColorModeValue,
  Grid,
  GridItem,
  VStack,
  Flex,
  Heading,
} from "@chakra-ui/react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AdminNavbar from "../admin/AdminNavbar";
import { slugify } from "../utils/slugify";

import BadgeManager from "../admin/Managers/BadgeManager";
import RestaurantManager from "../admin/Managers/RestaurantManager";
import ReviewManager from "../admin/Managers/ReviewManager";
import TagManager from "../admin/Managers/TagManager";
import UserManager from "../admin/Managers/UserManager";
import Beeeh from "../components/Beeeh";

export const adminSections = [
  "Restaurants",
  "Avis",
  "Tags",
  "Badges",
  "Utilisateurs",
].map((label) => ({
  label,
  path: `admin/${slugify(label)}`,
}));

export const AdminPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage =
    adminSections.find((section) => location.pathname.includes(section.path))
      ?.path ?? adminSections[0].path;

  const currentLabel =
    adminSections.find((section) => location.pathname.includes(section.path))
      ?.label ?? "";

  return (
    <Grid
      height="100vh"
      templateAreas={{
        base: `"navigation" "main"`,
      }}
      templateRows={{ base: "auto 1fr" }}
      templateColumns={{ base: "1fr" }}
    >
      {/* NAVIGATION */}
      <GridItem
        area="navigation"
        height="60px"
        alignContent="center"
        paddingX={4}
        shadow="sm"
        bg={useColorModeValue("white", "gray.900")}
        color={useColorModeValue("black", "white")}
        borderBottom="1px solid"
        borderColor={useColorModeValue("gray.200", "gray.700")}
        position="sticky"
        top="0"
        zIndex="1000"
      >
        <AdminNavbar
          page={currentPage}
          setPage={(page) => navigate("/" + page.toLowerCase())}
        />
      </GridItem>

      {/* MAIN */}
      <GridItem area="main" overflowY="auto" height="calc(100vh - 60px)">
        <Flex flexDirection="column" height="100%">
          <VStack
            align="stretch"
            spacing={4}
            p={4}
            height="100%"
            maxHeight="calc(100vh - 60px)" // empêche de dépasser le viewport
          >
            <Heading size="md">{`Gestion des ${currentLabel.toLowerCase()}`}</Heading>

            <Routes>
              <Route index element={<Navigate to="restaurants" />} />
              <Route path="restaurants" element={<RestaurantManager />} />
              <Route path="avis" element={<ReviewManager />} />
              <Route path="tags" element={<TagManager />} />
              <Route path="badges" element={<BadgeManager />} />
              <Route path="utilisateurs" element={<UserManager />} />
              <Route path="*" element={<Beeeh />} />
            </Routes>
          </VStack>
        </Flex>
      </GridItem>
    </Grid>
  );
};

export default AdminPage;
