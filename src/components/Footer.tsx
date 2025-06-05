import { Box, useColorModeValue } from "@chakra-ui/react";

export const Footer = () => {
  return (
    <Box
      as="footer"
      mt={10}
      py={4}
      textAlign="center"
      fontSize="sm"
      color={useColorModeValue("gray.600", "gray.400")}
      borderTop="1px solid"
      borderColor={useColorModeValue("gray.200", "gray.700")}
    >
      © 2025 Infflunch — Tous droits réservés.
    </Box>
  );
};

export default Footer;
