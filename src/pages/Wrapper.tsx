import { ReactNode } from "react";
import AchievementTriggers from "../components/AchievementTriggers";
import RestaurantsPrefetch from "../components/RestaurantsPrefetch";
import ShootingStarsTrail from "../components/ShootingStarsTrail";

interface WrapperProps {
  children: ReactNode;
}

/** Compagnons globaux de l'appli connectée. La session est déjà vérifiée par
 *  ProtectedRoute (une seconde vérification ici retardait l'ouverture). */
const Wrapper = ({ children }: WrapperProps) => (
  <>
    {children}
    <AchievementTriggers />
    <RestaurantsPrefetch />
    <ShootingStarsTrail />
  </>
);

export default Wrapper;
