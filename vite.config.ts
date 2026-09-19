import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** Identifiant unique du build, injecté dans le bundle ET écrit dans dist/version.json. */
const BUILD_ID = Date.now().toString(36);

/** Écrit dist/version.json en fin de build (lu par useVersionCheck). */
function versionFile(): Plugin {
  let outDir = "dist";
  return {
    name: "infflunch-version-file",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      writeFileSync(resolve(outDir, "version.json"), JSON.stringify({ id: BUILD_ID }));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile()],
  base: "/",
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
