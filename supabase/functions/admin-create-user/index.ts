// Edge Function : admin-create-user
// Traite une demande d'accès depuis le panneau admin :
//   - type "creation"       → crée le compte avec un mot de passe temporaire
//   - type "password_reset" → réinitialise le mot de passe d'un compte existant
// Dans les deux cas : must_change_password=true (changement forcé à la connexion)
// et renvoie le mot de passe temporaire à l'admin (à transmettre via Teams).
// Le statut de la demande (Accepted/Rejected) est mis à jour côté front.
//
// Déploiement : Dashboard Supabase → Edge Functions → coller ce code → Deploy.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement.

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

    // 3) Valider l'entrée
    const { email, type = "creation" } = await req.json().catch(() => ({}));
    if (!email || !String(email).toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      return json({ error: `Une adresse ${ALLOWED_DOMAIN} est requise.` }, 400);
    }
    if (type !== "creation" && type !== "password_reset") {
      return json({ error: "Type de demande invalide." }, 400);
    }

    const tempPassword = genTempPassword();

    if (type === "creation") {
      // 4a) Créer le compte
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
    } else {
      // 4b) Réinitialiser le mot de passe d'un compte existant
      const { data: target } = await admin
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!target) {
        return json({ error: "Aucun compte pour cette adresse." }, 404);
      }

      // Fusionner les métadonnées pour ne pas écraser le rôle
      const { data: got } = await admin.auth.admin.getUserById(target.id);
      const meta = {
        ...(got.user?.user_metadata ?? {}),
        must_change_password: true,
      };

      const { error: updErr } = await admin.auth.admin.updateUserById(
        target.id,
        { password: tempPassword, user_metadata: meta }
      );
      if (updErr) {
        return json({ error: updErr.message }, 400);
      }
    }

    return json({ email, tempPassword }, 200);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
