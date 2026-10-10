import useAccessRequests from "./useAccessRequests";
import useFeedback, { awaitingAdmin } from "./useFeedback";
import useIsAdmin from "./useIsAdmin";
import useRestaurantSuggestions from "./useRestaurantSuggestions";

/**
 * Ce qui attend l'admin, toutes catégories confondues : demandes d'accès non
 * traitées (onglets Inscriptions / Mot de passe) et demandes des collaborateurs
 * qui attendent l'admin — pas classées, ou dernier mot à l'auteur (onglet
 * Demandes), et propositions de restos à trancher (onglet Restos).
 *
 * Sert la puce de l'onglet « Admin » dans la navbar : elle doit s'allumer dès
 * qu'un sous-onglet allume la sienne. À compléter ici si un futur sous-onglet
 * en gagne une.
 */
const useAdminPending = () => {
  const isAdmin = useIsAdmin();
  const { data: requests = [] } = useAccessRequests();
  // Réservé aux admins : inutile d'aller chercher la boîte de réception pour
  // quelqu'un qui n'a pas l'onglet.
  const { data: feedback = [] } = useFeedback("admin", isAdmin);
  const { data: suggestions = [] } = useRestaurantSuggestions("admin", isAdmin);

  const access = requests.filter((r) => r.state === "Waiting").length;
  const newFeedback = feedback.filter(awaitingAdmin).length;
  // Propositions de restos pas encore tranchées (onglet Restos).
  const newSuggestions = suggestions.filter((s) => s.status === "nouveau").length;

  return {
    access,
    feedback: newFeedback,
    suggestions: newSuggestions,
    total: access + newFeedback + newSuggestions,
  };
};

export default useAdminPending;
