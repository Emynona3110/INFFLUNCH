import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useColorModeValue,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import useChangePassword from "../hooks/useChangePassword";

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordDialog = ({
  isOpen,
  onClose,
}: ChangePasswordDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    setLocalError("");
    onClose();
  };

  const { isLoading, message, updatePassword } = useChangePassword(handleClose);

  const handleSubmit = () => {
    setLocalError("");

    if (newPassword.length < 8) {
      setLocalError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("Les mots de passe ne correspondent pas.");
      return;
    }

    updatePassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={handleClose}
      isCentered
      motionPreset="slideInBottom"
    >
      <AlertDialogOverlay />
      <AlertDialogContent bg={useColorModeValue("white", "gray.900")}>
        <AlertDialogHeader>Changer le mot de passe</AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          <VStack spacing={4}>
            {(localError || message) && (
              <Alert
                status={
                  message && message.startsWith("Mot de passe")
                    ? "success"
                    : "error"
                }
                borderRadius="md"
              >
                <AlertIcon />
                {localError || message}
              </Alert>
            )}

            <FormControl id="new-password">
              <FormLabel>Nouveau mot de passe</FormLabel>
              <Input
                type="password"
                value={newPassword}
                placeholder="••••••••"
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </FormControl>

            <FormControl id="confirm-password">
              <FormLabel>Confirmer le mot de passe</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                placeholder="••••••••"
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </FormControl>
          </VStack>
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={handleClose}>
            Annuler
          </Button>
          <Button
            colorScheme="blue"
            ml={3}
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Mettre à jour
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ChangePasswordDialog;
