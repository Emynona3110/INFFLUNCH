import useData from "./useData";
import supabaseClient from "../services/supabaseClient";

const useTopRated = () => {
  let query = supabaseClient.from("restaurants").select("id");

  query = query
    .order("rating", { ascending: false })
    .neq("reviews", 0)
    .limit(3);

  const result = useData(query, []);
  // console.log("useTopRated result:", result);
  return result;
};

export default useTopRated;
