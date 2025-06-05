import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

const PageNotFound = () => {
  const navigate = useNavigate();
  const bg = useColorModeValue("gray.100", "gray.800");

  return (
    <Box
      height="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg={bg}
      px={4}
    >
      <VStack spacing={6} textAlign="center">
        <Heading size="2xl">404 - Page introuvable</Heading>
        <Text fontSize="lg" color="gray.500">
          Oups ! La page que vous cherchez n'existe pas ou a été déplacée.
        </Text>
        <Button colorScheme="blue" onClick={() => navigate("/user")}>
          Retour à l'accueil
        </Button>
      </VStack>
    </Box>
  );
};

export default PageNotFound;
