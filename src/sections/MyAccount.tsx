import {
  Box,
  Heading,
  Button,
  VStack,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";

const MyAccount = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const signOut = async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      toast({
        title: "Erreur de déconnexion",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      navigate("/login");
    }
  };

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
      <VStack spacing={6}>
        <Heading size="lg">Mon compte</Heading>

        <Button colorScheme="red" onClick={signOut}>
          Se déconnecter
        </Button>
      </VStack>
    </Box>
  );
};

export default MyAccount;
