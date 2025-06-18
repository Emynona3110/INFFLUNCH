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
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { VscEye, VscEyeClosed } from "react-icons/vsc";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";
import Layout from "../components/Layout";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <Layout centerContent>
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
            <InputGroup onMouseLeave={() => setShowPassword(false)}>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <InputRightElement>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  icon={showPassword ? <VscEyeClosed /> : <VscEye />}
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              </InputRightElement>
            </InputGroup>
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

          <Divider />
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Nouveau sur Infflunch ?{" "}
            <Link color="blue.500" onClick={() => navigate("/inscription")}>
              Inscrivez-vous ici
            </Link>
          </Text>
        </VStack>
      </Stack>
    </Layout>
  );
};

export default LoginPage;
