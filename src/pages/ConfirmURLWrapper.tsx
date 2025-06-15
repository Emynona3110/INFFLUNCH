import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Spinner, Center } from "@chakra-ui/react";
import UpdatePassword from "./UpdatePassword";
import supabaseClient from "../services/supabaseClient";
import ExpiredLink from "./ExpiredLink";

const ConfirmURLWrapper = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [expiredEmail, setExpiredEmail] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );
    const confirmationUrl = hashParams.get("confirmation_url");
    const email = hashParams.get("email");

    if (!confirmationUrl) {
      setExpiredEmail(email || "");
      setIsVerifying(false);
      return;
    }

    const url = new URL(confirmationUrl);
    const token_hash = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    if (!token_hash || !type) {
      setExpiredEmail(email || "");
      setIsVerifying(false);
      return;
    }

    const verify = async () => {
      const { error } = await supabaseClient.auth.verifyOtp({
        token_hash,
        type: type as "invite" | "recovery" | "email_change" | "email",
      });

      if (error) {
        if (type === "invite" || type === "recovery") {
          setExpiredEmail(email || "");
          setIsVerifying(false);
          return;
        }
        setIsVerifying(false);
        return;
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

  if (expiredEmail !== null) {
    return <ExpiredLink email={expiredEmail} />;
  }

  window.history.replaceState(null, "", window.location.pathname);

  return <UpdatePassword />;
};

export default ConfirmURLWrapper;
