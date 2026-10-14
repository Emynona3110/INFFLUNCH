// =============================================================================
// Génère la miniature des couvertures déjà en ligne : pour chaque restaurant
// dont `image` pointe vers "{slug}/cover-X.{webp,jpg,png}" du bucket, crée
// "{slug}/cover-X-thumb.webp" (800 px max, WebP) si elle n'existe pas encore.
// Les nouvelles couvertures ont leur miniature dès l'upload (RestaurantDialog) ;
// ce script ne sert qu'au rattrapage. Idempotent.
//
// Nécessite `sharp` (non installé par défaut) :
//   npm i --no-save sharp
//
// Connexion : clé service_role, ou à défaut un compte ADMIN (RLS admin).
//
// Usage (PowerShell) :
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/backfill-cover-thumbs.mjs --dry
//   # (ou) $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; node scripts/backfill-cover-thumbs.mjs
//
// URL + clé anon lues depuis .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// =============================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "restaurant-photos";
const DRY = process.argv.includes("--dry");
// Aligné sur COVER_THUMB_MAX (src/services/storagePaths.ts).
const THUMB_MAX = 800;
const THUMB_QUALITY = 80;

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("❌ `sharp` introuvable : lance d'abord `npm i --no-save sharp`.");
  process.exit(1);
}

// --- Config -----------------------------------------------------------------

const fromEnvFile = (() => {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    return Object.fromEntries(
      text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
        })
    );
  } catch {
    return {};
  }
})();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || fromEnvFile.VITE_SUPABASE_URL;
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_ANON_KEY || fromEnvFile.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || fromEnvFile.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY introuvables.");
  process.exit(1);
}

// Miniature d'une couverture (cf. coverThumbOf, src/services/storagePaths.ts).
const thumbOf = (path) => {
  const thumb = path.replace(/(\/cover-[^/?.]+)\.(webp|jpe?g|png)$/i, "$1-thumb.webp");
  return thumb === path ? null : thumb;
};
const pathFromPublicUrl = (url) => {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
};

// --- Connexion --------------------------------------------------------------

let supabase;
if (SERVICE_ROLE) {
  supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
  console.log("→ Connexion via service_role (perms complètes).");
} else {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "❌ Fournis SUPABASE_SERVICE_ROLE_KEY, ou ADMIN_EMAIL + ADMIN_PASSWORD."
    );
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error) {
    console.error("❌ Connexion admin échouée :", error.message);
    process.exit(1);
  }
  console.log("→ Connexion via compte admin (RLS).");
}

const publicUrl = (path) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

// --- Traitement -------------------------------------------------------------

const { data: restaurants, error: rErr } = await supabase
  .from("restaurants")
  .select("slug, image");
if (rErr) {
  console.error("❌ Lecture restaurants :", rErr.message);
  process.exit(1);
}

let created = 0;
let skipped = 0;
let failed = 0;
let before = 0;
let after = 0;

for (const r of restaurants) {
  const path = pathFromPublicUrl(r.image);
  const thumb = path && thumbOf(path);
  if (!thumb) continue; // pas de couverture du bucket (lien externe, aucune image)

  const exists = await fetch(publicUrl(thumb), { method: "HEAD" });
  if (exists.ok) {
    skipped++;
    continue;
  }

  try {
    const res = await fetch(publicUrl(path));
    if (!res.ok) throw new Error(`téléchargement HTTP ${res.status}`);
    const original = Buffer.from(await res.arrayBuffer());
    const small = await sharp(original)
      .rotate()
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    if (!DRY) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(thumb, small, { contentType: "image/webp", upsert: false });
      if (error) throw new Error(error.message);
    }
    before += original.length;
    after += small.length;
    created++;
    console.log(
      `${DRY ? "[DRY] " : ""}✓ ${thumb}  ${(original.length / 1024) | 0} Ko → ${(small.length / 1024) | 0} Ko`
    );
  } catch (err) {
    failed++;
    console.error(`✗ ${r.slug} : ${err.message}`);
  }
}

console.log(
  `\n${DRY ? "[DRY-RUN] " : ""}Terminé : ${created} miniature(s) créée(s), ` +
    `${skipped} déjà présente(s), ${failed} échec(s).` +
    (created ? ` Poids : ${(before / 1024) | 0} Ko → ${(after / 1024) | 0} Ko.` : "")
);
