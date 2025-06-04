export type Badge = {
  id: number;
  label: string;
};

import useData from "./useData";
import supabaseClient from "../services/supabaseClient";

const useBadges = () => {
  let query = supabaseClient.from("tags").select();

  return useData<Badge>(query, []);
};

export default useBadges;
