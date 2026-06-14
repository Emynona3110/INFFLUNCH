import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  Alert,
  AlertIcon,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import supabaseClient from "../services/supabaseClient";
import useSession from "../hooks/useSession";
import PasswordField from "./PasswordField";

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordDialog = ({ isOpen, onClose }: ChangePasswordDialogProps) => {
  const { sessionData } = useSession();
  const toast = useToast();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit =
    oldPassword !== "" && newPassword.length >= 6 && newPassword === confirm;

  const reset = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirm("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const email = sessionData?.user?.email;
    if (!canSubmit || !email) return;

    setIsLoading(true);
    setError("");

    // 1) Vérifier l'ancien mot de passe en se ré-authentifiant
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password: oldPassword,
    });
    if (signInError) {
      setIsLoading(false);
      setError("Ancien mot de passe incorrect.");
      return;
    }

    // 2) Définir le nouveau mot de passe
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });
    setIsLoading(false);

    if (updateError) {
      setError("Impossible de mettre à jour le mot de passe. Réessaie.");
      return;
    }

    toast({
      title: "Mot de passe mis à jour",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Changer le mot de passe</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack
            as="form"
            spacing={4}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <PasswordField
              label="Ancien mot de passe"
              value={oldPassword}
              onChange={setOldPassword}
            />
            <PasswordField
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={setNewPassword}
            />
            <PasswordField
              label="Confirmer le nouveau mot de passe"
              value={confirm}
              onChange={setConfirm}
              isInvalid={confirm !== "" && confirm !== newPassword}
            />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleClose} mr={3} variant="ghost">
            Annuler
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!canSubmit}
          >
            Valider
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ChangePasswordDialog;
