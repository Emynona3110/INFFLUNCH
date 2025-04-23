import { Icon, useColorModeValue } from "@chakra-ui/react";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { useState } from "react";

const redColor = "#ff6b81";

interface LikeButtonProps {
  liked?: boolean;
  size?: number;
  onClick: (liked: boolean) => void;
}

const LikeButton = ({ liked = false, size = 5, onClick }: LikeButtonProps) => {
  const [isLiked, setIsLiked] = useState(liked);
  const emptyColor = useColorModeValue("gray.500", "gray.400");

  const toggle = () => {
    setIsLiked(!isLiked);
    onClick(isLiked);
  };

  return isLiked ? (
    <Icon
      as={IoMdHeart}
      color={redColor}
      boxSize={size}
      onClick={toggle}
      cursor="pointer"
    />
  ) : (
    <Icon
      as={IoMdHeartEmpty}
      color={emptyColor}
      boxSize={size}
      onClick={toggle}
      cursor="pointer"
    />
  );
};

export default LikeButton;
