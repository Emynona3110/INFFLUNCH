// Edge Function : notify-admins
// Envoie une notification push aux ADMINS quand une demande d'accès arrive.
// Appelée par un Database Webhook Supabase sur INSERT dans `waiting_list` : ce
// déclencheur couvre les deux types de demandes (creation / password_reset) et
// toutes les voies d'écriture, y compris l'Edge Function `request-access`.
//
// Web Push « à la main » (RFC 8188 + RFC 8291) via WebCrypto : pas de
// dépendance npm, donc rien qui puisse casser au gré du runtime Deno.
//   - chiffrement du contenu : ECDH P-256 + HKDF-SHA256 + AES-128-GCM ;
//   - authentification auprès du service de push : JWT VAPID (ES256).
//
// Secrets requis (Dashboard → Edge Functions → notify-admins → Secrets) :
//   VAPID_PUBLIC_KEY   (même valeur que VITE_VAPID_PUBLIC_KEY côté front)
//   VAPID_PRIVATE_KEY  (clé privée, base64url — cf. scripts/generate-vapid-keys.mjs)
//   VAPID_SUBJECT      (ex. mailto:admin@infflux.com)
//   PUSH_HOOK_SECRET   (chaîne aléatoire, répétée dans le header x-hook-secret
//                       du webhook — seule preuve que l'appel vient bien de lui)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement.
//
// Déploiement : Dashboard Supabase → Edge Functions → coller ce code → Deploy.
// ⚠️ Décocher « Verify JWT » : le webhook n'envoie pas de JWT Supabase, c'est
// `x-hook-secret` qui protège l'appel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const enc = new TextEncoder();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// --- Utilitaires binaires ----------------------------------------------------

function b64urlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 ? "=".repeat(4 - (value.length % 4)) : "";
  const base64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

// --- VAPID -------------------------------------------------------------------

/** Clé privée VAPID en clé ECDSA importable (JWK reconstruit depuis pub + priv). */
async function importVapidKey(publicKey: string, privateKey: string) {
  const raw = b64urlToBytes(publicKey); // 0x04 || X(32) || Y(32)
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToB64url(raw.slice(1, 33)),
      y: bytesToB64url(raw.slice(33, 65)),
      d: privateKey,
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

/** JWT VAPID (ES256) pour l'origine du service de push (`aud`). */
async function vapidToken(audience: string): Promise<string> {
  const key = await importVapidKey(
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );
  const part = (obj: unknown) => bytesToB64url(enc.encode(JSON.stringify(obj)));
  const signedData = [
    part({ typ: "JWT", alg: "ES256" }),
    part({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@infflux.com",
    }),
  ].join(".");
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signedData)
  );
  return `${signedData}.${bytesToB64url(new Uint8Array(signature))}`;
}

// --- Chiffrement du contenu (aes128gcm) --------------------------------------

async function encryptPayload(
  payload: string,
  p256dh: string,
  authSecretB64: string
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(p256dh); // clé publique du navigateur (65 o)
  const authSecret = b64urlToBytes(authSecretB64); // secret partagé (16 o)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Paire éphémère du serveur d'application (AS).
  const asKeys = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  )) as CryptoKeyPair;
  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey("raw", asKeys.publicKey)
  );
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: uaKey },
      asKeys.privateKey,
      256
    )
  );

  // RFC 8291 : IKM dérivé du secret ECDH + auth_secret, puis clé et nonce.
  const ikm = await hkdf(
    authSecret,
    shared,
    concat(enc.encode("WebPush: info"), new Uint8Array([0]), uaPublic, asPublic),
    32
  );
  const cek = await hkdf(
    salt,
    ikm,
    concat(enc.encode("Content-Encoding: aes128gcm"), new Uint8Array([0])),
    16
  );
  const nonce = await hkdf(
    salt,
    ikm,
    concat(enc.encode("Content-Encoding: nonce"), new Uint8Array([0])),
    12
  );

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  // 0x02 = délimiteur de padding du dernier (et unique) enregistrement.
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      plaintext
    )
  );

  // En-tête aes128gcm : salt(16) || rs(4) || idlen(1) || clé publique AS(65).
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(
    salt,
    recordSize,
    new Uint8Array([asPublic.length]),
    asPublic,
    ciphertext
  );
}

interface Subscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Envoie une notification à un abonnement. Renvoie le code HTTP du service. */
async function sendPush(
  sub: Subscription,
  payload: Record<string, unknown>
): Promise<number> {
  const body = await encryptPayload(
    JSON.stringify(payload),
    sub.p256dh,
    sub.auth
  );
  const audience = new URL(sub.endpoint).origin;
  const token = await vapidToken(audience);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
      Authorization: `vapid t=${token}, k=${Deno.env.get("VAPID_PUBLIC_KEY")}`,
    },
    body,
  });
  return res.status;
}

// --- Handler -----------------------------------------------------------------

const typeLabel: Record<string, string> = {
  creation: "Inscription",
  password_reset: "Mot de passe oublié",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const expected = Deno.env.get("PUSH_HOOK_SECRET");
  if (!expected || req.headers.get("x-hook-secret") !== expected) {
    return json({ error: "Non autorisé." }, 401);
  }

  try {
    // Webhook DB : { type, table, record, old_record }. Un appel manuel de test
    // sans corps est accepté (message générique).
    const payload = await req.json().catch(() => ({}));
    const record = payload?.record ?? {};
    const email: string = record.email ?? "";
    const type: string = record.type ?? "creation";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: admins, error: adminsError } = await admin
      .from("users")
      .select("id")
      .eq("role", "admin");
    if (adminsError) return json({ error: adminsError.message }, 500);

    const ids = (admins ?? []).map((a: { id: string }) => a.id);
    if (ids.length === 0) return json({ sent: 0, reason: "aucun admin" }, 200);

    const { data: subs, error: subsError } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", ids);
    if (subsError) return json({ error: subsError.message }, 500);

    const notification = {
      title: "Nouvelle demande d'accès",
      body: email
        ? `${email} — ${typeLabel[type] ?? type}`
        : "Une demande attend une réponse.",
      url: "/admin",
      tag: "access-request",
    };

    let sent = 0;
    const stale: string[] = [];
    for (const sub of (subs ?? []) as Subscription[]) {
      try {
        const status = await sendPush(sub, notification);
        if (status === 404 || status === 410) stale.push(sub.endpoint);
        else if (status >= 200 && status < 300) sent += 1;
        else console.warn("[notify-admins] statut", status, sub.endpoint);
      } catch (e) {
        console.warn("[notify-admins] échec", String(e));
      }
    }

    // Abonnements révoqués par le navigateur : on nettoie au passage.
    if (stale.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", stale);
    }

    return json({ sent, removed: stale.length }, 200);
  } catch (e) {
    console.error("[notify-admins]", e);
    return json({ error: "Erreur serveur." }, 500);
  }
});
