import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import useSession from "../hooks/useSession";

interface WrapperProps {
  children: ReactNode;
}

const AdminWrapper = ({ children }: WrapperProps) => {
  const { sessionData, loading } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sessionData) return;
    setIsAdmin(sessionData.user.user_metadata?.role === "admin");
  }, [sessionData]);

  if (loading || isAdmin === null) {
    return (
      <div className="tw-scope flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return isAdmin ? <>{children}</> : <Navigate to="/user" replace />;
};

export default AdminWrapper;
