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

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: { id: number; label: string };
}

const TagDialog = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: TagDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [original, setOriginal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const formatted = initialData?.label ? formatLabel(initialData.label) : "";
    setLabel(formatted);
    setOriginal(formatted);

    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, initialData]);

  const formatLabel = (input: string) =>
    input
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
      .trim();

  const handleSubmit = async () => {
    const formatted = formatLabel(label);

    if (!formatted) return;

    if (initialData) {
      if (formatted === original) {
        toast({
          title: "Aucune modification",
          description: "Les données étaient identiques.",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      setIsSubmitting(true);

      const { error: updateError } = await supabaseClient
        .from("tags")
        .update({ label: formatted })
        .eq("id", initialData.id);

      if (updateError) {
        setIsSubmitting(false);
        toast({
          title: "Erreur",
          description: updateError.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const { data: updated, error: fetchError } = await supabaseClient
        .from("tags")
        .select("label")
        .eq("id", initialData.id)
        .maybeSingle();

      setIsSubmitting(false);

      if (fetchError || !updated || formatLabel(updated.label) === original) {
        toast({
          title: "Aucune modification détectée",
          description: "L'enregistrement n'a pas changé dans la base.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      toast({
        title: "Tag modifié",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onSuccess?.();
      onClose();
      return;
    }

    // Ajout d’un nouveau tag
    setIsSubmitting(true);

    const { error: insertError } = await supabaseClient
      .from("tags")
      .insert({ label: formatted });

    setIsSubmitting(false);

    if (insertError) {
      toast({
        title: "Erreur",
        description: insertError.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Tag ajouté",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    onSuccess?.();
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
      <AlertDialogContent bg={useColorModeValue("white", "gray.900")}>
        <AlertDialogHeader>
          {initialData ? "Modifier un tag" : "Ajouter un tag"}
        </AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          <FormControl>
            <FormLabel>Label</FormLabel>
            <Input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(formatLabel(e.target.value))}
              placeholder="ex: Végétarien"
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
            isDisabled={
              !label.trim() || (initialData && formatLabel(label) === original)
            }
          >
            {initialData ? "Modifier" : "Ajouter"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TagDialog;
