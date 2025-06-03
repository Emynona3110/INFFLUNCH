export interface Restaurant {
  id: number;
  name: string;
  image: string;
  distance: string;
  distanceLabel: string;
  rating: number | null;
  tags: string[];
  badges: string[];
  reviews: number;
  address: string;
}

import { createClient } from "@supabase/supabase-js";
import useData from "./useData";
import { RestaurantFilters } from "../App";
import { slugify } from "../utils/slugify";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const useRestaurants = (restaurantFilters: RestaurantFilters) => {
  const { id, slug, sortOrder, minRate, tags, searchText } = restaurantFilters;
  console.log("useRestaurants called with query:", restaurantFilters);
  let query = supabase.from("restaurants").select();

  if (id) {
    query = query.eq("id", id);
  } else if (slug) {
    query = query.eq("slug", slug);
  } else {
    if (minRate > 0) {
      query = query.gte("rating", minRate);
    }

    if (tags.length > 0) {
      query = query.overlaps("tags", tags);
    }

    if (searchText !== "") {
      let slugifiedSearchText = slugify(searchText);
      query = query.or(
        `name.like.%${slugifiedSearchText}%,slug.like.%${slugifiedSearchText}%`
      );
    }
  }

  let asc = sortOrder === "created_at";

  query = query.order(sortOrder, { ascending: asc });

  return useData<Restaurant>(query, [restaurantFilters]);
};

export default useRestaurants;
