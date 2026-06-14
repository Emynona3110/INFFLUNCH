import { useEffect, useState } from "react";
import supabaseClient from "../services/supabaseClient";

export default function useAuth() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        setIsAuthenticated(!!data.session);
        setError(null);
      } catch (err) {
        // Échec de contact avec Supabase (ex. projet en pause / réseau) :
        // on sort du loading pour ne pas bloquer l'UI sur un spinner infini.
        setIsAuthenticated(false);
        setError(
          err instanceof Error ? err.message : "Erreur d'authentification"
        );
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return { isAuthenticated, loading, error };
}
