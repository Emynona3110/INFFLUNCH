import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";

export default function useChangePassword() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const changePassword = async (newPassword: string) => {
    setLoading(true);
    setMessage("");

    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setMessage("Mot de passe mis à jour avec succès.");
      // Redirection après succès (avec petit délai pour UX)
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    }
  };

  return {
    loading,
    message,
    changePassword,
    setMessage,
  };
}
