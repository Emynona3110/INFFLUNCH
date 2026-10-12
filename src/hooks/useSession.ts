import { useEffect, useState } from "react";
import supabaseClient from "../services/supabaseClient";
import { Session } from "@supabase/supabase-js";

/**
 * Session partagée par toutes les instances du hook. `getSession()` étant
 * asynchrone, chaque montage repartait sinon de `null` puis basculait une fois
 * la session lue : `isAdmin` passait de false à true, la clé de requête des
 * restaurants (qui le contient) changeait, et une requête repartait juste après
 * l'affichage — d'où une « latence » alors que les données étaient en cache.
 * Avec ce cache module, un remontage démarre avec la session déjà connue.
 */
let cachedSession: Session | null = null;
let sessionResolved = false;

const useSession = () => {
  const [sessionData, setSessionData] = useState<Session | null>(cachedSession);
  const [loading, setLoading] = useState(!sessionResolved);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSession = async () => {
      const { data, error } = await supabaseClient.auth.getSession();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        cachedSession = null;
        setSessionData(null);
      } else {
        cachedSession = data.session;
        setSessionData(data.session);
        setError(null);
      }
      sessionResolved = true;
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      cachedSession = session;
      sessionResolved = true;
      setSessionData(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      setError(error.message);
    } else {
      cachedSession = null;
      setSessionData(null);
      setError(null);
    }

    setLoading(false);
    // Rendu à l'appelant : l'état `error` n'est pas encore à jour juste après
    // l'await, il ne peut pas s'y fier pour afficher l'échec.
    return error?.message ?? null;
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
