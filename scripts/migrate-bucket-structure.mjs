// =============================================================================
// Migration du rangement du bucket "restaurant-photos" : un dossier par resto
// nommé par son slug, contenant toutes ses images (à plat) :
//   couverture : "{slug}/cover-{horodatage}.webp"
//   galerie    : "{slug}/{horodatage}-{court}.webp"
//
// Modes (combinables avec --dry pour un aperçu sans rien écrire) :
//   (défaut)            déplace les fichiers déjà dans le bucket (galerie via
//                       restaurant_photos, couverture via restaurants.image) vers
//                       la nouvelle structure. Idempotent.
//   --clean             supprime les fichiers orphelins (non référencés en base).
//   --import-external   télécharge les images en LIEN EXTERNE, les héberge dans
//                       le bucket ("{slug}/cover-...") et met à jour l'URL.
//                       Recompresse si `sharp` est installé (sinon tel quel).
//
// Connexion : de préférence la clé service_role (perms complètes ; requise pour
// --clean qui doit lister le bucket). À défaut, un compte ADMIN (RLS admin).
//
// Usage (PowerShell) :
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/migrate-bucket-structure.mjs --dry
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/migrate-bucket-structure.mjs
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/migrate-bucket-structure.mjs --import-external --dry
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/migrate-bucket-structure.mjs --clean --dry
//   # (ou) $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; node scripts/migrate-bucket-structure.mjs
//
// URL + clé anon lues depuis .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// =============================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "restaurant-photos";
const DRY = process.argv.includes("--dry");
// --clean : au lieu de migrer, supprime les fichiers orphelins (non référencés
// en base) — utile pour vider les anciens dossiers après migration.
const CLEAN = process.argv.includes("--clean");
// --import-external : télécharge les images en lien externe et les héberge dans
// le bucket ("{slug}/cover-..."), puis met à jour restaurants.image.
const IMPORT = process.argv.includes("--import-external");

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

// --- Helpers de nommage (alignés sur src/services/storagePaths.ts) ----------

const stamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
};
const shortId = () => Math.random().toString(36).slice(2, 6);
const extOf = (path) => {
  const m = /\.([a-zA-Z0-9]+)$/.exec(path || "");
  return m ? m[1] : "webp";
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
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
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

// Liste récursive de TOUS les fichiers du bucket (les dossiers ont id === null).
const listAll = async (prefix = "") => {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const e of data) {
      const full = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) out.push(...(await listAll(full)));
      else out.push(full);
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
};

// Déplacement = copy + remove (couverts par nos policies insert/delete), plutôt
// que .move() qui requiert un droit UPDATE absent de nos policies storage.
const copyFile = async (from, to) => {
  if (DRY) return null;
  const { error } = await supabase.storage.from(BUCKET).copy(from, to);
  return error;
};
const removeOld = async (path) => {
  if (DRY) return;
  await supabase.storage.from(BUCKET).remove([path]); // best effort
};

// --- Données ----------------------------------------------------------------

const { data: restaurants, error: rErr } = await supabase
  .from("restaurants")
  .select("id, slug, image");
if (rErr) {
  console.error("❌ Lecture restaurants :", rErr.message);
  process.exit(1);
}
const slugById = Object.fromEntries(restaurants.map((r) => [r.id, r.slug]));

const { data: photos, error: pErr } = await supabase
  .from("restaurant_photos")
  .select("id, restaurant_id, storage_path");
if (pErr) {
  console.error("❌ Lecture restaurant_photos :", pErr.message);
  process.exit(1);
}

// --- Mode --clean : supprime les fichiers orphelins (non référencés) ---------
if (CLEAN) {
  const referenced = new Set();
  for (const ph of photos) referenced.add(ph.storage_path);
  for (const r of restaurants) {
    const p = pathFromPublicUrl(r.image);
    if (p) referenced.add(p);
  }
  const all = await listAll("");
  const orphans = all.filter((p) => !referenced.has(p));
  console.log(
    `\n${DRY ? "[DRY-RUN] " : ""}Nettoyage : ${all.length} fichier(s), ` +
      `${referenced.size} référencé(s), ${orphans.length} orphelin(s).`
  );
  let removed = 0;
  for (const o of orphans) {
    console.log(`  ${DRY ? "[dry] " : ""}🗑️  ${o}`);
    if (!DRY) {
      const { error } = await supabase.storage.from(BUCKET).remove([o]);
      if (error) {
        console.warn(`     ❌ ${error.message}`);
        continue;
      }
    }
    removed++;
  }
  console.log(
    `\n${DRY ? "[DRY-RUN] " : ""}Terminé : ${removed}/${orphans.length} orphelin(s) supprimé(s).`
  );
  if (DRY) console.log("Relance sans --dry pour supprimer.");
  process.exit(0);
}

