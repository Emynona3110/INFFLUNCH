import {
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
import { useNavigate } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";
import Layout from "../components/Layout";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) return;
    setIsLoading(true);

    // Crée une demande de réinitialisation. Les emails hors domaine sont
    // ignorés silencieusement en base ; succès affiché dans tous les cas.
    await supabaseClient
      .from("waiting_list")
      .insert({ email, type: "password_reset" });

    setIsLoading(false);
    setDone(true);
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
          <Heading size="lg">Mot de passe oublié</Heading>
          <Text color="gray.500" fontSize="md">
            Saisis ton adresse e-mail pour demander une réinitialisation.
          </Text>
        </VStack>

        {done ? (
          <Alert
            status="success"
            borderRadius="md"
            flexDirection="column"
            textAlign="center"
            py={6}
          >
            <AlertIcon boxSize={6} mr={0} mb={2} />
            <Text>
              Demande envoyée ! Si un compte correspond, un administrateur te
              transmettra un nouveau mot de passe temporaire.
            </Text>
          </Alert>
        ) : (
          <VStack
            as="form"
            spacing={4}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <FormControl id="email">
              <FormLabel>Adresse e-mail</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
              isDisabled={!isValidEmail(email)}
            >
              Envoyer ma demande
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
    </Layout>
  );
};

export default ForgotPassword;
