import {
  useColorModeValue,
  IconButton,
  useColorMode,
  Icon,
} from "@chakra-ui/react";
import { BsMoonFill, BsSunFill } from "react-icons/bs";

const ColorModeSwitch = () => {
  const { toggleColorMode } = useColorMode();

  const icon = useColorModeValue(
    <Icon as={BsMoonFill} boxSize="18px" color="gray.400" />, // lune plus petite
    <Icon as={BsSunFill} boxSize="22px" color="gray.500" />
  );

  return (
    <IconButton
      aria-label="Changer le thème"
      onClick={toggleColorMode}
      icon={icon}
      variant="ghost"
      size="md"
      isRound
      _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
    />
  );
};

export default ColorModeSwitch;
