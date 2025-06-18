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
import Layout from "../components/Layout";

export const userSections = ["Restaurants", "Mon compte", "À propos"].map(
  (label) => ({
    label,
    path: slugify(label),
  })
);

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

  const [restaurantFilters, setRestaurantFilters] = useState<RestaurantFilters>(
    defaultRestaurantFilters
  );

  const currentPage =
    userSections.find((section) => location.pathname.includes(section.path))
      ?.path ?? userSections[0].path;

  return (
    <Layout
      withNavbar
      centerContent={currentPage !== "restaurants"}
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
        <Route path="*" element={<Beeeh />} />
      </Routes>
    </Layout>
  );
};

export default UserPage;
