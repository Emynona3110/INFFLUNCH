import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import { compressImage } from "../utils/imageCompress";
import { AVATARS_BUCKET, avatarKey } from "../services/avatar";

export interface Profile {
  id: string;
  avatar_updated_at: string | null;
}

/**
 * Profil de l'utilisateur courant (avatar) + actions upload/suppression de la pp.
 * L'avatar est compressé (limite HAUTE seulement, pas de rejet pour une petite
 * image) et stocké sous "{id}.webp" (écrasé à chaque changement). `profiles`
 * garde la version (avatar_updated_at) pour le cache-busting et savoir qui a une pp.
 */
const useProfile = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const email = sessionData?.user?.email;
  const queryClient = useQueryClient();
  const key = ["profile", userId];

  const query = useQuery<Profile | null, Error>({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, avatar_updated_at")
        .eq("id", userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Profile) ?? null;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
  };

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const key = avatarKey(email);
      if (!userId || !key) throw new Error("Non connecté");
      if (!file.type.startsWith("image/"))
        throw new Error("Le fichier doit être une image");

      // Avatar = petit : on borne juste la taille haute (jamais d'agrandissement
      // ni de rejet pour une image trop petite).
      const { blob } = await compressImage(file, { maxSize: 512, quality: 0.85 });

      // L'upsert:true est rejeté par la RLS storage ici → on supprime l'ancien
      // fichier (nécessite la policy SELECT avatars) puis on uploade en
      // upsert:false (qui, lui, passe).
      await supabaseClient.storage.from(AVATARS_BUCKET).remove([key]);
      const { error: upErr } = await supabaseClient.storage
        .from(AVATARS_BUCKET)
        .upload(key, blob, { contentType: "image/webp", upsert: false });
      if (upErr) throw new Error(`Avatar (storage) : ${upErr.message}`);

      const { error: pErr } = await supabaseClient
        .from("profiles")
        .upsert({ id: userId, avatar_updated_at: new Date().toISOString() });
      if (pErr) throw new Error(`Profil (base) : ${pErr.message}`);
    },
    onSuccess: invalidate,
  });

  const removeAvatar = useMutation({
    mutationFn: async () => {
      const key = avatarKey(email);
      if (!userId || !key) throw new Error("Non connecté");
      await supabaseClient.storage.from(AVATARS_BUCKET).remove([key]);
      const { error } = await supabaseClient
        .from("profiles")
        .upsert({ id: userId, avatar_updated_at: null });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { profile: query.data ?? null, isPending: query.isPending, uploadAvatar, removeAvatar };
};

export default useProfile;
