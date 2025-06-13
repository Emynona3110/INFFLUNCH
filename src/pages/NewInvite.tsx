import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Stack,
  Alert,
  AlertIcon,
  Link,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";

const NewInvite = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const emailFromUrl = params.get("email");
    if (emailFromUrl) {
      setEmail(emailFromUrl);

      // Nettoyer l’URL après récupération
      window.history.replaceState(null, "", "/invitation-expiree");
    }
  }, [params]);

  const handleInvite = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabaseClient.auth.admin.inviteUserByEmail(email);

    if (error) {
      setMessage("Erreur lors de l'envoi du lien d'invitation.");
      setSuccess(false);
    } else {
      setMessage("Un nouveau lien d'invitation a été envoyé.");
      setSuccess(true);
    }

    setLoading(false);
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg={useColorModeValue("gray.100", "gray.800")}
      px={4}
    >
      <Stack
        spacing={6}
        maxW="md"
        width="100%"
        p={8}
        borderRadius="md"
        bg={useColorModeValue("white", "gray.900")}
        boxShadow="lg"
      >
        <VStack spacing={2} textAlign="center">
          <Heading size="lg">Lien expiré</Heading>
          <Text color="gray.500" fontSize="md">
            Recevez un nouveau lien en cliquant ci-dessous.
          </Text>
        </VStack>

        {message && (
          <Alert status={success ? "success" : "error"} borderRadius="md">
            <AlertIcon />
            {message}
          </Alert>
        )}

        {!success && (
          <Button
            onClick={handleInvite}
            colorScheme="blue"
            width="full"
            isLoading={loading}
          >
            Renvoyer l'invitation
          </Button>
        )}

        <Link
          onClick={() => navigate("/login")}
          color="blue.500"
          fontSize="sm"
          textAlign="center"
        >
          Retour à la connexion
        </Link>
      </Stack>
    </Box>
  );
};

export default NewInvite;
