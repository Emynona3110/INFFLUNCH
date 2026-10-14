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

/**
 * Feuilles de style déplacées de <head> vers <body>, juste après le
 * monogramme de démarrage (#boot-loader) et #root : une
 * feuille dans <head> bloque TOUT l'affichage jusqu'à son arrivée, monogramme
 * de démarrage compris (écran blanc en connexion lente). Dans <body>, elle ne
 * retient que ce qui la suit (rien de visible), et le script de l'app attend
 * toujours qu'elle soit chargée avant de s'exécuter : pas de page sans style.
 */
function stylesAfterBootLoader(): Plugin {
  return {
    name: "infflunch-styles-after-boot-loader",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const links: string[] = [];
        const head = html.replace(/<head>[\s\S]*<\/head>/, (h) =>
          h.replace(/\s*<link\b(?=[^>]*rel="stylesheet")[^>]*>/g, (link) => {
            links.push(link.trim());
            return "";
          }),
        );
        if (!links.length) return html;
        return head.replace(
          /<div id="root"><\/div>/,
          (root) => `${root}\n    ${links.join("\n    ")}`,
        );
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile(), stylesAfterBootLoader()],
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
