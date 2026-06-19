// =============================================================================
// Backfill des coordonnées (lat/lng) des restaurants existants.
// À lancer UNE fois après la migration sql/2026-06-19_restaurants_coords.sql.
//
// Géocode via Nominatim (1,1 s entre chaque appel = politique d'usage) et écrit
// lat/lng en base. Pas de clé service_role : on se connecte avec un compte ADMIN
// (les updates passent par la RLS admin de la table restaurants).
//
// Usage (PowerShell) :
//   $env:ADMIN_EMAIL="admin@infflux.com"; $env:ADMIN_PASSWORD="…"; node scripts/backfill-coords.mjs
//
// URL + clé anon sont lues automatiquement depuis .env.local (VITE_SUPABASE_URL
// / VITE_SUPABASE_ANON_KEY), ou via les variables d'environnement de même nom.
// Seuls les restos sans coords sont traités (relançable sans risque).
// =============================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY introuvables (.env.local ou env).");
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("❌ Définis ADMIN_EMAIL et ADMIN_PASSWORD (compte admin) dans l'environnement.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const geocode = async (address) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`;
  const res = await fetch(url, {
    headers: {
      "Accept-Language": "fr",
      "User-Agent": "infflunch-backfill/1.0 (admin script)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.length) throw new Error("adresse introuvable");
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
};

// --- Run --------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const { error: authError } = await supabase.auth.signInWithPassword({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
});
if (authError) {
  console.error("❌ Connexion admin échouée :", authError.message);
  process.exit(1);
}

const { data: restaurants, error } = await supabase
  .from("restaurants")
  .select("id, name, address, lat, lng")
  .or("lat.is.null,lng.is.null");

if (error) {
  console.error("❌ Lecture restaurants :", error.message);
  process.exit(1);
}

if (!restaurants.length) {
  console.log("✅ Rien à faire : tous les restaurants ont déjà des coordonnées.");
  process.exit(0);
}

console.log(`→ ${restaurants.length} restaurant(s) à géocoder…\n`);

let ok = 0;
let failed = 0;
for (const r of restaurants) {
  if (!r.address) {
    console.warn(`⚠️  ${r.name} : pas d'adresse, ignoré.`);
    failed++;
    continue;
  }
  try {
    const { lat, lng } = await geocode(r.address);
    const { error: upErr } = await supabase
      .from("restaurants")
      .update({ lat, lng })
      .eq("id", r.id);
    if (upErr) throw upErr;
    console.log(`✅ ${r.name} → ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    ok++;
  } catch (e) {
    console.warn(`❌ ${r.name} : ${e.message}`);
    failed++;
  }
  await sleep(1100); // politique Nominatim : max ~1 req/s
}

console.log(`\nTerminé : ${ok} ok, ${failed} échec(s).`);
process.exit(0);
