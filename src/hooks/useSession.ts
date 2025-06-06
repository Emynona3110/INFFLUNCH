import { useEffect, useState } from "react";
import supabaseClient from "../services/supabaseClient";
import { Session } from "@supabase/supabase-js";

const useSession = () => {
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        setError(error.message);
        setSessionData(null);
      } else {
        setSessionData(data.session);
        setError(null);
      }
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSessionData(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      setError(error.message);
    } else {
      setSessionData(null);
      setError(null);
    }

    setLoading(false);
  };

  return {
    sessionData,
    isAuthenticated: !!sessionData,
    loading,
    error,
    signOut,
  };
};

export default useSession;
