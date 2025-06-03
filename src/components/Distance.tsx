import { Box, Text } from "@chakra-ui/react";

const DistanceToCompany = ({ distanceLabel }: { distanceLabel: string }) => {
  return (
    <Box paddingY={1} paddingX={2} borderRadius="md">
      <Text fontSize="sm">{distanceLabel}</Text>
    </Box>
  );
};

export default DistanceToCompany;
