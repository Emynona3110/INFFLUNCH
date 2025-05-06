import { useColorModeValue, Grid, GridItem, Box, Flex } from "@chakra-ui/react";
import "./App.css";
import Navbar from "./components/Navbar";
import RestaurantGrid from "./components/RestaurantGrid";
import { useState } from "react";
import { SortOrder } from "./components/SortSelector";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";

export interface RestaurantQuery {
  minRate: number;
  sortOrder: SortOrder;
  tags: string[];
  searchText: string;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [restaurantQuery, setRestaurantQuery] = useState<RestaurantQuery>({
    minRate: 0,
    sortOrder: "",
    tags: [],
    searchText: "",
  });

  const currentPage = location.pathname.slice(1) || "restaurants";

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
          restaurantQuery={restaurantQuery}
          onFilterChange={(query: RestaurantQuery) =>
            setRestaurantQuery({ ...restaurantQuery, ...query })
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
              <Route path="/" element={<RestaurantGrid />} />
              <Route path="/restaurants" element={<RestaurantGrid />} />
              <Route path="/avis" element={<Box p={4}>Avis à venir</Box>} />
              <Route path="/favoris" element={<Box p={4}>Vos favoris</Box>} />
              <Route
                path="/a-propos"
                element={<Box p={4}>À propos de nous</Box>}
              />
            </Routes>
          </Box>

          <Box
            as="footer"
            mt={10}
            py={4}
            textAlign="center"
            fontSize="sm"
            color={useColorModeValue("gray.600", "gray.400")}
            borderTop="1px solid"
            borderColor={useColorModeValue("gray.200", "gray.700")}
          >
            © 2025 Infflunch — Tous droits réservés.
          </Box>
        </Flex>
      </GridItem>
    </Grid>
  );
}

export default App;
