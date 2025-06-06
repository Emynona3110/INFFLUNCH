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
import useSession from "../hooks/useSession";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import { useState } from "react";

const MyAccount = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { sessionData, signOut, loading, error } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      mx="auto"
      mt={12}
      p={8}
      borderRadius="md"
      boxShadow="lg"
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
                onClick={() => setIsDialogOpen(true)}
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

        <ChangePasswordDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      </VStack>
    </Box>
  );
};

export default MyAccount;
