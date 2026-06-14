export type Badge = {
  id: number;
  label: string;
};

import useSupabaseQuery from "./useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

const useBadges = () =>
  useSupabaseQuery<Badge>(["badges"], () =>
    supabaseClient.from("badges").select().order("label")
  );

export default useBadges;
