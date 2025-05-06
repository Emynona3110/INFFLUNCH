import restaurants from "../data/restaurants";

export interface Restaurant {
  id: number;
  name: string;
  image: string;
  distance: string;
  rating: number | null;
  tags: string[];
  badges: string[];
  reviews: number;
  address: string;
}

const useRestaurants = () => ({
  data: restaurants,
  loading: false,
  error: null,
});

export default useRestaurants;
