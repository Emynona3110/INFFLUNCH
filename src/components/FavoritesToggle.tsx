import { IconButton, useColorModeValue } from "@chakra-ui/react";
import { FaHeart, FaRegHeart } from "react-icons/fa";

interface FavoritesToggleProps {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}

const FavoritesToggle = ({ isChecked, onChange }: FavoritesToggleProps) => {
  const heartColor = "#ff6b81"; // couleur personnalisée
  const hoverBg = useColorModeValue("gray.100", "gray.700");

  return (
    <IconButton
      aria-label="Afficher uniquement les favoris"
      icon={isChecked ? <FaHeart /> : <FaRegHeart />}
      color={isChecked ? heartColor : undefined}
      variant="ghost"
      size="md"
      onClick={() => onChange(!isChecked)}
      _hover={{
        bg: hoverBg,
        color: heartColor,
      }}
      isRound
    />
  );
};

export default FavoritesToggle;
