import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";
import UserProfileView from "@/components/UserProfileView";
import PageNotFound from "@/pages/PageNotFound";
import useSession from "@/hooks/useSession";
import supabaseClient from "@/services/supabaseClient";
import { isUuid } from "@/utils/profilePath";

/**
 * Profil d'un collègue (/profil/:handle — le local-part de son email, ou son
 * id). Son propre profil renvoie vers « Mon Profil », sous-onglet Profil, qui a
 * la même première page et le reste en plus.
 */
const ProfilePage = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { sessionData } = useSession();

  // Pseudo → id via la table users (lisible par tout utilisateur connecté).
  const resolved = useQuery({
    queryKey: ["profile-handle", handle],
    enabled: !!handle && !isUuid(handle),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("users")
        .select("id")
        .ilike("email", `${handle}@%`)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.id ?? null;
    },
  });

  if (!handle) return <Navigate to="/restaurants" replace />;
  const userId = isUuid(handle) ? handle : resolved.data;

  if (!isUuid(handle) && resolved.isPending) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }
  if (!userId) return <PageNotFound />;
  if (sessionData?.user?.id === userId)
    // L'onglet passe par l'état de navigation : l'URL reste /mon-compte.
    return <Navigate to="/mon-compte" state={{ tab: "profil" }} replace />;

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
