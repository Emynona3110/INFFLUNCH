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

const RequestAccessPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) return;
    setIsLoading(true);

    // On insère la demande. Les emails hors @infflux.com sont ignorés
    // silencieusement par un trigger en base : on affiche un succès dans tous
    // les cas (anti-énumération), et on ignore les erreurs (ex. doublon).
    await supabaseClient.from("waiting_list").insert({ email });

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
          <Heading size="lg">Demander un accès</Heading>
          <Text color="gray.500" fontSize="md">
            Réservé aux collaborateurs d'INFFLUX.
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
              Demande envoyée ! Si ton adresse est éligible, un administrateur
              créera ton compte et te transmettra tes identifiants.
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
              <FormLabel>Adresse e-mail professionnelle</FormLabel>
              <Input
                type="email"
                value={email}
                placeholder="prenom.nom@infflux.com"
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

export default RequestAccessPage;
