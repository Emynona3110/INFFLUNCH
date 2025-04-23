import { Icon, useColorModeValue } from "@chakra-ui/react";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { useState } from "react";

interface LikeButtonProps {
  liked?: boolean;
  onClick: (liked: boolean) => void;
}

const LikeButton = ({ liked = false, onClick }: LikeButtonProps) => {
  const redColor = "#ff6b81";
  const emptyColor = useColorModeValue("gray.300", "gray.600");
  const size = 8;

  const [isLiked, setIsLiked] = useState(liked);

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
