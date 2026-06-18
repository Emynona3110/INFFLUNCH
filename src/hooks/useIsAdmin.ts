import useSession from "./useSession";

/**
 * true uniquement si un utilisateur est connecté ET a le rôle "admin"
 * (user_metadata.role). Sert à conditionner l'affichage/usage des
 * contrôles d'édition côté espace utilisateur.
 */
const useIsAdmin = () => {
  const { sessionData } = useSession();
  return sessionData?.user.user_metadata?.role === "admin";
};

export default useIsAdmin;
