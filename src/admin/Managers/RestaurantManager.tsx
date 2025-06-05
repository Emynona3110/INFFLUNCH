import { VStack } from "@chakra-ui/react";
import AdminTable from "../AdminTable";

export const RestaurantManager = () => {
  return (
    <VStack align="stretch" spacing={4}>
      <AdminTable
        tableName="restaurants"
        columns={[
          "id",
          "name",
          "address",
          "phone",
          "website",
          "badges",
          "tags",
          "image",
        ]}
      />
    </VStack>
  );
};

export default RestaurantManager;
