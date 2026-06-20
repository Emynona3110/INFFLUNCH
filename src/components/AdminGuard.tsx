import { Navigate, Outlet } from "react-router-dom";
import useSession from "../hooks/useSession";

/**
 * Garde unique des routes admin (`/admin/*`). Laisse passer si l'utilisateur a
 * le rôle "admin", sinon redirige. ⚠️ Garde CÔTÉ CLIENT (UX) : la vraie
 * protection des données reste la RLS Supabase.
 */
const AdminGuard = () => {
  const { sessionData, loading } = useSession();

  if (loading) {
    return (
      <div className="tw-scope flex h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const isAdmin = sessionData?.user?.user_metadata?.role === "admin";
  return isAdmin ? <Outlet /> : <Navigate to="/restaurants" replace />;
};

export default AdminGuard;
