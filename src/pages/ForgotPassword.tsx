import {
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Stack,
  Link,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const ForgotPassword = () => {
  const navigate = useNavigate();

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
        </VStack>

        <Alert status="info" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Text>
            Pour réinitialiser ton mot de passe, contacte <strong>LLS</strong>{" "}
            (par Teams ou à{" "}
            <Link href="mailto:contact@infflunch.com" color="blue.500">
              contact@infflunch.com
            </Link>
            ). Un nouveau mot de passe temporaire te sera communiqué.
          </Text>
        </Alert>

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
