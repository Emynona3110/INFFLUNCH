import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import RestaurantGrid from "../sections/RestaurantGrid";
import Beeeh from "../sections/Beeeh";
import { useState } from "react";
import { slugify } from "../utils/slugify";
import { SortOrder } from "../components/SortSelector";
import MyAccount from "../sections/MyAccount";
import About from "../sections/About";
import AccessRequests from "../admin/AccessRequests";
import AdminTablesSection from "../sections/AdminTablesSection";
import Layout from "../components/Layout";
import useIsAdmin from "../hooks/useIsAdmin";

// Sections de la navbar selon le rôle. Les admins gèrent tout depuis l'espace
// user (plus d'espace admin séparé) : Restaurants, Demandes, Tables, Mon compte.
// Les autres : Restaurants, Mon compte, À propos.
export const buildUserSections = (isAdmin: boolean) =>
  (isAdmin
    ? ["Restaurants", "Demandes", "Tables", "Mon compte"]
    : ["Restaurants", "Mon compte", "À propos"]
  ).map((label) => ({ label, path: slugify(label) }));

export interface RestaurantFilters {
  id?: number;
  slug?: string;
  sortOrder: SortOrder;
  minRate: number;
  tags: string[];
  badges: string[];
  searchText: string;
  favoritesOnly?: boolean;
}

export const defaultRestaurantFilters: RestaurantFilters = {
  sortOrder: "relevance",
  minRate: 0,
  tags: [],
  badges: [],
  searchText: "",
  favoritesOnly: false,
};

const UserPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = useIsAdmin();

  const sections = buildUserSections(isAdmin);

  const [restaurantFilters, setRestaurantFilters] = useState<RestaurantFilters>(
    defaultRestaurantFilters
  );

  const currentPage =
    sections.find((section) => location.pathname.includes(section.path))
      ?.path ?? sections[0].path;

  // mon-compte / à propos = contenu centré ; demandes / tables = pleine hauteur
  // avec scroll interne (pas de scroll de page) ; restaurants = scroll de page.
  const centerContent =
    currentPage === "mon-compte" || currentPage === "a-propos";
  const fillContent = currentPage === "demandes" || currentPage === "tables";

  return (
    <Layout
      withNavbar
      centerContent={centerContent}
      fillContent={fillContent}
      navbarProps={{
        page: currentPage,
        setPage: (page) => navigate("/user/" + page),
        restaurantFilters,
        onFilterChange: (query) =>
          setRestaurantFilters({ ...restaurantFilters, ...query }),
        onSearch: (input) =>
          setRestaurantFilters({ ...restaurantFilters, searchText: input }),
      }}
    >
      <Routes>
        <Route index element={<Navigate to="restaurants" replace />} />
        <Route
          path="restaurants"
          element={<RestaurantGrid restaurantFilters={restaurantFilters} />}
        />
        <Route path="mon-compte" element={<MyAccount />} />
        <Route path="a-propos" element={<About />} />
        {isAdmin && <Route path="demandes" element={<AccessRequests />} />}
        {isAdmin && <Route path="tables" element={<AdminTablesSection />} />}
        <Route path="*" element={<Beeeh />} />
      </Routes>
    </Layout>
  );
};

export default UserPage;
