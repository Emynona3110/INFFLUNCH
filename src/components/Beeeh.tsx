import { Box, Flex, Image, Text, useColorModeValue } from "@chakra-ui/react";
import { motion, useAnimation } from "framer-motion";
import { useRef } from "react";

const MotionImage = motion(Image);

const Beeeh = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const controls = useAnimation();

  const handleClick = async () => {
    // Jouer le son
    if (!audioRef.current) {
      audioRef.current = new Audio("/beeeh.mp3");
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});

    await controls.start({
      rotate: [0, 5, -5, 5, -5, 0],
      transition: { duration: 1 },
    });
  };

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap={6}
      minHeight="500px"
      textAlign="center"
      p={8}
    >
      <MotionImage
        src="/beeeh.jpg"
        alt="BeeeH"
        maxHeight="300px"
        borderRadius="lg"
        boxShadow="lg"
        cursor="pointer"
        animate={controls}
        onClick={handleClick}
      />

      <Box>
        <Text fontSize="2xl" fontWeight="bold">
          🐑 BEEEEH !
        </Text>
        <Text fontSize="md" color={useColorModeValue("gray.600", "gray.400")}>
          Rien à voir par ici...
        </Text>
      </Box>
    </Flex>
  );
};

export default Beeeh;