// --- Mode --import-external : héberge les liens externes dans le bucket ------
if (IMPORT) {
  let sharp = null;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log(
      "ℹ️  sharp non installé → images importées telles quelles (npm i -D sharp pour recompresser)."
    );
  }
  const extFromType = (ct) => {
    if (!ct) return null;
    if (/jpe?g/.test(ct)) return "jpg";
    if (/png/.test(ct)) return "png";
    if (/webp/.test(ct)) return "webp";
    if (/avif/.test(ct)) return "avif";
    if (/gif/.test(ct)) return "gif";
    return null;
  };

  let imported = 0;
  let ignored = 0;
  let ko = 0;
  console.log(`\n${DRY ? "[DRY-RUN] " : ""}Import des couvertures externes\n`);

  for (const r of restaurants) {
    if (!r.image || pathFromPublicUrl(r.image)) {
      ignored++; // pas d'image, ou déjà hébergée dans le bucket
      continue;
    }
    try {
      const res = await fetch(r.image);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      let buf = Buffer.from(await res.arrayBuffer());
      let ext = extFromType(ct) || extOf(r.image.split("?")[0]);
      let contentType = ct.startsWith("image/") ? ct : `image/${ext}`;

      if (sharp) {
        buf = await sharp(buf)
          .rotate()
          .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        ext = "webp";
        contentType = "image/webp";
      }

      const newPath = `${r.slug}/cover-${stamp()}.${ext}`;
      if (!DRY) {
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(newPath, buf, { contentType, upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { error: uErr } = await supabase
          .from("restaurants")
          .update({ image: publicUrl(newPath) })
          .eq("id", r.id);
        if (uErr) throw new Error(uErr.message);
      }
      console.log(
        `  ✅ ${r.slug} → ${newPath} (${Math.round(buf.length / 1024)} Ko)`
      );
      imported++;
    } catch (e) {
      console.warn(`  ❌ ${r.slug} : ${e.message}`);
      ko++;
    }
  }
  console.log(
    `\n${DRY ? "[DRY-RUN] " : ""}Terminé : ${imported} importée(s), ${ignored} ignorée(s), ${ko} échec(s).`
  );
  if (DRY) console.log("Relance sans --dry pour appliquer.");
  process.exit(ko > 0 ? 1 : 0);
}

console.log(
  `\n${DRY ? "[DRY-RUN] " : ""}Migration du bucket "${BUCKET}"\n`
);

let moved = 0;
let skipped = 0;
let failed = 0;

// --- 1) Galerie (table restaurant_photos) -----------------------------------

console.log(`Galerie : ${photos.length} photo(s).`);
for (const ph of photos) {
  const slug = slugById[ph.restaurant_id];
  if (!slug) {
    console.warn(`  ⚠️  photo #${ph.id} : resto ${ph.restaurant_id} introuvable.`);
    failed++;
    continue;
  }
  const target = `${slug}/`;
  if (ph.storage_path.startsWith(target)) {
    skipped++;
    continue;
  }
  const newPath = `${slug}/${stamp()}-${shortId()}.${extOf(ph.storage_path)}`;
  const cErr = await copyFile(ph.storage_path, newPath);
  if (cErr) {
    console.warn(`  ❌ photo #${ph.id} : ${cErr.message}`);
    failed++;
    continue;
  }
  if (!DRY) {
    const { error: uErr } = await supabase
      .from("restaurant_photos")
      .update({ storage_path: newPath })
      .eq("id", ph.id);
    if (uErr) {
      console.warn(`  ❌ photo #${ph.id} (maj base) : ${uErr.message}`);
      failed++;
      continue;
    }
    await removeOld(ph.storage_path);
  }
  console.log(`  ✅ ${ph.storage_path} → ${newPath}`);
  moved++;
}

// --- 2) Couvertures (restaurants.image) -------------------------------------

console.log(`\nCouvertures : ${restaurants.length} resto(s).`);
for (const r of restaurants) {
  const oldPath = pathFromPublicUrl(r.image);
  if (!oldPath) {
    skipped++; // pas d'image, ou URL externe (hors bucket)
    continue;
  }
  const target = `${r.slug}/`;
  if (oldPath.startsWith(target)) {
    skipped++;
    continue;
  }
  const newPath = `${r.slug}/cover-${stamp()}.${extOf(oldPath)}`;
  const cErr = await copyFile(oldPath, newPath);
  if (cErr) {
    console.warn(`  ❌ resto #${r.id} (${r.slug}) : ${cErr.message}`);
    failed++;
    continue;
  }
  if (!DRY) {
    const { error: uErr } = await supabase
      .from("restaurants")
      .update({ image: publicUrl(newPath) })
      .eq("id", r.id);
    if (uErr) {
      console.warn(`  ❌ resto #${r.id} (maj image) : ${uErr.message}`);
      failed++;
      continue;
    }
    await removeOld(oldPath);
  }
  console.log(`  ✅ ${oldPath} → ${newPath}`);
  moved++;
}

console.log(
  `\n${DRY ? "[DRY-RUN] " : ""}Terminé : ${moved} déplacé(s), ${skipped} ignoré(s), ${failed} échec(s).`
);
if (DRY) console.log("Relance sans --dry pour appliquer.");
process.exit(failed > 0 ? 1 : 0);
