import type { TagCategory } from "../services/tagCategories";

export type Tag = {
  id: number;
  label: string;
  /** origine · caracteristique · specialite (voir `services/tagCategories`). */
  category: TagCategory;
};

import useSupabaseQuery from "./useSupabaseQuery";
import supabaseClient from "../services/supabaseClient";

const useTags = () =>
  useSupabaseQuery<Tag>(["tags"], () =>
    supabaseClient.from("tags").select().order("label")
  );

export default useTags;
