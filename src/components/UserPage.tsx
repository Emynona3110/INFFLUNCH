import { useColorModeValue, Grid, GridItem, Box, Flex } from "@chakra-ui/react";
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import RestaurantGrid from "./RestaurantGrid";
import Beeeh from "./Beeeh";
import { useState } from "react";
import { RestaurantFilters } from "../App";
import { slugify } from "../utils/slugify";

export const userSections = ["Restaurants", "Avis", "Favoris", "À propos"].map(
  (label) => ({
    label,
    path: slugify(label),
  })
);

const UserPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [restaurantFilters, setRestaurantFilters] = useState<RestaurantFilters>(
    {
      sortOrder: "relevance",
      minRate: 0,
      tags: [],
      searchText: "",
    }
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
          setPage={(page) => navigate("/" + page.toLowerCase())}
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
              <Route
                path="/"
                element={<Navigate to="/restaurants" replace />}
              />
              <Route
                path="/restaurants"
                element={
                  <RestaurantGrid restaurantFilters={restaurantFilters} />
                }
              />
              <Route path="/avis" element={<Box p={4}>Avis à venir</Box>} />
              <Route path="/favoris" element={<Box p={4}>Vos favoris</Box>} />
              <Route
                path="/a-propos"
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
