import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  useToast,
} from "@chakra-ui/react";
import { useRef } from "react";
import usePasswordReset from "../hooks/usePasswordReset";
import { useNavigate } from "react-router-dom";
import useSession from "../hooks/useSession";

interface ConfirmResetPasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConfirmResetPassword = ({
  isOpen,
  onClose,
}: ConfirmResetPasswordProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { sessionData, signOut } = useSession();
  const { requestReset, isLoading } = usePasswordReset();

  const handleConfirm = async () => {
    const email = sessionData?.user?.email;
    if (!email) return;

    await requestReset(email, async () => {
      toast({
        title: "Lien envoyé",
        description: `Un email a été envoyé à ${email}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      await signOut();
      navigate("/login");
    });

    onClose(); // Fermer la popup seulement après le traitement
  };

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
    >
      <AlertDialogOverlay />
      <AlertDialogContent>
        <AlertDialogHeader>Changer le mot de passe</AlertDialogHeader>
        <AlertDialogBody>
          Cette action vous déconnectera d'Infflunch et un lien de
          réinitialisation sera envoyé par mail.
          <br />
          Souhaitez-vous continuer ?
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onClose} isDisabled={isLoading}>
            Annuler
          </Button>
          <Button
            colorScheme="blue"
            ml={3}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            Confirmer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmResetPassword;
