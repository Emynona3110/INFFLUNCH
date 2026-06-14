import {
  Alert,
  AlertIcon,
  Button,
  Center,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { ReactNode, useState } from "react";
import supabaseClient from "../services/supabaseClient";
import useSession from "../hooks/useSession";
import Layout from "./Layout";

interface Props {
  children: ReactNode;
}

/**
 * Bloque l'accès à l'app tant que l'utilisateur n'a pas changé le mot de passe
 * temporaire fourni par l'admin (flag user_metadata.must_change_password).
 */
const ForcePasswordChangeGate = ({ children }: Props) => {
  const { sessionData, loading } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const mustChange =
    sessionData?.user?.user_metadata?.must_change_password === true;

  const cardBg = useColorModeValue("white", "gray.900");

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!mustChange) return <>{children}</>;

  const canSubmit = password.length >= 6 && password === confirm;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setError("");

    const { error: updateError } = await supabaseClient.auth.updateUser({
      password,
      data: { must_change_password: false },
    });

    setIsLoading(false);

    if (updateError) {
      setError("Impossible de mettre à jour le mot de passe. Réessaie.");
      return;
    }
    // La session est mise à jour (USER_UPDATED) → le gate laisse passer.
  };

  return (
    <Layout centerContent>
      <Stack
        spacing={6}
        maxW="md"
        width="100%"
        p={8}
        borderRadius="md"
        bg={cardBg}
        boxShadow="lg"
      >
        <VStack spacing={2} textAlign="center">
          <Heading size="lg">Choisis ton mot de passe</Heading>
          <Text color="gray.500" fontSize="md">
            Pour ta première connexion, remplace le mot de passe temporaire.
          </Text>
        </VStack>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <VStack
          as="form"
          spacing={4}
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <FormControl id="new-password">
            <FormLabel>Nouveau mot de passe</FormLabel>
            <Input
              type="password"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>

          <FormControl
            id="confirm-password"
            isInvalid={confirm !== "" && confirm !== password}
          >
            <FormLabel>Confirme le mot de passe</FormLabel>
            <Input
              type="password"
              value={confirm}
              placeholder="••••••••"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={isLoading}
            isDisabled={!canSubmit}
          >
            Valider
          </Button>
        </VStack>
      </Stack>
    </Layout>
  );
};

export default ForcePasswordChangeGate;
