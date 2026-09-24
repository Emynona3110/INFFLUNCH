// Edge Function : admin-delete-user
// Supprime un compte (auth + données liées par cascade : favoris, votes,
// réactions, succès, tablées, profil, demandes, ligne public.users…).
// Réservé aux admins. Un admin ne peut pas se supprimer lui-même.
//
// Deux modes (politique de confidentialité, 2026-09-19) :
//   - "anonymize" (défaut) : ses avis, photos et menus RESTENT, anonymisés —
//     la FK `on delete set null` s'en charge (sql/2026-09-19_anonymize_user.sql) ;
//   - "erase" : ses contributions sont effacées aussi (lignes + fichiers),
//     quand la personne le demande expressément.
// Dans les deux cas, ses fichiers personnels (pp, images de demandes) partent.
//
// Déploiement : Dashboard Supabase → Edge Functions → coller ce code → Deploy.
// SUPABASE_URL est injecté automatiquement ; pour la clé secrète, voir le choix
// commenté plus bas (nouvelles clés d'API Supabase vs JWT « legacy »).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    // Clé secrète du serveur. Depuis la migration des clés d'API Supabase, un
    // projet passé aux nouvelles clés (front en `sb_publishable_…`) expose
    // SUPABASE_SECRET_KEY ; l'ancienne SUPABASE_SERVICE_ROLE_KEY (JWT
    // « legacy ») reste injectée mais peut être DÉSACTIVÉE côté projet — le
    // client admin est alors refusé et tout appel finit en 401 « Non
    // authentifié », alors que l'appelant est bien connecté. On prend donc la
    // nouvelle clé en priorité ; ADMIN_SECRET_KEY permet de la fournir à la
    // main (Dashboard → Edge Functions → Secrets) si le projet ne l'injecte pas.
    const SERVICE_ROLE =
      Deno.env.get("SUPABASE_SECRET_KEY") ??
      Deno.env.get("ADMIN_SECRET_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Authentifier l'appelant
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) {
      return json({ error: "Non authentifié : aucun jeton envoyé." }, 401);
    }
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(token);
    if (userErr || !user) {
      // Deux 401 très différents se cachaient derrière le même message :
      // le jeton de l'appelant est refusé, OU c'est la clé secrète du serveur
      // qui l'est (clés legacy désactivées). Sans les distinguer, impossible de
      // diagnostiquer depuis le front.
      const msg = userErr?.message ?? "jeton refusé";
      if (/api key/i.test(msg)) {
        return json(
          {
            error:
              "Configuration serveur : clé d'API refusée (clés legacy désactivées ?). " +
              "Renseigner ADMIN_SECRET_KEY dans les secrets des Edge Functions.",
          },
          500
        );
      }
      return json({ error: `Session expirée, reconnecte-toi. (${msg})` }, 401);
    }

    // 2) Vérifier le rôle admin
    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return json({ error: "Action réservée aux administrateurs." }, 403);
    }

    // 3) Valider l'entrée
    const { userId, mode = "anonymize" } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== "string") {
      return json({ error: "userId manquant." }, 400);
    }
    if (userId === user.id) {
      return json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, 400);
    }
    if (mode !== "anonymize" && mode !== "erase") {
      return json({ error: "mode invalide." }, 400);
    }

    // Suppression de fichiers tolérante : un fichier déjà absent ne doit pas
    // bloquer la suppression du compte.
    const removeFiles = async (bucket: string, paths: string[]) => {
      if (paths.length === 0) return;
      await admin.storage.from(bucket).remove(paths).catch(() => {});
    };

    // 4) Fichiers personnels : pp et images jointes à ses demandes (les lignes
    //    partent en cascade, pas les fichiers).
    const [{ data: prof }, { data: feedbacks }] = await Promise.all([
      admin.from("profiles").select("avatar_path").eq("id", userId).maybeSingle(),
      admin.from("feedback").select("images").eq("author_id", userId),
    ]);
    if (prof?.avatar_path) await removeFiles("avatars", [prof.avatar_path]);
    await removeFiles(
      "feedback-images",
      (feedbacks ?? []).flatMap((f) => (f.images as string[]) ?? []),
    );

    // 5) Mode « effacer aussi » : ses contributions (lignes + fichiers) avant
    //    le compte — sinon la FK les garderait, anonymisées.
    if (mode === "erase") {
      const [{ data: photos }, { data: menus }] = await Promise.all([
        admin.from("restaurant_photos").select("storage_path").eq("user_id", userId),
        admin.from("restaurant_menus").select("storage_path").eq("user_id", userId),
      ]);
      await removeFiles("restaurant-photos", [
        ...(photos ?? []).map((p) => p.storage_path as string),
        ...(menus ?? [])
          .map((m) => m.storage_path as string | null)
          .filter((p): p is string => !!p),
      ]);
      for (const table of ["reviews", "restaurant_photos", "restaurant_menus"]) {
        const { error } = await admin.from(table).delete().eq("user_id", userId);
        if (error) return json({ error: `${table} : ${error.message}` }, 400);
      }
    }

    // 6) Supprimer le compte auth (cascade FK ; avis/photos/menus restants
    //    passent à user_id NULL = « Ancien collaborateur »).
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return json({ error: delErr.message }, 400);
    }

    return json({ ok: true, mode }, 200);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
