import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import RestaurantGrid from "../sections/RestaurantGrid";
import RestaurantPage from "./RestaurantPage";
import Beeeh from "../sections/Beeeh";
import { useState } from "react";
import { SortOrder } from "../components/SortSelector";
import MyAccount from "../sections/MyAccount";
import About from "../sections/About";
import Nouveautes from "../sections/Nouveautes";
import AccessRequests from "../admin/AccessRequests";
import AdminTablesSection from "../sections/AdminTablesSection";
import AdminGuard from "../components/AdminGuard";
import Layout from "../components/Layout";
import useIsAdmin from "../hooks/useIsAdmin";

// Sections de la navbar selon le rôle. Les pages réservées aux admins vivent
// sous /admin/* (garde unique AdminGuard) ; les autres sont à la racine.
export const buildUserSections = (isAdmin: boolean) =>
  isAdmin
    ? [
        { label: "Restaurants", path: "restaurants" },
        { label: "Demandes", path: "admin/demandes" },
        { label: "Tables", path: "admin/tables" },
        { label: "Nouveautés", path: "nouveautes" },
        { label: "Mon compte", path: "mon-compte" },
      ]
    : [
        { label: "Restaurants", path: "restaurants" },
        { label: "Nouveautés", path: "nouveautes" },
        { label: "Mon compte", path: "mon-compte" },
        { label: "À propos", path: "a-propos" },
      ];

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

  // Fiche d'un restaurant : pas d'onglet actif, la navbar se réduit (pas de
  // recherche/filtres). Sinon, l'onglet correspondant à l'URL.
  const isRestaurantDetail = location.pathname.includes("/restaurant/");
  const currentPage = isRestaurantDetail
    ? ""
    : sections.find((section) => location.pathname.includes(section.path))
        ?.path ?? sections[0].path;

  // mon-compte / à propos = contenu centré ; demandes / tables = pleine hauteur
  // avec scroll interne (pas de scroll de page) ; restaurants/fiche = scroll de page.
  const centerContent =
    currentPage === "mon-compte" || currentPage === "a-propos";
  const fillContent =
    currentPage === "admin/demandes" || currentPage === "admin/tables";

  return (
    <Layout
      withNavbar
      centerContent={centerContent}
      fillContent={fillContent}
      navbarProps={{
        page: currentPage,
        setPage: (page) => navigate("/" + page),
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
        <Route path="restaurant/:slug" element={<RestaurantPage />} />
        <Route path="mon-compte" element={<MyAccount />} />
        <Route path="a-propos" element={<About />} />
        <Route path="nouveautes" element={<Nouveautes />} />
        {/* Pages admin sous /admin/* derrière un garde unique. */}
        <Route path="admin" element={<AdminGuard />}>
          <Route index element={<Navigate to="demandes" replace />} />
          <Route path="demandes" element={<AccessRequests />} />
          <Route path="tables" element={<AdminTablesSection />} />
        </Route>
        <Route path="*" element={<Beeeh />} />
      </Routes>
    </Layout>
  );
};

export default UserPage;
