import { Box } from "@chakra-ui/react";
import BadgeImage from "./BadgeImage";

interface BadgeButtonProps {
  label: string;
  src: string;
  isActive: boolean;
  onToggle: () => void;
}

const BadgeButton = ({ label, src, isActive, onToggle }: BadgeButtonProps) => {
  return (
    <Box
      onClick={onToggle}
      cursor="pointer"
      filter={isActive ? "none" : "grayscale(100%) brightness(0.8)"}
      title={label}
      transition="all 0.2s ease"
    >
      <BadgeImage src={src} alt={label} />
    </Box>
  );
};

export default BadgeButton;
