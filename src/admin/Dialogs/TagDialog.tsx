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
import useTags from "../../hooks/useTags";

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TagDialog = ({ isOpen, onClose, onSuccess }: TagDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const { data: existingTags = [] } = useTags();

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

    const exists = existingTags.some(
      (tag) => tag.label.toLowerCase() === formatted.toLowerCase()
    );

    if (exists) {
      toast({
        title: "Tag déjà existant",
        description: `Le tag "${formatted}" existe déjà.`,
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabaseClient
      .from("tags")
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
      title: "Tag ajouté",
      description: `Le tag "${formatted}" a été ajouté avec succès.`,
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
        <AlertDialogHeader>Ajouter un tag</AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          <FormControl>
            <FormLabel fontWeight="bold">Libellé</FormLabel>
            <Input
              value={label}
              onChange={handleChange}
              placeholder="Nouveau tag"
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

export default TagDialog;
