import { Box, Text } from "@chakra-ui/react";
import useLocations from "../hooks/useLocations";

const DistanceToCompany = ({ address }: { address: string }) => {
  const location = useLocations(address);

  return location ? (
    <Box paddingY={1} paddingX={2} borderRadius="md">
      <Text fontSize="sm">{location.formattedDistance}</Text>
    </Box>
  ) : null;
};

export default DistanceToCompany;
