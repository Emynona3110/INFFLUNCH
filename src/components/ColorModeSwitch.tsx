import {
  useColorModeValue,
  HStack,
  useColorMode,
  Button,
} from "@chakra-ui/react";
import { BsMoonFill, BsSunFill } from "react-icons/bs";

const ColorModeSwitch = () => {
  const { toggleColorMode } = useColorMode();

  return (
    <HStack>
      <Button
        w="30px"
        h="40px"
        color="gray.500"
        padding="5px"
        variant="ghost"
        onClick={toggleColorMode}
      >
        {useColorModeValue(<BsSunFill size="24px" />, <BsMoonFill />)}
      </Button>
    </HStack>
  );
};

export default ColorModeSwitch;
