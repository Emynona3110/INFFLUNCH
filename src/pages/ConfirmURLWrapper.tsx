import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Spinner, Center, Text, Box, Link } from "@chakra-ui/react";
import UpdatePassword from "./UpdatePassword";
import supabaseClient from "../services/supabaseClient";

const ConfirmURLWrapper = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );
    const confirmationUrl = hashParams.get("confirmation_url");

    if (!confirmationUrl) {
      setError("Lien de confirmation manquant.");
      setIsVerifying(false);
      return;
    }

    const url = new URL(confirmationUrl);
    const token_hash = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    if (!token_hash || !type) {
      setError("Le lien de confirmation est invalide.");
      setIsVerifying(false);
      return;
    }

    const verify = async () => {
      const { error } = await supabaseClient.auth.verifyOtp({
        token_hash,
        type: type as "invite" | "recovery" | "email_change" | "email",
      });

      if (error) {
        setError("Le lien est invalide ou expiré.");
      }

      setIsVerifying(false);
    };

    verify();
  }, [location]);

  if (isVerifying) {
    return (
      <Center h="100vh">
        <Spinner />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100vh" px={4}>
        <Box maxW="md" p={8} borderRadius="md" textAlign="center">
          <Text fontSize="lg" fontWeight="semibold">
            {error}
          </Text>
          <Link
            onClick={() => navigate("/login")}
            color="blue.500"
            fontSize="sm"
            textAlign="center"
          >
            /inscription à la connexion
          </Link>
        </Box>
      </Center>
    );
  }

  window.history.replaceState(null, "", window.location.pathname);

  return <UpdatePassword />;
};

export default ConfirmURLWrapper;
