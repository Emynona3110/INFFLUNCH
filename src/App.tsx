import { useLocation } from "react-router-dom";
import AdminPage from "./admin/AdminPage";
import UserPage from "./components/UserPage";
import { SortOrder } from "./components/SortSelector";

export interface RestaurantFilters {
  id?: number;
  slug?: string;
  sortOrder: SortOrder;
  minRate: number;
  tags: string[];
  searchText: string;
}

function App() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");

  return isAdminPath ? <AdminPage /> : <UserPage />;
}

export default App;
