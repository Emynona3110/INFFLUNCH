export type Tag = {
  id: number;
  label: string;
};

import useData from "./useData";
import supabaseClient from "../services/supabaseClient";

const useTags = () => {
  const query = supabaseClient.from("tags").select().order("label");
  const result = useData<Tag>(query, []);

  return result;
};

export default useTags;
