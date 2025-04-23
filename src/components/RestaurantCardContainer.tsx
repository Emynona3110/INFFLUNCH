import { Box } from "@chakra-ui/react";
import { ReactNode } from "react";

interface RestaurantCardContainerProps {
  children: ReactNode;
}

const RestaurantCardContainer = ({
  children,
}: RestaurantCardContainerProps) => {
  return (
    <Box
      borderRadius="10"
      overflow="hidden"
      width="100%"
      transition="box-shadow 0.3s ease-in-out"
      border="1px solid"
      borderColor="gray.200"
      boxShadow="sm"
      _hover={{
        boxShadow: "md",
      }}
    >
      {children}
    </Box>
  );
};

export default RestaurantCardContainer;
