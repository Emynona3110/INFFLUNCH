import {
  useColorModeValue,
  Grid,
  GridItem,
  Stack,
  Text,
  Wrap,
  HStack,
} from "@chakra-ui/react";
import "./App.css";
import Navbar from "./components/Navbar";
import RestaurantGrid from "./components/RestaurantGrid";
import { useState } from "react";
import MinRateSlider from "./components/MinRateSlider";
import SortSelector, { SortOrder } from "./components/SortSelector";
import TagSelector from "./components/TagSelector";

export interface RestaurantQuery {}

function App() {
  const [currentPage, setCurrentPage] = useState("Restaurants");
  const [sortOrder, setSortOrder] = useState<SortOrder>("");
  const [tags, setTags] = useState<string[]>([]); // <-- en minuscule ✅

  return (
    <Grid
      height="100vh"
      templateAreas={{
        base: `"navigation" "filters" "main" "footer"`,
        xl: `"navigation navigation" "filters main" "footer footer"`,
      }}
      templateRows={{ base: "auto 1fr auto", xl: "auto 1fr auto" }}
      templateColumns={{ base: "1fr", xl: "auto 1fr" }}
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
        <Navbar page={currentPage} setPage={setCurrentPage} />
      </GridItem>

      {/* FILTERS */}
      <GridItem area="filters" padding={4}>
        <Stack spacing={4}>
          <Text>TODO utiliser une grid pour le responsive</Text>
          <MinRateSlider />
          <SortSelector
            selectedSortOrder={sortOrder}
            onSelectSortOrder={(order: SortOrder) => setSortOrder(order)}
          />

          <HStack>
            <TagSelector selectedTags={tags} setSelectedTags={setTags} />
            <Wrap>
              {tags.map((tag) => (
                <Text
                  key={tag}
                  bg={useColorModeValue("gray.100", "whiteAlpha.200")}
                  px={2}
                  py={1}
                  borderRadius="md"
                  fontSize="sm"
                >
                  {tag}
                </Text>
              ))}
            </Wrap>
          </HStack>
        </Stack>
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
