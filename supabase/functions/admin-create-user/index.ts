// Edge Function : admin-create-user
// Crée un compte utilisateur à partir d'une demande d'accès.
// - Vérifie que l'appelant est un admin (via son JWT)
// - Crée le compte avec un mot de passe temporaire (compte actif, sans email)
// - Marque must_change_password=true (changement forcé à la 1ère connexion)
// - Retire la demande de waiting_list
// - Renvoie le mot de passe temporaire à l'admin (à transmettre via Teams)
//
// Déploiement : Dashboard Supabase → Edge Functions → New function → coller ce code.
// Les variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectées automatiquement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_DOMAIN = "@infflux.com";

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

function genTempPassword(len = 12): string {
  // Jeu de caractères sans ambiguïté (pas de 0/O, 1/l/I)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
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
    const token = (req.headers.get("Authorization") ?? "").replace(
      "Bearer ",
      ""
    );
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

    // 3) Valider l'email cible
    const { email } = await req.json().catch(() => ({}));
    if (!email || !String(email).toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      return json({ error: `Une adresse ${ALLOWED_DOMAIN} est requise.` }, 400);
    }

    // 4) Créer le compte avec mot de passe temporaire
    const tempPassword = genTempPassword();
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });
    if (createErr) {
      const already = /already.*(registered|exists)/i.test(createErr.message);
      return json(
        {
          error: already
            ? "Un compte existe déjà pour cette adresse."
            : createErr.message,
        },
        already ? 409 : 400
      );
    }

    // 5) Retirer la demande de la liste d'attente
    await admin.from("waiting_list").delete().eq("email", email);

    return json({ email, tempPassword }, 200);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
