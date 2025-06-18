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
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import usePasswordReset from "../hooks/usePasswordReset";
import Layout from "../components/Layout";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { requestReset, isLoading, message, success } = usePasswordReset();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefill = params.get("email");
    if (prefill) {
      setEmail(prefill);
    }
  }, [location.search]);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleReset = async () => {
    if (!isValidEmail(email)) return;
    await requestReset(email);
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
            Saisissez votre adresse e-mail
          </Text>
        </VStack>

        {message && (
          <Alert status={success ? "success" : "error"} borderRadius="md">
            <AlertIcon />
            {message}
          </Alert>
        )}

        {!success && (
          <VStack
            as="form"
            spacing={4}
            onSubmit={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
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
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
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
    </Layout>
  );
};

export default ForgotPassword;
