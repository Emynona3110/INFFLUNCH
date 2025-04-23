import restaurants from "../data/restaurants";

export interface Restaurant {
  id: number;
  name: string;
  image: string;
  rating: number | null;
  tags: string[];
  veggie: boolean;
  reviews: number;
}

const useRestaurants = () => ({
  data: restaurants,
  loading: false,
  error: null,
});

export default useRestaurants;
