export type Badge = {
  id: number;
  label: string;
};

import useData from "./useData";
import supabaseClient from "../services/supabaseClient";

const useBadges = () => {
  const query = supabaseClient.from("badges").select().order("label");

  return useData<Badge>(query, []);
};

export default useBadges;
