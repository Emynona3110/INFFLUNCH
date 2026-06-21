import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import { compressImage } from "../utils/imageCompress";
import { AVATARS_BUCKET, newAvatarPath } from "../services/avatar";

export interface Profile {
  id: string;
  avatar_path: string | null;
}

/**
 * Profil de l'utilisateur courant (avatar) + actions upload/suppression de la pp.
 * L'avatar est compressé (limite HAUTE seulement) et stocké sous un nom ALÉATOIRE
 * "{userId}/{uuid}.webp" (URL non devinable). À chaque changement/retrait,
 * l'ANCIEN fichier est supprimé du bucket (chemin courant gardé dans profiles).
 */
const useProfile = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const key = ["profile", userId];

  const query = useQuery<Profile | null, Error>({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, avatar_path")
        .eq("id", userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Profile) ?? null;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
  };

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Non connecté");
      if (!file.type.startsWith("image/"))
        throw new Error("Le fichier doit être une image");

      // Avatar = petit : on borne juste la taille haute (jamais d'agrandissement
      // ni de rejet pour une image trop petite).
      const { blob } = await compressImage(file, { maxSize: 512, quality: 0.85 });

      const oldPath = query.data?.avatar_path ?? null;
      const path = newAvatarPath(userId);

      const { error: upErr } = await supabaseClient.storage
        .from(AVATARS_BUCKET)
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (upErr) throw new Error(`Avatar (storage) : ${upErr.message}`);

      const { error: pErr } = await supabaseClient
        .from("profiles")
        .upsert({ id: userId, avatar_path: path });
      if (pErr) throw new Error(`Profil (base) : ${pErr.message}`);

      // Supprime l'ancien fichier pour ne pas accumuler (best effort).
      if (oldPath && oldPath !== path) {
        await supabaseClient.storage.from(AVATARS_BUCKET).remove([oldPath]);
      }
    },
    onSuccess: invalidate,
  });

  const removeAvatar = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Non connecté");
      const oldPath = query.data?.avatar_path ?? null;

      const { error } = await supabaseClient
        .from("profiles")
        .upsert({ id: userId, avatar_path: null });
      if (error) throw new Error(error.message);

      if (oldPath) {
        await supabaseClient.storage.from(AVATARS_BUCKET).remove([oldPath]);
      }
    },
    onSuccess: invalidate,
  });

  return {
    profile: query.data ?? null,
    isPending: query.isPending,
    uploadAvatar,
    removeAvatar,
  };
};

export default useProfile;
