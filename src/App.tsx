import { useColorModeValue, Grid, GridItem, Box, Flex } from "@chakra-ui/react";
import "./App.css";
import Navbar from "./components/Navbar";
import RestaurantGrid from "./components/RestaurantGrid";
import { useState } from "react";
import { SortOrder } from "./components/SortSelector";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Beeeh from "./components/Beeeh";
import AdminPage from "./admin/AdminPage";
import Footer from "./components/Footer";

export interface RestaurantFilters {
  id?: number;
  slug?: string;
  sortOrder: SortOrder;
  minRate: number;
  tags: string[];
  searchText: string;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [restaurantFilters, setRestaurantFilters] = useState<RestaurantFilters>(
    {
      sortOrder: "relevance",
      minRate: 0,
      tags: [],
      searchText: "",
    }
  );

  const isAdminPath = location.pathname.startsWith("/admin");
  const currentPage = location.pathname.slice(1) || "restaurants";

  if (isAdminPath) {
    return <AdminPage />;
  }

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
                element={
                  <RestaurantGrid restaurantFilters={restaurantFilters} />
                }
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
}

export default App;
