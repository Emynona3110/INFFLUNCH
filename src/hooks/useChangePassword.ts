import { useState } from "react";
import supabaseClient from "../services/supabaseClient";

const useChangePassword = (onSuccess: () => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updatePassword = async (newPassword: string) => {
    setIsLoading(true);
    setMessage("");

    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (error) {
      setMessage("Une erreur est survenue. Veuillez réessayer.");
    } else {
      setMessage("Mot de passe mis à jour avec succès.");
      setTimeout(onSuccess, 1500);
    }
  };

  return { updatePassword, isLoading, message };
};

export default useChangePassword;
