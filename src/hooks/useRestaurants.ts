export type Restaurant = {
  id: number;
  name: string;
  slug: string;
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

import useSupabaseQuery from "./useSupabaseQuery";
import { slugify } from "../utils/slugify";
import supabaseClient from "../services/supabaseClient";
import { RestaurantFilters } from "../pages/UserPage";

const useRestaurants = (restaurantFilters: RestaurantFilters) => {
  const { id, slug, sortOrder, minRate, tags, badges, searchText } =
    restaurantFilters;

  const buildQuery = () => {
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
    return query.order(sortOrder, { ascending: asc });
  };

  return useSupabaseQuery<Restaurant>(
    ["restaurants", restaurantFilters],
    buildQuery
  );
};

export default useRestaurants;
