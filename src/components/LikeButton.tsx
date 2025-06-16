import { useColorModeValue, Box, Icon } from "@chakra-ui/react";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface LikeButtonProps {
  liked?: boolean;
  onClick: (liked: boolean) => void;
}

const MotionBox = motion(Box);

const LikeButton = ({ liked = false, onClick }: LikeButtonProps) => {
  const redColor = "#ff6b81";
  const emptyColor = useColorModeValue("gray.300", "gray.600");
  const size = 8;

  const [localLiked, setLocalLiked] = useState(liked);

  const handleClick = () => {
    const newLiked = !localLiked;
    setLocalLiked(newLiked);
    onClick(newLiked);
  };

  return (
    <Box
      position="relative"
      boxSize={size}
      cursor="pointer"
      onClick={handleClick}
      userSelect="none" // 👈 bloque la sélection au double-clic
    >
      {/* Cœur vide en fond */}
      <Box position="absolute" top="0" left="0" boxSize={size}>
        <Icon as={IoMdHeartEmpty} color={emptyColor} boxSize={size} />
      </Box>

      {/* Cœur plein animé */}
      <AnimatePresence mode="wait">
        {localLiked && (
          <MotionBox
            key="full-heart"
            position="absolute"
            top="0"
            left="0"
            boxSize={size}
            initial={{ scale: 0 }}
            animate={{ scale: 1.01 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <IoMdHeart color={redColor} size="100%" />
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default LikeButton;
