import { useEffect, useState } from "react";
import useSession from "./useSession";
import supabaseClient from "../services/supabaseClient";

interface Favorite {
  id: string;
  user_id: string;
  restaurant_id: number;
  created_at: string;
}

const useFavorites = () => {
  const { sessionData, loading: sessionLoading } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const fetchFavorites = async () => {
    if (!sessionData?.user?.id) return;

    const { data, error } = await supabaseClient
      .from("favorites")
      .select("*")
      .eq("user_id", sessionData.user.id);

    if (error) {
      setError(error.message);
      setFavorites([]);
    } else {
      setFavorites(data);
    }

    setLoading(false);
  };

  const addFavorite = async (restaurantId: number) => {
    const { error } = await supabaseClient.from("favorites").insert({
      user_id: sessionData?.user?.id,
      restaurant_id: restaurantId,
    });
    if (error) throw new Error(error.message);
    setRefreshIndex((i) => i + 1);
  };

  const removeFavorite = async (restaurantId: number) => {
    const { error } = await supabaseClient.from("favorites").delete().match({
      user_id: sessionData?.user?.id,
      restaurant_id: restaurantId,
    });
    if (error) throw new Error(error.message);
    setRefreshIndex((i) => i + 1);
  };

  useEffect(() => {
    if (!sessionLoading && sessionData?.user?.id) {
      fetchFavorites();
    }
  }, [sessionLoading, sessionData?.user?.id, refreshIndex]);

  useEffect(() => {
    const handler = () => setRefreshIndex((i) => i + 1);
    window.addEventListener("favorites:updated", handler);
    return () => window.removeEventListener("favorites:updated", handler);
  }, []);

  return {
    favorites,
    restaurantIds: favorites.map((f) => f.restaurant_id),
    loading,
    error,
    refreshFavorites: fetchFavorites,
    addFavorite,
    removeFavorite,
  };
};

export default useFavorites;
