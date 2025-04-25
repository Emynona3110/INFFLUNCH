import {
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Box,
  useColorModeValue,
  Flex,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import StarRating from "./StarRating";

const MinRateInput = () => {
  const [minRate, setMinRate] = useState(0);

  return (
    <Flex
      bg={useColorModeValue("gray.100", "whiteAlpha.200")}
      px={4}
      py={2}
      borderRadius="md"
      align="center"
      width="fit-content"
      gap={3}
    >
      {/* Bloc étoile */}
      <Box textAlign="center">
        <Text fontSize="md" fontWeight="medium" mb="2px">
          Note minimale
        </Text>
        <StarRating rating={minRate} size="16px" />
      </Box>

      {/* Bloc saisie */}
      <NumberInput
        value={minRate}
        onChange={(_, valueNumber) => setMinRate(valueNumber)}
        min={0}
        max={5}
        step={0.5}
        precision={1}
        width="auto"
        size="md"
        focusBorderColor="inherit"
        clampValueOnBlur
        keepWithinRange
      >
        <NumberInputField textAlign="center" />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </Flex>
  );
};

export default MinRateInput;
