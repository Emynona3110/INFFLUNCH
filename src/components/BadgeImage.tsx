import { Image, ImageProps } from "@chakra-ui/react";

const BadgeImage = (props: ImageProps) => {
  return (
    <Image
      transition="transform 0.2s ease"
      _hover={{
        transform: "scale(1.2)",
      }}
      willChange="transform"
      boxSize="24px"
      objectFit="contain"
      {...props}
    />
  );
};

export default BadgeImage;
