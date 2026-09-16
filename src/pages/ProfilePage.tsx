import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";
import UserProfileView from "@/components/UserProfileView";
import useSession from "@/hooks/useSession";

/**
 * Profil d'un collègue (/profil/:userId). Son propre id renvoie vers « Mon
 * Profil », qui a la même première page et le reste en plus.
 */
const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { sessionData } = useSession();

  if (!userId) return <Navigate to="/restaurants" replace />;
  if (sessionData?.user?.id === userId)
    // ?tab=profil : sinon on retomberait sur le sous-onglet mémorisé.
    return <Navigate to="/mon-compte?tab=profil" replace />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="tw-scope mx-auto w-full max-w-2xl"
    >
      {/* Retour là d'où l'on vient (un avis, une photo, une tablée…). */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
      >
        <FiArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="space-y-6">
        <UserProfileView userId={userId} />
      </div>
    </motion.div>
  );
};

export default ProfilePage;
