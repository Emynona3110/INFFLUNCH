import { Box, Flex, useColorModeValue, Grid, GridItem } from "@chakra-ui/react";
import Footer from "./Footer";
import Navbar from "./Navbar";
import { RestaurantFilters } from "../pages/UserPage";

interface LayoutProps {
  children: React.ReactNode;
  centerContent?: boolean;
  withNavbar?: boolean;
  navbarProps?: {
    page: string;
    setPage: (page: string) => void;
    restaurantFilters: RestaurantFilters;
    onFilterChange: (query: RestaurantFilters) => void;
    onSearch: (input: string) => void;
  };
}

const Layout = ({
  children,
  centerContent = false,
  withNavbar = false,
  navbarProps,
}: LayoutProps) => {
  const bg = useColorModeValue("gray.100", "gray.800");

  return (
    <Grid
      height="100vh"
      templateAreas={{
        base: withNavbar ? `"navigation" "main"` : `"main"`,
      }}
      templateRows={withNavbar ? "58px 1fr" : "1fr"}
      templateColumns="1fr"
      bg={bg}
    >
      {withNavbar && (
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
          {navbarProps && <Navbar {...navbarProps} />}
        </GridItem>
      )}

      <GridItem area="main" overflowY="auto">
        <Flex direction="column" minHeight="100%" bg={bg}>
          <Box
            flex="1"
            width="100%"
            maxW="1200px"
            mx="auto"
            px={4}
            py={6}
            display={centerContent ? "flex" : undefined}
            alignItems={centerContent ? "center" : undefined}
            justifyContent={centerContent ? "center" : undefined}
          >
            {children}
          </Box>
          <Footer />
        </Flex>
      </GridItem>
    </Grid>
  );
};

export default Layout;
