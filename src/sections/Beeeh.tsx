import { Box, Flex, Image, Text, useColorModeValue } from "@chakra-ui/react";
import { motion, useAnimation } from "framer-motion";
import { useRef } from "react";
import Layout from "../components/Layout";

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

    // Lancer animation de wiggle
    await controls.start({
      rotate: [0, 5, -5, 5, -5, 0],
      transition: { duration: 1 },
    });
  };

  const handleImageLoad = () => {
    // Animation d’arrivée depuis le haut
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    });
  };

  return (
    <Layout centerContent>
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
          initial={{ opacity: 0, y: -100 }}
          animate={controls}
          onClick={handleClick}
          onLoad={handleImageLoad}
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
    </Layout>
  );
};

export default Beeeh;
