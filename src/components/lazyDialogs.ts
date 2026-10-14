import { lazyPage } from "@/lib/lazyPage";

// Dialogues lourds chargés à la demande (Leaflet via le sélecteur
// d'emplacement, formulaires…), partagés par la navbar et la grille.

/** Ajout/édition d'un restaurant : admins seulement, donc pas préchargé pour
 *  tous (la grille le précharge pour les admins via `preload()`). */
export const LazyRestaurantDialog = lazyPage(
  () => import("@/admin/Dialogs/RestaurantDialog"),
  { background: false },
);

/** Proposition d'un restaurant (non-admins). */
export const LazyProposeRestaurantDialog = lazyPage(
  () => import("./ProposeRestaurantDialog"),
);
