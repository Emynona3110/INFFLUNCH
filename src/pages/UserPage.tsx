import { useColorModeValue, Grid, GridItem, Box, Flex } from "@chakra-ui/react";
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RestaurantGrid from "../components/RestaurantGrid";
import Beeeh from "../components/Beeeh";
import { useState } from "react";
import { slugify } from "../utils/slugify";
import { SortOrder } from "../components/SortSelector";
import MyAccount from "../sections/MyAccount";

export const userSections = [
  "Restaurants",
  "Mon compte",
  "Favoris",
  "À propos",
].map((label) => ({
  label,
  path: slugify(label),
}));

export interface RestaurantFilters {
  id?: number;
  slug?: string;
  sortOrder: SortOrder;
  minRate: number;
  tags: string[];
  searchText: string;
}

export const defaultRestaurantFilters: RestaurantFilters = {
  sortOrder: "relevance",
  minRate: 0,
  tags: [],
  searchText: "",
};

const UserPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [restaurantFilters, setRestaurantFilters] = useState<RestaurantFilters>(
    defaultRestaurantFilters
  );

  const currentPage =
    userSections.find((section) => location.pathname.includes(section.path))
      ?.path ?? userSections[0].path;

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
        <Navbar
          page={currentPage}
          setPage={(page) => navigate("/user/" + page)}
          restaurantFilters={restaurantFilters}
          onFilterChange={(query: RestaurantFilters) =>
            setRestaurantFilters({ ...restaurantFilters, ...query })
          }
          onSearch={(input: string) =>
            setRestaurantFilters({
              ...restaurantFilters,
              searchText: input,
            })
          }
        />
      </GridItem>

      {/* MAIN */}
      <GridItem area="main" overflowY="auto" height="calc(100vh - 60px)">
        <Flex flexDirection="column" minHeight="100%">
          <Box
            flex="1"
            maxWidth="1200px"
            width="100%"
            padding={4}
            marginX="auto"
          >
            <Routes>
              <Route index element={<Navigate to="restaurants" replace />} />
              <Route
                path="restaurants"
                element={
                  <RestaurantGrid restaurantFilters={restaurantFilters} />
                }
              />
              <Route path="mon-compte" element={<MyAccount />} />
              <Route path="favoris" element={<Box p={4}>Vos favoris</Box>} />
              <Route
                path="a-propos"
                element={<Box p={4}>À propos de nous</Box>}
              />
              <Route path="*" element={<Beeeh />} />
            </Routes>
          </Box>

          <Footer />
        </Flex>
      </GridItem>
    </Grid>
  );
};

export default UserPage;
