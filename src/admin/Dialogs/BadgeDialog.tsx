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
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import supabaseClient from "../../services/supabaseClient";
import useBadges from "../../hooks/useBadges";

interface BadgeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BadgeDialog = ({ isOpen, onClose, onSuccess }: BadgeDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const { data: existingBadges = [] } = useBadges();

  useEffect(() => {
    if (!isOpen) {
      setLabel("");
    }
  }, [isOpen]);

  const capitalizeWords = (input: string) => {
    return input.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = capitalizeWords(e.target.value);
    setLabel(formatted);
  };

  const handleSubmit = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;

    const formatted = capitalizeWords(trimmed);

    const exists = existingBadges.some(
      (badge) => badge.label.toLowerCase() === formatted.toLowerCase()
    );

    if (exists) {
      toast({
        title: "Badge déjà existant",
        description: `Le badge "${formatted}" existe déjà.`,
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabaseClient
      .from("badges")
      .insert({ label: formatted });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Erreur lors de l'ajout",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Badge ajouté",
      description: `Le badge "${formatted}" a été ajouté avec succès.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay />
      <AlertDialogContent
        bg={useColorModeValue("white", "gray.900")}
        mx={{ base: 4, md: "auto" }}
        maxW={{ base: "100%", md: "lg" }}
      >
        <AlertDialogHeader>Ajouter un badge</AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          <FormControl>
            <FormLabel fontWeight="bold">Libellé</FormLabel>
            <Input
              value={label}
              onChange={handleChange}
              placeholder="Nouveau badge"
            />
          </FormControl>
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onClose}>
            Annuler
          </Button>
          <Button
            colorScheme="blue"
            ml={3}
            onClick={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={!label.trim()}
          >
            Ajouter
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BadgeDialog;
