import { useState } from "react";
import supabaseClient from "../services/supabaseClient";

const usePasswordReset = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const requestReset = async (email: string, onSuccess?: () => void) => {
    setIsLoading(true);
    setMessage("");
    setSuccess(false);

    console.log("Demande de réinitialisation pour :", email);

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-password`,
    });

    setIsLoading(false);

    if (error) {
      console.error("Erreur Supabase:", error.message);
      setMessage("Une erreur est survenue. Veuillez réessayer.");
    } else {
      console.log("Lien de réinitialisation envoyé avec succès !");
      setSuccess(true);
      setMessage(`Un lien de réinitialisation a été envoyé à ${email}.`);
      if (onSuccess) onSuccess();
    }
  };

  return { requestReset, isLoading, message, success };
};

export default usePasswordReset;
