import { useColorModeValue, Grid, GridItem, Box } from "@chakra-ui/react";
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
        base: `"navigation" "main" "footer"`,
      }}
      templateRows={{ base: "auto 1fr auto" }}
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
      <Box maxWidth="1200px" width="100%" padding={4} marginX="auto">
        <Routes>
          <Route path="/" element={<RestaurantGrid />} />
          <Route path="/restaurants" element={<RestaurantGrid />} />
          <Route path="/avis" element={<Box p={4}>Avis à venir</Box>} />
          <Route path="/favoris" element={<Box p={4}>Vos favoris</Box>} />
          <Route path="/a-propos" element={<Box p={4}>À propos de nous</Box>} />
        </Routes>
      </Box>

      {/* FOOTER */}
      <GridItem area="footer" padding={4}>
        Footer
      </GridItem>
    </Grid>
  );
}

export default App;
