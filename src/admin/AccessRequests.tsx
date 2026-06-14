import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Code,
  IconButton,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCopy } from "react-icons/fi";
import supabaseClient from "../services/supabaseClient";

interface AccessRequest {
  email: string;
  created_at: string;
}

const AccessRequests = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const rowBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.100", "gray.800");

  const [creatingEmail, setCreatingEmail] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  const {
    data: requests = [],
    isPending,
    error,
  } = useQuery<AccessRequest[], Error>({
    queryKey: ["access-requests"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("waiting_list")
        .select("email, created_at")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const handleCreate = async (email: string) => {
    setCreatingEmail(email);
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-create-user",
      { body: { email } }
    );
    setCreatingEmail(null);

    if (error || data?.error) {
      // Le message d'erreur de la fonction est dans data.error (réponse non-2xx)
      let description = data?.error;
      if (!description && error?.context) {
        try {
          description = (await error.context.json())?.error;
        } catch {
          /* ignore */
        }
      }
      toast({
        title: "Création impossible",
        description: description || "Une erreur est survenue.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setCredentials({ email: data.email, tempPassword: data.tempPassword });
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié", status: "success", duration: 1500 });
  };

  return (
    <Flex flexDirection="column" height="100%">
      <VStack align="stretch" spacing={4} p={4}>
        <Heading size="md">Demandes d'accès</Heading>

        {isPending ? (
          <Center h="40vh">
            <Spinner size="xl" />
          </Center>
        ) : error ? (
          <Text color="red.500">Erreur : {error.message}</Text>
        ) : requests.length === 0 ? (
          <Text color="gray.500">Aucune demande en attente.</Text>
        ) : (
          <Box borderWidth="1px" borderRadius="md" overflowX="auto">
            <Table variant="striped" size="sm">
              <Thead>
                <Tr>
                  <Th bg={headerBg}>Email</Th>
                  <Th bg={headerBg}>Demandé le</Th>
                  <Th bg={headerBg} textAlign="right">
                    Action
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {requests.map((req) => (
                  <Tr key={req.email} bg={rowBg}>
                    <Td>{req.email}</Td>
                    <Td>
                      {new Date(req.created_at).toLocaleDateString("fr-FR")}
                    </Td>
                    <Td textAlign="right">
                      <Button
                        size="sm"
                        colorScheme="blue"
                        isLoading={creatingEmail === req.email}
                        onClick={() => handleCreate(req.email)}
                      >
                        Créer le compte
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </VStack>

      {/* Affichage du mot de passe temporaire après création */}
      <Modal
        isOpen={credentials !== null}
        onClose={() => setCredentials(null)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Compte créé ✅</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text>
                Transmets ces identifiants à <b>{credentials?.email}</b> via
                Teams. Il devra changer son mot de passe à la première connexion.
              </Text>
              <Box>
                <Text fontSize="sm" color="gray.500">
                  Mot de passe temporaire
                </Text>
                <HStack>
                  <Code fontSize="lg" px={3} py={1} borderRadius="md">
                    {credentials?.tempPassword}
                  </Code>
                  <IconButton
                    aria-label="Copier"
                    icon={<FiCopy />}
                    size="sm"
                    onClick={() => copy(credentials?.tempPassword ?? "")}
                  />
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setCredentials(null)}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default AccessRequests;
