import { useState } from "react";
import { Button, Flex, Heading, HStack, VStack } from "@chakra-ui/react";
import AdminTable from "./AdminTable";
import { AdminSection } from "../pages/adminSections";
import DataDialog from "./DataDialog";

export interface DataManagerProps {
  section: AdminSection;
}

const DataManager = ({ section }: DataManagerProps) => {
  const { label, tableName, columns } = section;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            variant={"ghost"}
          >
            Ajouter +
          </Button>
        </HStack>

        <AdminTable tableName={tableName} columns={columns} />
      </VStack>

      <DataDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        tableName={tableName}
        columns={columns}
        onSuccess={() => {
          // Optionnel : tu peux rafraîchir les données ici si besoin
        }}
      />
    </Flex>
  );
};

export default DataManager;
