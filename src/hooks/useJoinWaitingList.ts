import { useState } from "react";
import supabaseClient from "../services/supabaseClient";

const useJoinWaitingList = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  const join = async (email: string) => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    setMessage("");

    // Vérifie si l'email est déjà présent
    const { data, error: checkError } = await supabaseClient
      .from("waiting_list")
      .select("email")
      .eq("email", email);

    if (checkError) {
      setError("Erreur lors de la vérification.");
      setMessage(checkError.message);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      // Insertion si l'e-mail n'existe pas
      const { error: insertError } = await supabaseClient
        .from("waiting_list")
        .insert({ email });

      if (insertError) {
        setError("Erreur lors de l'inscription.");
        setMessage(insertError.message);
        setLoading(false);
        return;
      }
    }

    setSuccess(true);
    setMessage("Votre adresse a bien été enregistrée.");
    setLoading(false);
  };

  return {
    join,
    loading,
    success,
    error,
    message,
  };
};

export default useJoinWaitingList;
