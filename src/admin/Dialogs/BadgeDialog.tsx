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

interface BadgeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: { id: number; label: string };
}

const BadgeDialog = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: BadgeDialogProps) => {
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

  const formatLabel = (value: string) =>
    value
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim();

  const handleSubmit = async () => {
    const formatted = formatLabel(label);

    if (!formatted) return;

    setIsSubmitting(true);

    if (initialData) {
      if (formatted === original) {
        toast({
          title: "Aucune modification",
          description: "Les données étaient identiques.",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabaseClient
        .from("badges")
        .update({ label: formatted })
        .eq("id", initialData.id);

      if (updateError) {
        toast({
          title: "Erreur",
          description: updateError.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      const { data: updated, error: fetchError } = await supabaseClient
        .from("badges")
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
        title: "Badge modifié",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onSuccess?.();
      onClose();
      return;
    }

    // Création : vérifier s’il existe déjà
    const { data: existing } = await supabaseClient
      .from("badges")
      .select("label")
      .eq("label", formatted);

    if (existing && existing.length > 0) {
      toast({
        title: "Badge existant",
        description: "Un badge avec ce nom existe déjà.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabaseClient
      .from("badges")
      .insert({ label: formatted });

    setIsSubmitting(false);

    if (insertError) {
      toast({
        title: "Erreur d'ajout",
        description: insertError.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Badge ajouté",
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
          {initialData ? "Modifier un badge" : "Ajouter un badge"}
        </AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          <FormControl>
            <FormLabel>Label</FormLabel>
            <Input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(formatLabel(e.target.value))}
              placeholder="ex: Local"
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

export default BadgeDialog;
