import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import RestaurantGrid from "../sections/RestaurantGrid";
import RestaurantsToolbar from "../components/RestaurantsToolbar";
import RestaurantPage from "./RestaurantPage";
import PageNotFound from "./PageNotFound";
import { useState } from "react";
import { SortOrder } from "../components/SortSelector";
import MyAccount from "../sections/MyAccount";
import About from "../sections/About";
import Nouveautes from "../sections/Nouveautes";
import LunchToday from "../sections/LunchToday";
import AdminSection from "../sections/AdminSection";
import AdminGuard from "../components/AdminGuard";
import Layout from "../components/Layout";
import useIsAdmin from "../hooks/useIsAdmin";

// Sections de la navbar selon le rôle. Les pages réservées aux admins vivent
// sous /admin/* (garde unique AdminGuard) ; les autres sont à la racine.
export const buildUserSections = (isAdmin: boolean) =>
  isAdmin
    ? [
        { label: "Restaurants", path: "restaurants" },
        { label: "Déjeuner", path: "dejeuner" },
        { label: "Admin", path: "admin" },
        { label: "Nouveautés", path: "nouveautes" },
        { label: "Mon Profil", path: "mon-compte" },
      ]
    : [
        { label: "Restaurants", path: "restaurants" },
        { label: "Déjeuner", path: "dejeuner" },
        { label: "Nouveautés", path: "nouveautes" },
        { label: "Mon Profil", path: "mon-compte" },
        { label: "À propos", path: "a-propos" },
      ];

/** Modes d'affichage de la liste des restaurants (grille = défaut). */
export type ViewMode = "grid" | "list" | "map" | "roulette";

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
  // Mode d'affichage : on garde le choix de l'utilisateur d'une session à
  // l'autre (localStorage, comme le thème). À défaut de préférence enregistrée,
  // la vue liste est le défaut sur mobile (< md = 768px), la grille sinon.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem("viewMode");
      if (
        saved === "grid" ||
        saved === "list" ||
        saved === "map" ||
        saved === "roulette"
      )
        return saved;
    } catch {
      /* localStorage indisponible */
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
    ) {
      return "list";
    }
    return "grid";
  });

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("viewMode", mode);
    } catch {
      /* localStorage indisponible */
    }
  };

  // Restos exclus de la roue (décochés dans la popup de sélection). Mémorisé en
  // mémoire comme les filtres : survit au changement de vue, remis à zéro au
  // rechargement de la page. Modèle par exclusion → par défaut, tout participe.
  const [rouletteExcluded, setRouletteExcluded] = useState<Set<number>>(
    new Set()
  );
  // Dernier restaurant tiré : conservé quand on quitte/revient sur la vue roue,
  // effacé dès que la sélection change.
  const [rouletteWinnerId, setRouletteWinnerId] = useState<number | null>(null);
  const handleRouletteExcludedChange = (next: Set<number>) => {
    setRouletteExcluded(next);
    setRouletteWinnerId(null);
  };

  // Fiche d'un restaurant : pas d'onglet actif, la navbar se réduit (pas de
  // recherche/filtres). Sinon, l'onglet correspondant à l'URL.
  const isRestaurantDetail = location.pathname.includes("/restaurant/");
  const currentPage = isRestaurantDetail
    ? ""
    : sections.find((section) => location.pathname.includes(section.path))
        ?.path ?? sections[0].path;

  // à propos = contenu centré ; mon-compte gère lui-même sa mise en page (pills
  // en haut, carte centrée) ; demandes / tables = pleine hauteur avec scroll
  // interne (pas de scroll de page) ; restaurants/fiche = scroll de page.
  const centerContent = currentPage === "a-propos";
  // La carte globale et la roue occupent toute la hauteur (pas de scroll de page).
  const fillContent =
    currentPage === "admin" ||
    (currentPage === "restaurants" &&
      (viewMode === "map" || viewMode === "roulette"));

  return (
    <Layout
      withNavbar
      centerContent={centerContent}
      fillContent={fillContent}
      navbarProps={{
        page: currentPage,
        setPage: (page) => navigate("/" + page),
        onFilterChange: (query) =>
          setRestaurantFilters({ ...restaurantFilters, ...query }),
      }}
      toolbar={
        currentPage === "restaurants" ? (
          <RestaurantsToolbar
            restaurantFilters={restaurantFilters}
            onFilterChange={(query) =>
              setRestaurantFilters({ ...restaurantFilters, ...query })
            }
            onSearch={(input) =>
              setRestaurantFilters({ ...restaurantFilters, searchText: input })
            }
            viewMode={viewMode}
            onViewModeChange={changeViewMode}
          />
        ) : undefined
      }
    >
      <Routes>
        <Route index element={<Navigate to="restaurants" replace />} />
        <Route
          path="restaurants"
          element={
            <RestaurantGrid
              restaurantFilters={restaurantFilters}
              viewMode={viewMode}
              rouletteExcluded={rouletteExcluded}
              onRouletteExcludedChange={handleRouletteExcludedChange}
              rouletteWinnerId={rouletteWinnerId}
              onRouletteWinnerChange={setRouletteWinnerId}
            />
          }
        />
        <Route path="dejeuner" element={<LunchToday />} />
        {/* Compat : ancien chemin de l'onglet, renommé « Déjeuner ». */}
        <Route path="midi" element={<Navigate to="/dejeuner" replace />} />
        <Route path="restaurant/:slug" element={<RestaurantPage />} />
        <Route path="mon-compte" element={<MyAccount />} />
        <Route path="a-propos" element={<About />} />
        <Route path="nouveautes" element={<Nouveautes />} />
        {/* Pages admin sous /admin/* derrière un garde unique. */}
        <Route path="admin" element={<AdminGuard />}>
          <Route index element={<AdminSection />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Layout>
  );
};

export default UserPage;
