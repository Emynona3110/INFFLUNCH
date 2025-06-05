import { VStack } from "@chakra-ui/react";
import AdminTable from "./AdminTable";

export const BadgeManager = () => {
  return (
    <VStack align="stretch" spacing={4}>
      <AdminTable tableName="badges" />
    </VStack>
  );
};

export default BadgeManager;
