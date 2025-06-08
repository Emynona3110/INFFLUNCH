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
  HStack,
  Divider,
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage("Email ou mot de passe incorrect.");
      setEmail("");
      setPassword("");
    } else {
      navigate("/user/restaurants");
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
          <Heading size="lg">Connexion à votre compte</Heading>
          <Text color="gray.500" fontSize="md">
            Entrez vos identifiants pour continuer
          </Text>
        </VStack>

        {message && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {message}
          </Alert>
        )}

        <VStack as="form" spacing={4} onSubmit={handleSubmit}>
          <FormControl id="email">
            <FormLabel>Adresse e-mail</FormLabel>
            <Input
              type="email"
              value={email}
              placeholder="exemple@mail.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormControl>

          <FormControl id="password">
            <FormLabel>Mot de passe</FormLabel>
            <Input
              type="password"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormControl>

          <HStack justify="space-between" width="100%">
            <Box />
            <Link
              color="blue.500"
              fontSize="sm"
              onClick={() => navigate("/password-oublie")}
            >
              Mot de passe oublié ?
            </Link>
          </HStack>

          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={isLoading}
          >
            Se connecter
          </Button>

          {/* Nouveau lien pour les nouveaux utilisateurs */}
          <Divider />
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Nouveau sur Infflunch ?{" "}
            <Link color="blue.500" onClick={() => navigate("/activation")}>
              Inscrivez-vous ici
            </Link>
          </Text>
        </VStack>
      </Stack>
    </Box>
  );
};

export default LoginPage;
