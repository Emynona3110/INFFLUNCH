import { useColorModeValue, Grid, GridItem } from "@chakra-ui/react";
import "./App.css";
import Navbar from "./components/Navbar";
import RestaurantGrid from "./components/RestaurantGrid";
import { useState } from "react";
import { SortOrder } from "./components/SortSelector";

export interface RestaurantQuery {
  minRate: number;
  sortOrder: SortOrder;
  tags: string[];
  searchText: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState("Restaurants");
  const [restaurantQuery, setRestaurantQuery] = useState<RestaurantQuery>({
    minRate: 0,
    sortOrder: "",
    tags: [],
    searchText: "",
  });

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
          setPage={setCurrentPage}
          restaurantQuery={restaurantQuery}
          onFilterChange={(query: RestaurantQuery) =>
            setRestaurantQuery({ ...restaurantQuery, ...query })
          }
        />
      </GridItem>

      {/* MAIN */}
      <GridItem area="main" padding={4}>
        <RestaurantGrid />
      </GridItem>

      {/* FOOTER */}
      <GridItem area="footer" padding={4}>
        Footer
      </GridItem>
    </Grid>
  );
}

export default App;
