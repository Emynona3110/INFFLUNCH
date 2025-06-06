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
import usePasswordReset from "../hooks/usePasswordReset";

const MyAccount = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { sessionData, signOut, loading, error } = useSession();
  const { requestReset, isLoading } = usePasswordReset();

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

  const handlePasswordReset = async () => {
    if (!sessionData?.user?.email) return;

    await requestReset(sessionData.user.email, async () => {
      toast({
        title: "Lien envoyé",
        description: `Un email a été envoyé à ${sessionData.user.email}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      await signOut();
      navigate("/login");
    });
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
                onClick={handlePasswordReset}
                colorScheme="blue"
                variant="outline"
                isLoading={isLoading}
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
    </Box>
  );
};

export default MyAccount;
