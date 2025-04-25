import {
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  Text,
  Box,
  useColorModeValue,
} from "@chakra-ui/react";
import { useState } from "react";
import StarRating from "./StarRating";

const MinRateInput = () => {
  const [minRate, setMinRate] = useState(0);

  return (
    <HStack
      px={4}
      py={2}
      borderRadius="md"
      width="auto"
      bg={useColorModeValue("gray.100", "whiteAlpha.200")}
    >
      <Box minW="60px" textAlign="center">
        <Text fontSize="md">Note minimum</Text>
        <StarRating rating={minRate} />
      </Box>
      <NumberInput
        value={minRate}
        onChange={(_, valueNumber) => setMinRate(valueNumber)}
        min={0}
        max={5}
        step={0.5}
        precision={1}
        width="80px"
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
    </HStack>
  );
};

export default MinRateInput;
