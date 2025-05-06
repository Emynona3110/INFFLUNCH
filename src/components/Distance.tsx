import { Box, Text } from "@chakra-ui/react";

const DistanceToCompany = ({ distance }: { distance: string }) => {
  return (
    <Box paddingY={1} paddingX={2} borderRadius="md">
      <Text fontSize="sm">{distance}</Text>
    </Box>
  );
};

export default DistanceToCompany;
