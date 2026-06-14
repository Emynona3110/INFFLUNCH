import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { Spinner, Center, Text, VStack } from "@chakra-ui/react";
import useAuth from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, error } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100vh" px={4}>
        <VStack spacing={2} textAlign="center">
          <Text color="red.500" fontWeight="bold">
            Impossible de contacter le serveur.
          </Text>
          <Text color="gray.500">
            Réessaie dans un instant ou recharge la page.
          </Text>
        </VStack>
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
