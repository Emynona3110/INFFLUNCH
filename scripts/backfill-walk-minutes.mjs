// =============================================================================
// Backfill du temps de marche (walk_minutes) des restaurants existants.
// À lancer UNE fois après la migration sql/2026-06-24_restaurant_walk_minutes.sql
// ET après le déploiement de l'Edge Function `walk-time` (+ secret ORS_API_KEY).
//
// Pour chaque resto ayant des coords mais pas de walk_minutes, on appelle la
// fonction `walk-time` (ORS, clé côté serveur) puis on écrit le résultat. En cas
// d'indisponibilité ORS, repli sur une estimation vol d'oiseau × 1,3.
// Pas de clé service_role : connexion avec un compte ADMIN (RLS admin).
//
// Usage (PowerShell) :
//   $env:ADMIN_EMAIL="admin@infflux.com"; $env:ADMIN_PASSWORD="…"; node scripts/backfill-walk-minutes.mjs
//
// URL + clé anon lues depuis .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// Relançable sans risque (ne traite que walk_minutes is null).
// =============================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const INFFLUX = { lat: 48.8487433, lng: 2.4280408 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Distance vol d'oiseau (km) — repli si ORS indisponible.
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};
const estimateWalkMinutes = (km) => Math.max(1, Math.round((km / 5) * 60 * 1.3));

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
  .select("id, name, lat, lng, walk_minutes")
  .is("walk_minutes", null)
  .not("lat", "is", null)
  .not("lng", "is", null);

if (error) {
  console.error("❌ Lecture restaurants :", error.message);
  process.exit(1);
}

if (!restaurants.length) {
  console.log("✅ Rien à faire : tous les restaurants ont déjà un temps de marche.");
  process.exit(0);
}

console.log(`→ ${restaurants.length} restaurant(s) à calculer…\n`);

let ok = 0;
let estimated = 0;
let failed = 0;
for (const r of restaurants) {
  try {
    let minutes = null;
    const { data, error: fnErr } = await supabase.functions.invoke("walk-time", {
      body: { lat: r.lat, lng: r.lng },
    });
    if (!fnErr && typeof data?.minutes === "number") minutes = data.minutes;

    let source = "ORS";
    if (minutes == null) {
      minutes = estimateWalkMinutes(haversineKm(INFFLUX, { lat: r.lat, lng: r.lng }));
      source = "estimation";
      estimated++;
    }

    const { error: upErr } = await supabase
      .from("restaurants")
      .update({ walk_minutes: minutes })
      .eq("id", r.id);
    if (upErr) throw upErr;

    console.log(`✅ ${r.name} → ${minutes} min (${source})`);
    ok++;
  } catch (e) {
    console.warn(`❌ ${r.name} : ${e.message}`);
    failed++;
  }
  await sleep(1500); // ORS free tier : ~40 req/min sur directions → marge.
}

console.log(
  `\nTerminé : ${ok} ok (dont ${estimated} estimés), ${failed} échec(s).`
);
process.exit(0);
