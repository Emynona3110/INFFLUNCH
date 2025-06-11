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
  phone: string;
  website: string;
};

import useData from "./useData";
import { slugify } from "../utils/slugify";
import supabaseClient from "../services/supabaseClient";
import { RestaurantFilters } from "../pages/UserPage";

const useRestaurants = (restaurantFilters: RestaurantFilters) => {
  const { id, slug, sortOrder, minRate, tags, badges, searchText } =
    restaurantFilters;

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

    if (badges.length > 0) {
      query = query.contains("badges", badges);
    }

    if (searchText !== "") {
      const slugifiedSearchText = slugify(searchText);
      query = query.or(
        `name.ilike.%${slugifiedSearchText}%,slug.ilike.%${slugifiedSearchText}%`
      );
    }
  }

  const asc = sortOrder === "distance";
  query = query.order(sortOrder, { ascending: asc });

  const result = useData<Restaurant>(query, [restaurantFilters]);
  return result;
};

export default useRestaurants;
