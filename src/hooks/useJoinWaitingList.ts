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

    // Le dédoublonnage est garanti par une contrainte UNIQUE en base : on insère
    // directement (la lecture de waiting_list est désormais réservée aux admins).
    const { error: insertError } = await supabaseClient
      .from("waiting_list")
      .insert({ email });

    if (insertError) {
      // 23505 = violation de contrainte unique => email déjà inscrit
      if (insertError.code === "23505") {
        setSuccess(true);
        setMessage("Cette adresse est déjà enregistrée.");
      } else {
        setError("Erreur lors de l'inscription.");
        setMessage(insertError.message);
      }
      setLoading(false);
      return;
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
