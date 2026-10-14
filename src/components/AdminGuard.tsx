import { Navigate, Outlet } from "react-router-dom";
import useSession from "../hooks/useSession";
import PageLoader from "@/components/brand/PageLoader";

/**
 * Garde unique des routes admin (`/admin/*`). Laisse passer si l'utilisateur a
 * le rôle "admin", sinon redirige. ⚠️ Garde CÔTÉ CLIENT (UX) : la vraie
 * protection des données reste la RLS Supabase.
 */
const AdminGuard = () => {
  const { sessionData, loading } = useSession();

  if (loading) {
    return (
      <div className="tw-scope pointer-events-none fixed inset-0 flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  const isAdmin = sessionData?.user?.user_metadata?.role === "admin";
  return isAdmin ? <Outlet /> : <Navigate to="/restaurants" replace />;
};

export default AdminGuard;
