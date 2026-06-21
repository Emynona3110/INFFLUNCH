import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { compressImage } from "../utils/imageCompress";
import { PHOTOS_BUCKET, menuPathBase } from "../services/storagePaths";

export type MenuKind = "link" | "pdf" | "image";

export interface RestaurantMenu {
  id: number;
  restaurant_id: number;
  user_id: string;
  kind: MenuKind;
  url: string | null;
  storage_path: string | null;
  title: string | null;
  position: number;
  created_at: string;
  /** Lien à ouvrir / image à afficher (URL externe pour 'link', URL publique du
   *  bucket pour 'pdf'/'image'). */
  href: string;
  /** Email de l'auteur (jointure public.users), pour l'attribution. */
  email: string | null;
}

const publicUrl = (path: string) =>
  supabaseClient.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;

/**
 * Menus d'un restaurant (collaboratif), multi-formats : lien web, PDF, ou image.
 * Calqué sur useRestaurantPhotos : binaires (pdf/image) dans le bucket Storage
 * (sous-dossier {slug}/menu/), la table ne porte que des métadonnées. Pas de FK
 * directe vers public.users → jointure manuelle pour l'email de l'auteur.
 */
const useRestaurantMenus = (restaurantId: number | undefined, slug?: string) => {
  const queryClient = useQueryClient();
  const key = ["restaurant-menus", restaurantId];

  const query = useQuery<RestaurantMenu[], Error>({
    queryKey: key,
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("restaurant_menus")
        .select(
          "id, restaurant_id, user_id, kind, url, storage_path, title, position, created_at"
        )
        .eq("restaurant_id", restaurantId as number)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.user_id))];

      let emailById: Record<string, string> = {};
      if (ids.length) {
        const { data: users } = await supabaseClient
          .from("users")
          .select("id, email")
          .in("id", ids);
        emailById = Object.fromEntries(
          (users ?? []).map((u) => [u.id as string, u.email as string])
        );
      }

      return rows.map((r) => ({
        ...(r as Omit<RestaurantMenu, "href" | "email">),
        href: r.kind === "link" ? (r.url as string) : publicUrl(r.storage_path as string),
        email: emailById[r.user_id] ?? null,
      }));
    },
  });

  const add = useMutation({
    mutationFn: async ({
      kind,
      file,
      url,
      title,
      authorId,
    }: {
      kind: MenuKind;
      /** Requis pour kind 'pdf' | 'image'. */
      file?: File;
      /** Requis pour kind 'link'. */
      url?: string;
      title?: string;
      /** Admin : attribuer l'entrée à un autre user_id. Défaut = auteur courant. */
      authorId?: string;
    }) => {
      if (!restaurantId) throw new Error("Restaurant inconnu");
      const authorPatch = authorId ? { user_id: authorId } : {};

      // 1) Lien externe : pas de fichier, juste l'URL.
      if (kind === "link") {
        const clean = url?.trim();
        if (!clean) throw new Error("URL du menu manquante");
        const { error } = await supabaseClient.from("restaurant_menus").insert({
          restaurant_id: restaurantId,
          kind,
          url: clean,
          title: title?.trim() || null,
          ...authorPatch,
        });
        if (error) throw new Error(error.message);
        return;
      }

      // 2) Fichier (pdf/image) : upload dans le bucket puis métadonnée.
      if (!file) throw new Error("Fichier manquant");
      if (!slug) throw new Error("Restaurant inconnu");

      let path: string;
      let contentType: string;
      let blob: Blob = file;
      if (kind === "image") {
        if (!file.type.startsWith("image/"))
          throw new Error("Le fichier doit être une image");
        const compressed = await compressImage(file);
        blob = compressed.blob;
        path = `${menuPathBase(slug)}.${compressed.ext}`;
        contentType = `image/${compressed.ext}`;
      } else {
        // pdf : stocké tel quel (pas de compression).
        if (file.type !== "application/pdf")
          throw new Error("Le fichier doit être un PDF");
        path = `${menuPathBase(slug)}.pdf`;
        contentType = "application/pdf";
      }

      const { error: upErr } = await supabaseClient.storage
        .from(PHOTOS_BUCKET)
        .upload(path, blob, { contentType, upsert: false });
      if (upErr) throw new Error(upErr.message);

      const { error: insErr } = await supabaseClient
        .from("restaurant_menus")
        .insert({
          restaurant_id: restaurantId,
          kind,
          storage_path: path,
          title: title?.trim() || null,
          ...authorPatch,
        });
      if (insErr) {
        // L'insert métadonnée a échoué → on nettoie le fichier orphelin.
        await supabaseClient.storage.from(PHOTOS_BUCKET).remove([path]);
        throw new Error(insErr.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (menu: RestaurantMenu) => {
      const { error } = await supabaseClient
        .from("restaurant_menus")
        .delete()
        .eq("id", menu.id);
      if (error) throw new Error(error.message);
      // Suppression du fichier associé (best effort ; les liens n'en ont pas).
      if (menu.storage_path) {
        await supabaseClient.storage.from(PHOTOS_BUCKET).remove([menu.storage_path]);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { ...query, add, remove };
};

export default useRestaurantMenus;
