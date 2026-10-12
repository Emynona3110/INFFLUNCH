import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import BackLink from "@/components/BackLink";
import UserProfileView from "@/components/UserProfileView";
import PageNotFound from "@/pages/PageNotFound";
import useSession from "@/hooks/useSession";
import supabaseClient from "@/services/supabaseClient";
import { isUuid } from "@/utils/profilePath";
import useAchievements from "@/hooks/useAchievements";
import {
  RICK_HANDLE,
  RICK_ID,
  RICK_PROFILE,
  RICK_VIDEO,
} from "@/data/rickAstley";

/**
 * Profil d'un collègue (/profil/:handle — le local-part de son email, ou son
 * id). Son propre profil s'affiche ici aussi, comme celui des autres (avec le
 * retour), plutôt que de basculer dans « Mon compte ».
 */
const ProfilePage = () => {
  const { handle } = useParams<{ handle: string }>();
  const { sessionData } = useSession();
  // Rick Astley : profil fictif, rendu sans base (succès secret).
  const isRick = handle?.toLowerCase() === RICK_HANDLE;
  const { unlock } = useAchievements();
  useEffect(() => {
    if (isRick) unlock("leaderboard_rick");
  }, [isRick, unlock]);

  // Pseudo → id via la table users (lisible par tout utilisateur connecté).
  const resolved = useQuery({
    queryKey: ["profile-handle", handle],
    enabled: !!handle && !isUuid(handle) && !isRick,
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
  const userId = isRick ? RICK_ID : isUuid(handle) ? handle : resolved.data;

  if (!isRick && !isUuid(handle) && resolved.isPending) {
    return (
      <div className="flex justify-center py-8 sm:py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }
  if (!userId) return <PageNotFound />;
  const isMe = sessionData?.user?.id === userId;

  return (
    <div
      className="tw-scope mx-auto w-full max-w-2xl"
    >
      {/* Retour là d'où l'on vient (un avis, une photo, une tablée…). */}
      <BackLink fallbackTo="/" fallbackLabel="Accueil" className="mb-4" />

      <div className="space-y-3 sm:space-y-6">
        <UserProfileView
          userId={userId}
          isMe={isMe}
          fake={
            isRick
              ? { profile: RICK_PROFILE, video: RICK_VIDEO }
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default ProfilePage;
