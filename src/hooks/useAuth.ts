import { useEffect, useState } from "react";
import supabaseClient from "../services/supabaseClient";

export default function useAuth() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      setIsAuthenticated(!!data.session);
      setLoading(false);
    };

    checkSession();

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return { isAuthenticated, loading };
}
