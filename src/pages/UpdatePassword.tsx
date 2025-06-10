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
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
  Link,
} from "@chakra-ui/react";
import { VscEye, VscEyeClosed } from "react-icons/vsc";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useSession from "../hooks/useSession";
import useChangePassword from "../hooks/useChangePassword";

const UpdatePassword = () => {
  const { sessionData, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { updatePassword, isLoading, message } = useChangePassword(() => {});

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isTooShort = password.length < 8;
  const isComplexEnough = (pwd: string) =>
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd);
  const notComplex = password.length >= 8 && !isComplexEnough(password);
  const mismatch = confirm.length > 0 && password !== confirm;

  const isValid = !isTooShort && !notComplex && !mismatch;
  const isSuccess = submitted && message?.startsWith("Mot");

  const validationErrors: string[] = [];
  if (isTooShort) {
    validationErrors.push(
      "Le mot de passe doit contenir au moins 8 caractères."
    );
  }
  if (notComplex) {
    validationErrors.push(
      "Il doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial."
    );
  }
  if (mismatch) {
    validationErrors.push("Les mots de passe ne correspondent pas.");
  }

  const handleSubmit = async (e: React.FormEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isValid) return;
    await updatePassword(password);
    setSubmitted(true);
  };

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate("/user");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  useEffect(() => {
    if (submitted && message && !message.startsWith("Mot")) {
      toast({
        title: "Erreur",
        description: message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  }, [submitted, message, toast]);

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
          bg={useColorModeValue("white", "gray.900")}
        >
          <Text fontSize="lg" fontWeight="semibold">
            Session invalide ou expirée.
          </Text>
          <Link
            onClick={() => navigate("/login")}
            color="blue.500"
            fontSize="sm"
            textAlign="center"
          >
            Retour à la connexion
          </Link>
        </Box>
      </Center>
    );
  }

  const isResetFlow = location.pathname === "/reinitialiser-password";

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
          <Heading size="lg">
            {isResetFlow
              ? "Nouveau mot de passe"
              : "Définir votre mot de passe"}
          </Heading>
          <Text color="gray.500" fontSize="md">
            Choisissez un mot de passe fort pour accéder à votre compte
          </Text>
        </VStack>

        {isSuccess && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            {message} Vous allez être redirigé...
          </Alert>
        )}

        {!isSuccess &&
          validationErrors.map((err, idx) => (
            <Alert key={idx} status="error" borderRadius="md">
              <AlertIcon />
              {err}
            </Alert>
          ))}

        {!isSuccess && (
          <VStack as="form" spacing={4} onSubmit={handleSubmit}>
            <FormControl id="new-password">
              <FormLabel>Mot de passe</FormLabel>
              <InputGroup onMouseLeave={() => setShowPassword(false)}>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <InputRightElement>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    icon={showPassword ? <VscEyeClosed /> : <VscEye />}
                    onClick={() => setShowPassword((prev) => !prev)}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl id="confirm-password">
              <FormLabel>Confirmer le mot de passe</FormLabel>
              <InputGroup onMouseLeave={() => setShowConfirm(false)}>
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
                <InputRightElement>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label={
                      showConfirm
                        ? "Masquer la confirmation"
                        : "Afficher la confirmation"
                    }
                    icon={showConfirm ? <VscEyeClosed /> : <VscEye />}
                    onClick={() => setShowConfirm((prev) => !prev)}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
              isDisabled={!isValid}
            >
              {isResetFlow ? "Mettre à jour" : "Activer mon compte"}
            </Button>
          </VStack>
        )}
      </Stack>
    </Box>
  );
};

export default UpdatePassword;
