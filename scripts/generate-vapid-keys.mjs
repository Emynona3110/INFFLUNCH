// =============================================================================
// Génération de la paire de clés VAPID (notifications push).
// À lancer UNE fois, en local : `node scripts/generate-vapid-keys.mjs`
//
// Sortie :
//   - clé PUBLIQUE  → écrite dans .env.local (VITE_VAPID_PUBLIC_KEY). Elle part
//     dans le bundle : c'est normal, elle n'est pas secrète.
//   - clé PRIVÉE    → affichée ici UNIQUEMENT. À coller dans les secrets de
//     l'Edge Function `notify-admins` (VAPID_PRIVATE_KEY). Ne jamais la
//     versionner ni la mettre dans un VITE_*.
//
// Format : base64url, comme attendu par la Push API (clé publique = point EC
// non compressé 04||X||Y sur 65 octets, clé privée = scalaire `d` sur 32).
// Relancer le script = invalider les abonnements déjà enregistrés (ils sont
// signés avec l'ancienne clé) : il faudrait alors vider push_subscriptions.
// =============================================================================

import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const pubJwk = publicKey.export({ format: "jwk" });
const privJwk = privateKey.export({ format: "jwk" });

// Point non compressé : 0x04 || X (32) || Y (32).
const publicRaw = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(pubJwk.x, "base64url"),
  Buffer.from(pubJwk.y, "base64url"),
]);

const VAPID_PUBLIC_KEY = b64url(publicRaw);
const VAPID_PRIVATE_KEY = privJwk.d; // déjà en base64url

// --- Mise à jour de .env.local (clé publique) --------------------------------
const envUrl = new URL("../.env.local", import.meta.url);
const line = `VITE_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}`;
let env = existsSync(envUrl) ? readFileSync(envUrl, "utf8") : "";
if (/^VITE_VAPID_PUBLIC_KEY=.*$/m.test(env)) {
  env = env.replace(/^VITE_VAPID_PUBLIC_KEY=.*$/m, line);
} else {
  env = env.replace(/\s*$/, "\n") + line + "\n";
}
writeFileSync(envUrl, env);

console.log("\n✅ .env.local mis à jour : VITE_VAPID_PUBLIC_KEY");
console.log("   (à reporter aussi dans les variables d'env de Render)\n");
console.log("Secrets à créer sur l'Edge Function `notify-admins` :");
console.log(`  VAPID_PUBLIC_KEY  = ${VAPID_PUBLIC_KEY}`);
console.log(`  VAPID_PRIVATE_KEY = ${VAPID_PRIVATE_KEY}`);
console.log(`  VAPID_SUBJECT     = mailto:<ton email>`);
console.log(
  `  PUSH_HOOK_SECRET  = <une chaîne aléatoire, à répéter dans le header x-hook-secret du webhook>\n`
);
