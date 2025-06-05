import { useColorModeValue, Grid, GridItem } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminNavbar from "../admin/AdminNavbar";
import DataManager from "../admin/DataManager";
import Beeeh from "../components/Beeeh";
import { adminSections } from "./adminSections";

export const AdminPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage =
    adminSections.find((section) => location.pathname.includes(section.path))
      ?.path ?? adminSections[0].path;

  const currentSection = adminSections.find(
    (section) => section.path === currentPage
  );

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
        {currentSection ? <DataManager section={currentSection} /> : <Beeeh />}
      </GridItem>
    </Grid>
  );
};

export default AdminPage;
