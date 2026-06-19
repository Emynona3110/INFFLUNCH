// Edge Function : request-access
// Dépôt d'une demande d'accès (email) dans waiting_list, protégé par Turnstile.
// Remplace l'insert direct anonyme (la policy INSERT publique est supprimée :
// cf. sql/2026-06-19_request_access_hardening.sql) → cette fonction devient le
// SEUL chemin d'écriture vers waiting_list (insert en service_role).
//
// Sécurité :
//   - CAPTCHA Cloudflare Turnstile validé côté serveur (anti-bot, cœur de la protection).
//   - Limite par IP (hashée) : max N demandes abouties / fenêtre glissante, pour
//     empêcher une même personne de créer plein d'adresses (table
//     access_request_ip_log ; cf. sql/2026-06-19_request_access_ip_limit.sql).
//   - Règle domaine @infflux.com + anti-énumération (succès générique systématique :
//     on ne révèle ni l'éligibilité du domaine, ni un doublon, ni le throttle, ni le quota IP).
//   - Filet anti-flood : trigger BEFORE INSERT en base (throttle global) — cap dur
//     sur la croissance de la table même si une clé fuit.
//
// Secrets requis (Dashboard → Edge Functions → request-access → Secrets) :
//   TURNSTILE_SECRET_KEY   (clé secrète Turnstile, NE PAS exposer côté front)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement
// (la service_role key sert aussi de sel pour le hash des IP).
//
// Déploiement : Dashboard Supabase → Edge Functions → coller ce code → Deploy.
// Laisser "Verify JWT" activé : la clé anon (envoyée par functions.invoke même
// pour un visiteur déconnecté) est un JWT valide → l'appel passe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_DOMAIN = "@infflux.com";
const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Limite par IP : au plus MAX_PER_IP demandes ABOUTIES par IP sur WINDOW_HOURS.
// Généreux à dessein (plusieurs collègues peuvent partager le NAT @infflux.com).
const MAX_PER_IP = 5;
const WINDOW_HOURS = 24;

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

// Hash SHA-256 de l'IP (salée par la service_role key) → l'IP n'est jamais
// stockée en clair, et le hash n'est pas inversible sans connaître le sel.
async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${salt}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Valide le token Turnstile auprès de Cloudflare (avec l'IP du client si dispo).
async function verifyTurnstile(
  token: string,
  ip: string | null,
  secret: string
): Promise<boolean> {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    const data = await res.json();
    return data?.success === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Succès générique réutilisé (anti-énumération) : même réponse que l'email
  // soit éligible, déjà inscrit, ou rejeté par le throttle.
  const genericOk = () => json({ ok: true }, 200);

  try {
    const SECRET = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!SECRET) return json({ error: "Service mal configuré." }, 500);

    const { email, token } = await req.json().catch(() => ({}));

    if (!token || typeof token !== "string") {
      return json({ error: "Vérification anti-robot manquante." }, 400);
    }

    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip");

    const human = await verifyTurnstile(token, ip, SECRET);
    if (!human) {
      return json({ error: "Vérification anti-robot échouée." }, 403);
    }

    // À partir d'ici : succès générique systématique.
    if (
      !email ||
      typeof email !== "string" ||
      !email.toLowerCase().endsWith(ALLOWED_DOMAIN)
    ) {
      return genericOk();
    }

    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE);

    // Limite par IP : on compte les demandes abouties de cette IP sur la fenêtre.
    // Si l'IP n'est pas détectable, on n'applique pas la limite (fallback).
    if (ip) {
      const ipHash = await hashIp(ip, SERVICE_ROLE);
      const since = new Date(
        Date.now() - WINDOW_HOURS * 3600 * 1000
      ).toISOString();

      const { count } = await admin
        .from("access_request_ip_log")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);

      if ((count ?? 0) >= MAX_PER_IP) {
        // Quota atteint : on ne révèle rien (succès générique).
        return genericOk();
      }

      // Insert ; erreurs avalées (doublon 23505, throttle P0001…). On ne
      // décompte le quota IP que pour une demande RÉELLEMENT nouvelle (insérée).
      const { error: insErr } = await admin
        .from("waiting_list")
        .insert({ email: email.toLowerCase() });
      if (!insErr) {
        await admin.from("access_request_ip_log").insert({ ip_hash: ipHash });
      }
      return genericOk();
    }

    // Erreurs avalées volontairement → on renvoie toujours le succès générique.
    await admin.from("waiting_list").insert({ email: email.toLowerCase() });

    return genericOk();
  } catch {
    return json({ error: "Erreur serveur." }, 500);
  }
});
