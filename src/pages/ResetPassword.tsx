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
  Center,
  Spinner,
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useSession from "../hooks/useSession";
import useChangePassword from "../hooks/useChangePassword";

const ResetPassword = () => {
  const { sessionData, loading } = useSession();
  const navigate = useNavigate();
  const { updatePassword, isLoading, message } = useChangePassword(() => {
    navigate("/login");
  });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner />
      </Center>
    );
  }

  if (!sessionData) {
    return (
      <Center h="100vh" px={4}>
        <Box
          maxW="md"
          p={8}
          borderRadius="md"
          boxShadow="lg"
          textAlign="center"
          bg="white"
        >
          <Text fontSize="lg" fontWeight="semibold">
            Session invalide ou expirée.
          </Text>
          <Text color="gray.500" mt={2}>
            Merci de redemander un nouveau lien de réinitialisation.
          </Text>
        </Box>
      </Center>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (password !== confirm) return;
    await updatePassword(password);
  };

  const isTooShort = password.length > 0 && password.length < 6;
  const mismatch = password !== confirm;

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
          <Heading size="lg">Définir un nouveau mot de passe</Heading>
          <Text color="gray.500" fontSize="md">
            Choisissez un mot de passe fort pour accéder à votre compte
          </Text>
        </VStack>

        {message && (
          <Alert
            status={message.startsWith("Mot") ? "success" : "error"}
            borderRadius="md"
          >
            <AlertIcon />
            {message}
          </Alert>
        )}

        <VStack as="form" spacing={4} onSubmit={handleSubmit}>
          <FormControl id="new-password">
            <FormLabel>Nouveau mot de passe</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormControl>

          <FormControl id="confirm-password">
            <FormLabel>Confirmer le mot de passe</FormLabel>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </FormControl>

          {(isTooShort || mismatch) && (
            <Text fontSize="sm" color="red.400">
              {isTooShort
                ? "Le mot de passe doit contenir au moins 6 caractères."
                : mismatch
                ? "Les mots de passe ne correspondent pas."
                : ""}
            </Text>
          )}

          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={isLoading}
            isDisabled={mismatch}
          >
            Mettre à jour
          </Button>
        </VStack>
      </Stack>
    </Box>
  );
};

export default ResetPassword;
