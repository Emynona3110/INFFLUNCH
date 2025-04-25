import { useColorModeValue, Grid, GridItem } from "@chakra-ui/react";
import "./App.css";
import Navbar from "./components/Navbar";
import RestaurantGrid from "./components/RestaurantGrid";
import { useState } from "react";
import SearchInput from "./components/SearchInput";

export interface RestaurantQuery {}

function App() {
  const [currentPage, setCurrentPage] = useState("Restaurants");

  return (
    <Grid
      height={"100vh"}
      templateAreas={{
        base: `"navigation" "filters" "main" "footer"`,
        xl: `"navigation navigation" "filters main" "footer footer"`,
      }}
      templateRows={{ base: "auto 1fr auto", xl: "auto 1fr auto" }}
      templateColumns={{ base: "1fr", xl: "300px 1fr" }}
    >
      <GridItem
        area="navigation"
        height={"60px"}
        alignContent={"center"}
        paddingX={4}
        shadow={"sm"}
        bg={useColorModeValue("white", "gray.900")}
        color={useColorModeValue("black", "white")}
        borderBottom="1px solid"
        borderColor={useColorModeValue("gray.200", "gray.700")}
        position="sticky"
        top="0"
        zIndex="1000"
      >
        <Navbar page={currentPage} setPage={setCurrentPage} />
      </GridItem>
      <GridItem area="filters" padding={4}>
        <SearchInput onSearch={() => {}} />
      </GridItem>
      <GridItem area="main" padding={4}>
        <RestaurantGrid />
      </GridItem>
      <GridItem area="footer" padding={4}>
        Footer
      </GridItem>
    </Grid>
  );
}

export default App;
