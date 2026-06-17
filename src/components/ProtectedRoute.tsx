import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import useAuth from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="tw-scope flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-scope flex h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="font-bold text-destructive">
            Impossible de contacter le serveur.
          </p>
          <p className="mt-1 text-foreground/60">
            Réessaie dans un instant ou recharge la page.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
