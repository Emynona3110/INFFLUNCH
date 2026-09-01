import useRestaurants from "@/hooks/useRestaurants";
import { defaultRestaurantFilters } from "@/pages/UserPage";

/**
 * Charge la liste des restaurants SANS filtre dès la connexion et la garde
 * montée pour toute la session (cf. `useRestaurants` : cette requête-là est en
 * `staleTime`/`gcTime` infinis). Vider les filtres ou revenir sur l'onglet
 * Restaurants réaffiche alors la liste sans nouvelle requête ; les mises à jour
 * passent par les invalidations explicites de `["restaurants"]`.
 */
const RestaurantsPrefetch = () => {
  useRestaurants(defaultRestaurantFilters);
  return null;
};

export default RestaurantsPrefetch;
