import {
  Button,
  Flex,
  Heading,
  HStack,
  VStack,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogCloseButton,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import AdminTable from "./AdminTable";
import { AdminSection } from "../services/adminSections";
import supabaseClient from "../services/supabaseClient";
import BadgeDialog from "./Dialogs/BadgeDialog";
import RestaurantDialog from "./Dialogs/RestaurantDialog";
import TagDialog from "./Dialogs/TagDialog";
export interface DataManagerProps {
  section: AdminSection;
}

const DataManager = ({ section }: DataManagerProps) => {
  const { label, tableName, columns } = section;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const toast = useToast();

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditData(null);
    setReloadKey((k) => k + 1);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;

    const { error: deleteError } = await supabaseClient
      .from(tableName)
      .delete()
      .eq("id", deleteId);

    const { data: checkData } = await supabaseClient
      .from(tableName)
      .select("id")
      .eq("id", deleteId);

    if (deleteError || (checkData && checkData.length > 0)) {
      toast({
        title: "Erreur lors de la suppression",
        description:
          deleteError?.message || "L'entrée n'a pas pu être supprimée.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Suppression réussie",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      handleSuccess();
    }

    setDeleteId(null);
  };

  const renderDialog = () => {
    const commonProps = {
      isOpen: isDialogOpen,
      onClose: () => {
        setIsDialogOpen(false);
        setEditData(null);
      },
      onSuccess: handleSuccess,
      initialData: editData,
    };

    if (tableName === "tags") return <TagDialog {...commonProps} />;
    if (tableName === "badges") return <BadgeDialog {...commonProps} />;
    if (tableName === "restaurants")
      return <RestaurantDialog {...commonProps} />;

    return null;
  };

  return (
    <Flex flexDirection="column" height="100%">
      <VStack
        align="stretch"
        spacing={4}
        p={4}
        height="100%"
        maxHeight="calc(100vh - 60px)"
      >
        <HStack justifyContent="space-between">
          <Heading size="md">{`Gestion des ${label.toLowerCase()}`}</Heading>
          {tableName !== "users" && (
            <Button
              colorScheme="blue"
              size="sm"
              onClick={() => {
                setEditData(null);
                setIsDialogOpen(true);
              }}
              variant={"ghost"}
            >
              Ajouter +
            </Button>
          )}
        </HStack>

        <AdminTable
          key={reloadKey}
          tableName={tableName}
          columns={columns}
          onEdit={(data) => {
            setEditData(data);
            setIsDialogOpen(true);
          }}
          onDelete={(id) => setDeleteId(id)}
        />
      </VStack>

      {renderDialog()}

      {/* AlertDialog pour suppression */}
      <AlertDialog
        isOpen={deleteId !== null}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteId(null)}
        isCentered
      >
        <AlertDialogOverlay />
        <AlertDialogContent>
          <AlertDialogHeader>Confirmer la suppression</AlertDialogHeader>
          <AlertDialogCloseButton />
          <AlertDialogBody>
            Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action est
            irréversible.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={() => setDeleteId(null)}>
              Annuler
            </Button>
            <Button colorScheme="red" ml={3} onClick={confirmDelete}>
              Supprimer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Flex>
  );
};

export default DataManager;
