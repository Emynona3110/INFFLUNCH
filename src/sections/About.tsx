import {
  Box,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Stack,
} from "@chakra-ui/react";

const About = () => {
  return (
    <Box
      minH="calc(100vh - 200px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Stack
        spacing={6}
        maxW="2xl"
        width="100%"
        p={8}
        borderRadius="md"
        bg={useColorModeValue("white", "gray.900")}
        boxShadow="lg"
      >
        <VStack spacing={4} textAlign="left" align="stretch">
          <Heading size="lg" textAlign="center">
            À propos d’INFFLUNCH
          </Heading>

          <Text fontSize="md">
            <strong>INFFLUNCH</strong> est un projet personnel visant à offrir
            aux collaborateurs d’<strong>INFFLUX</strong> un espace centralisé
            pour découvrir les restaurants situés autour de l’entreprise, ainsi
            que partager leurs avis et recommandations.
          </Text>

          <Text fontSize="md">
            Le site est actuellement en cours de développement — de nouvelles
            fonctionnalités arriveront très bientôt !
          </Text>

          <Text fontSize="md">
            Si vous rencontrez un problème ou souhaitez faire une suggestion,
            n’hésitez pas à contacter <strong>LLS</strong> ou envoyer un mail à{" "}
            <a
              href="mailto:contact@infflunch.com"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              contact@infflunch.com
            </a>
            😉
          </Text>
        </VStack>
      </Stack>
    </Box>
  );
};

export default About;
