import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import supabaseClient from "../services/supabaseClient";

interface DataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  columns: string[];
  initialData?: Record<string, any>;
  onSuccess?: () => void;
}

const DataDialog = ({
  isOpen,
  onClose,
  tableName,
  columns,
  initialData,
  onSuccess,
}: DataDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      const defaultValues: Record<string, string> = {};
      columns.forEach((col) => {
        if (col !== "id") defaultValues[col] = "";
      });
      setFormData(defaultValues);
    }
  }, [initialData, columns]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const table = supabaseClient.from(tableName);
    const payload = { ...formData };
    delete payload.id;

    const { error } = initialData
      ? await table.update(payload).eq("id", initialData.id)
      : await table.insert(payload);

    setIsSubmitting(false);
    if (!error && onSuccess) onSuccess();
    onClose();
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
      <AlertDialogContent bg={useColorModeValue("white", "gray.900")}>
        <AlertDialogHeader>
          {initialData ? "Modifier l'entrée" : "Ajouter une entrée"}
        </AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          {columns
            .filter((col) => col !== "id")
            .map((field) => (
              <Box key={field} mb={4}>
                <FormControl>
                  <FormLabel textTransform="capitalize">{field}</FormLabel>
                  <Input
                    value={formData[field] || ""}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder={`Entrez ${field}`}
                  />
                </FormControl>
              </Box>
            ))}
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
          >
            {initialData ? "Modifier" : "Ajouter"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DataDialog;
