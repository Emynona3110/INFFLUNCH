import {
  Badge,
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

type RequestType = "creation" | "password_reset";
type RequestState = "Waiting" | "Accepted" | "Rejected";

interface AccessRequest {
  id: number;
  email: string;
  type: RequestType;
  state: RequestState;
  created_at: string;
}

const typeLabel: Record<RequestType, string> = {
  creation: "Création de compte",
  password_reset: "Réinit. mot de passe",
};

const AccessRequests = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const rowBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.100", "gray.800");
  const mutedColor = useColorModeValue("gray.400", "gray.600");

  const [processingId, setProcessingId] = useState<number | null>(null);
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
        .select("id, email, type, state, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AccessRequest[];
    },
  });

  // Demandes en attente d'abord, puis l'historique
  const sorted = [...requests].sort((a, b) => {
    if (a.state === "Waiting" && b.state !== "Waiting") return -1;
    if (a.state !== "Waiting" && b.state === "Waiting") return 1;
    return 0;
  });

  const setState = (id: number, state: RequestState) =>
    supabaseClient.from("waiting_list").update({ state }).eq("id", id);

  const handleAccept = async (req: AccessRequest) => {
    setProcessingId(req.id);
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-create-user",
      { body: { email: req.email, type: req.type } }
    );

    if (error || data?.error) {
      let description = data?.error;
      if (!description && error?.context) {
        try {
          description = (await error.context.json())?.error;
        } catch {
          /* ignore */
        }
      }
      setProcessingId(null);
      toast({
        title: "Action impossible",
        description: description || "Une erreur est survenue.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    await setState(req.id, "Accepted");
    setProcessingId(null);
    setCredentials({ email: data.email, tempPassword: data.tempPassword });
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  const handleReject = async (req: AccessRequest) => {
    setProcessingId(req.id);
    const { error } = await setState(req.id, "Rejected");
    setProcessingId(null);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
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
        ) : sorted.length === 0 ? (
          <Text color="gray.500">Aucune demande.</Text>
        ) : (
          <Box borderWidth="1px" borderRadius="md" overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th bg={headerBg}>Email</Th>
                  <Th bg={headerBg}>Type</Th>
                  <Th bg={headerBg}>Date</Th>
                  <Th bg={headerBg} textAlign="right">
                    Statut / Action
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sorted.map((req) => {
                  const pending = req.state === "Waiting";
                  return (
                    <Tr
                      key={req.id}
                      bg={rowBg}
                      color={pending ? undefined : mutedColor}
                    >
                      <Td>{req.email}</Td>
                      <Td>{typeLabel[req.type]}</Td>
                      <Td>
                        {new Date(req.created_at).toLocaleDateString("fr-FR")}
                      </Td>
                      <Td textAlign="right">
                        {pending ? (
                          <HStack justify="flex-end" spacing={2}>
                            <Button
                              size="sm"
                              colorScheme="green"
                              isLoading={processingId === req.id}
                              onClick={() => handleAccept(req)}
                            >
                              Accepter
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              isDisabled={processingId === req.id}
                              onClick={() => handleReject(req)}
                            >
                              Refuser
                            </Button>
                          </HStack>
                        ) : (
                          <Badge
                            colorScheme={
                              req.state === "Accepted" ? "green" : "red"
                            }
                          >
                            {req.state === "Accepted" ? "Acceptée" : "Refusée"}
                          </Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </VStack>

      {/* Mot de passe temporaire après acceptation */}
      <Modal
        isOpen={credentials !== null}
        onClose={() => setCredentials(null)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Demande acceptée ✅</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text>
                Transmets ces identifiants à <b>{credentials?.email}</b> via
                Teams. Le mot de passe devra être changé à la prochaine
                connexion.
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
