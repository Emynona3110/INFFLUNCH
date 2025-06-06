import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Stack,
  Alert,
  AlertIcon,
  Link,
} from "@chakra-ui/react";
import { useState } from "react";
import supabaseClient from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleReset = async () => {
    setMessage("");

    if (!isValidEmail(email)) {
      setMessage("Format d'adresse e-mail invalide.");
      return;
    }

    setLoading(true);
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setMessage("Une erreur est survenue. Veuillez réessayer plus tard.");
    } else {
      setMessage(
        "Si un compte existe avec cette adresse, un lien a été envoyé."
      );
      setSuccess(true);
    }
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
          <Heading size="lg">Mot de passe oublié</Heading>
          <Text color="gray.500" fontSize="md">
            Saisissez votre adresse e-mail pour recevoir un lien de
            réinitialisation
          </Text>
        </VStack>

        {message && (
          <Alert
            status={
              message.startsWith("Format") || message.startsWith("Une erreur")
                ? "error"
                : "success"
            }
            borderRadius="md"
          >
            <AlertIcon />
            {message}
          </Alert>
        )}

        {!success && (
          <VStack spacing={4}>
            <FormControl id="email">
              <FormLabel>Adresse e-mail</FormLabel>
              <Input
                type="email"
                value={email}
                placeholder="exemple@mail.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>

            <Button
              colorScheme="blue"
              width="full"
              isLoading={loading}
              onClick={handleReset}
            >
              Envoyer le lien
            </Button>
          </VStack>
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

export default ForgotPassword;
