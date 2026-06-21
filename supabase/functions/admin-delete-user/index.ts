// Edge Function : admin-delete-user
// Supprime définitivement un utilisateur (compte auth + données liées par
// cascade : reviews, favorites, profiles, ligne public.users…).
// Réservé aux admins. Un admin ne peut pas se supprimer lui-même.
//
// Déploiement : Dashboard Supabase → Edge Functions → coller ce code → Deploy.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement.

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
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Authentifier l'appelant
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return json({ error: "Non authentifié." }, 401);
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
    const { userId } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== "string") {
      return json({ error: "userId manquant." }, 400);
    }
    if (userId === user.id) {
      return json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, 400);
    }

    // 4) Supprimer le compte auth (les données liées suivent par cascade FK).
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return json({ error: delErr.message }, 400);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
