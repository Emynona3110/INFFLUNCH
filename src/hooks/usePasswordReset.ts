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
      redirectTo: `${window.location.origin}/authentification`,
    });

    setIsLoading(false);

    if (error) {
      console.error("Erreur Supabase:", error.message);

      if (
        error.message.includes(
          "For security purposes, you can only request this after"
        )
      ) {
        setMessage(
          "Veuillez patienter quelques instants avant de redemander un nouveau lien."
        );
      } else {
        setMessage("Une erreur est survenue. Veuillez réessayer.");
      }
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
