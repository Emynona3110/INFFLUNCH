import { Button, Heading, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <Layout centerContent>
      <VStack spacing={6} textAlign="center">
        <Heading size="2xl">404 - Page introuvable</Heading>
        <Text fontSize="lg" color="gray.500">
          Oups ! La page que vous cherchez n'existe pas ou a été déplacée.
        </Text>
        <Button colorScheme="blue" onClick={() => navigate("/user")}>
          Retour à l'accueil
        </Button>
      </VStack>
    </Layout>
  );
};

export default PageNotFound;
