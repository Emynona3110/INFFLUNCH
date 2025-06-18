import {
  Button,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Stack,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useState } from "react";
import usePasswordReset from "../hooks/usePasswordReset";
import Layout from "../components/Layout";

const ExpiredLink = ({ email }: { email: string }) => {
  const [sent, setSent] = useState(false);
  const { requestReset, isLoading, message, success } = usePasswordReset();

  const handleSendNewLink = async () => {
    await requestReset(email, () => setSent(true));
  };

  window.history.replaceState(null, "", window.location.pathname);

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
          <Heading size="lg">Lien expiré</Heading>
          <Text color="gray.500" fontSize="md">
            Ce lien d'invitation / réinitialisation n’est plus valide.
            <br />
            Veuillez demander un nouveau lien pour redéfinir un mot de passe.
          </Text>
        </VStack>

        {message && (
          <Alert status={success ? "success" : "error"} borderRadius="md">
            <AlertIcon />
            {message}
          </Alert>
        )}

        {!sent && (
          <Button
            colorScheme="blue"
            width="full"
            isLoading={isLoading}
            onClick={handleSendNewLink}
          >
            Envoyer un nouveau lien
          </Button>
        )}
      </Stack>
    </Layout>
  );
};

export default ExpiredLink;
