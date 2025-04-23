import { useColorModeValue, Box, Text, Wrap, WrapItem } from "@chakra-ui/react";

interface TagsListProps {
  tags: string[];
}

const TagsList = ({ tags }: TagsListProps) => {
  return (
    <Wrap spacing={2} marginTop={2}>
      {tags.map((tag) => (
        <WrapItem key={tag}>
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
  );
};

export default TagsList;

// backgroundColor: color || "#f0f0f0",
//               padding: "5px 10px",
//               borderRadius: "5px",
//               fontSize: "14px",
