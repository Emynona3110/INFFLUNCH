export type Tag = {
  id: number;
  label: string;
};

import useSupabaseQuery from "./useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

const useTags = () =>
  useSupabaseQuery<Tag>(["tags"], () =>
    supabaseClient.from("tags").select().order("label")
  );

export default useTags;
