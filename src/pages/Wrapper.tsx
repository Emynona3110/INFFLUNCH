import { useEffect, useState } from "react";
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";
import { Center, Spinner } from "@chakra-ui/react";

interface WrapperProps {
  children: ReactNode;
}

const Wrapper = ({ children }: WrapperProps) => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      setAuthenticated(!!session);
    };

    getSession();
  }, []);

  // ✅ Cas spécial : ne pas bloquer certaines routes
  if (location.pathname === "/reset-password") {
    return <>{children}</>;
  }

  if (authenticated === null) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return authenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export default Wrapper;
