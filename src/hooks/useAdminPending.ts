import useAccessRequests from "./useAccessRequests";
import useFeedback from "./useFeedback";
import useIsAdmin from "./useIsAdmin";

/**
 * Ce qui attend l'admin, toutes catégories confondues : demandes d'accès non
 * traitées (onglets Inscriptions / Mot de passe) et demandes des collaborateurs
 * non classées (onglet Demandes).
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

  const access = requests.filter((r) => r.state === "Waiting").length;
  const newFeedback = feedback.filter((f) => f.status === "nouveau").length;

  return { access, feedback: newFeedback, total: access + newFeedback };
};

export default useAdminPending;
