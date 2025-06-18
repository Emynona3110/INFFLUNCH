import {
  Box,
  Heading,
  Button,
  VStack,
  useColorModeValue,
  useToast,
  Spinner,
  Text,
  Divider,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import useSession from "../hooks/useSession";
import ConfirmResetPassword from "../components/ConfirmResetPassword";

const MyAccount = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { sessionData, signOut, loading, error } = useSession();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    if (error) {
      toast({
        title: "Erreur de déconnexion",
        description: error,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      navigate("/login");
    }
  };

  const role = sessionData?.user.user_metadata?.role;

  return (
    <Box
      maxW="md"
      width="100%"
      p={8}
      borderRadius="md"
      boxShadow="md"
      bg={useColorModeValue("white", "gray.900")}
    >
      <VStack spacing={6} align="stretch">
        <Heading size="lg" textAlign="center">
          Mon compte
        </Heading>

        {loading ? (
          <Spinner alignSelf="center" />
        ) : sessionData ? (
          <>
            <Box>
              <Text>{sessionData.user.email}</Text>
            </Box>

            <Divider />

            <VStack spacing={3} align="stretch">
              <Button
                onClick={() => setDialogOpen(true)}
                colorScheme="blue"
                variant="outline"
              >
                Changer le mot de passe
              </Button>

              {role === "admin" && (
                <Button
                  colorScheme="teal"
                  variant="solid"
                  onClick={() => navigate("/admin")}
                >
                  Accéder à l’espace admin
                </Button>
              )}

              <Button colorScheme="red" onClick={handleLogout}>
                Se déconnecter
              </Button>
            </VStack>
          </>
        ) : (
          <Box>Aucune session utilisateur.</Box>
        )}
      </VStack>

      <ConfirmResetPassword
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
};

export default MyAccount;
