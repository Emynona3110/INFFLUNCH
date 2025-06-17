import { Box, HStack, Text, useColorModeValue } from "@chakra-ui/react";

interface TagsListProps {
  tags: string[];
}

const TagsList = ({ tags }: TagsListProps) => {
  const tagBg = useColorModeValue("gray.100", "gray.600");

  const visibleTags = tags.slice(0, 2);
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <HStack spacing={2} mt={2} overflow="hidden" whiteSpace="nowrap">
      {visibleTags.map((tag) => (
        <Box
          key={tag}
          px={3}
          py={1}
          borderRadius="50px"
          backgroundColor={tagBg}
          flexShrink={0}
        >
          <Text>{tag}</Text>
        </Box>
      ))}

      {hiddenCount > 0 && (
        <Text fontSize="sm" color="gray.500" flexShrink={0}>
          +{hiddenCount}
        </Text>
      )}
    </HStack>
  );
};

export default TagsList;
