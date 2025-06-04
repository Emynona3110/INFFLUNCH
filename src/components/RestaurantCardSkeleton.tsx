import {
  Box,
  Card,
  CardBody,
  HStack,
  Text,
  VStack,
  useColorModeValue,
  Skeleton,
  SkeletonText,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import RestaurantRating from "./StarRating";

const invisibleChar = "‎ ";

const tagPlaceholder = (n: number) => {
  return invisibleChar.repeat(n);
};

const skeletonTags = [
  tagPlaceholder(10),
  tagPlaceholder(15),
  tagPlaceholder(8),
];

const RestaurantCard = () => {
  return (
    <Card borderRadius="10" overflow="hidden" width="100%">
      <Skeleton
        height="200px"
        overflow="hidden"
        position="relative"
        fadeDuration={1}
      />

      <CardBody>
        <VStack alignItems="left" spacing={2}>
          <SkeletonText noOfLines={1} skeletonHeight="5" fadeDuration={1} />

          <HStack
            verticalAlign="middle"
            color={useColorModeValue("gray.500", "gray.400")}
          >
            <RestaurantRating rating={0} />
            <SkeletonText fontSize="md" fadeDuration={1} />
          </HStack>

          <Wrap spacing={2} marginTop={2}>
            {skeletonTags.map((tag, index) => (
              <WrapItem key={index}>
                <Box
                  paddingX={3}
                  paddingY={1}
                  borderRadius="md"
                  backgroundColor={useColorModeValue("gray.100", "gray.600")}
                >
                  <Text>{tag}</Text>
                </Box>
              </WrapItem>
            ))}
          </Wrap>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default RestaurantCard;
