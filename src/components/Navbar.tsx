import { useColorModeValue, HStack, Image, Text } from "@chakra-ui/react";
import darkLogo from "../assets/infflux.svg";
import lightLogo from "../assets/w-infflux.svg";

import ColorModeSwitch from "./ColorModeSwitch";

const Navbar = () => {
  return (
    <HStack justifyContent="space-between">
      <HStack spacing="5px">
        <Image src={useColorModeValue(darkLogo, lightLogo)} boxSize="32px" />
        <Text fontSize="20px" fontWeight="bold">
          INFFLUNCH
        </Text>
      </HStack>

      <ColorModeSwitch />
    </HStack>
  );
};

export default Navbar;
