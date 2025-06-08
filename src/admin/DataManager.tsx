import { useState } from "react";
import { Button, Flex, Heading, HStack, VStack } from "@chakra-ui/react";
import AdminTable from "./AdminTable";
import { AdminSection } from "../services/adminSections";
import BadgeDialog from "./Dialogs/BadgeDialog";
import TagDialog from "./Dialogs/TagDialog";
import RestaurantDialog from "./Dialogs/RestaurantDialog";

export interface DataManagerProps {
  section: AdminSection;
}

const DataManager = ({ section }: DataManagerProps) => {
  const { label, tableName, columns } = section;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setReloadKey((k) => k + 1);
  };

  const renderDialog = () => {
    switch (tableName) {
      case "tags":
        return (
          <TagDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={handleSuccess}
          />
        );
      case "badges":
        return (
          <BadgeDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={handleSuccess}
          />
        );
      case "restaurants":
        return (
          <RestaurantDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={handleSuccess}
          />
        );
      default:
        return null;
    }
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
            <>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                variant="ghost"
              >
                Ajouter +
              </Button>
              {renderDialog()}
            </>
          )}
        </HStack>

        <AdminTable key={reloadKey} tableName={tableName} columns={columns} />
      </VStack>
    </Flex>
  );
};

export default DataManager;
