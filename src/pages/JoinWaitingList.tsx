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
import { useNavigate } from "react-router-dom";
import useJoinWaitingList from "../hooks/useJoinWaitingList";

const JoinWaitingList = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { join, loading, success, error, message } = useJoinWaitingList();

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) return;
    await join(email);
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
          <Heading size="lg">Inscription</Heading>
          <Text color="gray.500" fontSize="md">
            Saisissez votre adresse e-mail pour rejoindre la liste d'attente.
          </Text>
        </VStack>

        {(success || error) && (
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
              handleSubmit();
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
              isLoading={loading}
              isDisabled={!isValidEmail(email)}
            >
              M’inscrire
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

export default JoinWaitingList;
