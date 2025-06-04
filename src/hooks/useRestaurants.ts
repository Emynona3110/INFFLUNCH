export type Restaurant = {
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
};

import useData from "./useData";
import { RestaurantFilters } from "../App";
import { slugify } from "../utils/slugify";
import supabaseClient from "../services/supabaseClient";

const useRestaurants = (restaurantFilters: RestaurantFilters) => {
  const { id, slug, sortOrder, minRate, tags, searchText } = restaurantFilters;
  let query = supabaseClient.from("restaurants").select();

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

  let asc = sortOrder === "distance" ? true : false;
  query = query.order(sortOrder, { ascending: asc });
  const result = useData<Restaurant>(query, [restaurantFilters]);
  console.log("useRestaurants result:", result);
  return result;
};

export default useRestaurants;
