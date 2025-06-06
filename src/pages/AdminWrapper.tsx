import { useEffect, useState } from "react";
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Center, Spinner } from "@chakra-ui/react";
import useSession from "../hooks/useSession";

interface WrapperProps {
  children: ReactNode;
}

const AdminWrapper = ({ children }: WrapperProps) => {
  const { sessionData, loading } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sessionData) return;

    const role = sessionData.user.user_metadata?.role;
    setIsAdmin(role === "admin");
  }, [sessionData]);

  if (loading || isAdmin === null) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return isAdmin ? <>{children}</> : <Navigate to="/user" replace />;
};

export default AdminWrapper;
