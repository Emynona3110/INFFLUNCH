import {
  useColorModeValue,
  HStack,
  useColorMode,
  Button,
  Icon,
} from "@chakra-ui/react";
import { BsMoonFill, BsSunFill } from "react-icons/bs";

const ColorModeSwitch = () => {
  const { toggleColorMode } = useColorMode();

  return (
    <HStack>
      <Button
        w="30px"
        h="40px"
        padding="5px"
        variant="ghost"
        onClick={toggleColorMode}
      >
        <Icon
          as={useColorModeValue(BsMoonFill, BsSunFill)}
          boxSize={useColorModeValue("20px", "24px")}
          color={useColorModeValue("gray.400", "gray.500")}
        />
        {/* {useColorModeValue(<BsSunFill size="24px" />, <BsMoonFill />)} */}
      </Button>
    </HStack>
  );
};

export default ColorModeSwitch;
