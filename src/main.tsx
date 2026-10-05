import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { ThemeProvider, useTheme } from "./lib/theme";
import { registerServiceWorker } from "./services/push";
import "overlayscrollbars/overlayscrollbars.css";
import "./tailwind.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const ThemedToaster = () => {
  const { theme } = useTheme();
  return <Toaster richColors position="bottom-right" theme={theme} />;
};

// Service worker : uniquement pour recevoir les notifications push (aucun
// cache offline). Sans lui, pas d'abonnement possible.
registerServiceWorker();

// Fondu des photos à leur arrivée (cf. tailwind.css, img[data-fade]).
// `load`/`error` ne remontent pas : on les capte en phase de capture. Une
// image en erreur est aussi marquée, sinon elle resterait invisible.
const markImageLoaded = (e: Event) => {
  if (e.target instanceof HTMLImageElement) e.target.dataset.loaded = "";
};
document.addEventListener("load", markImageLoaded, true);
document.addEventListener(
  "error",
  (e) => {
    // Image redimensionnée en échec (cf. lib/imageUrl) : on retombe sur
    // l'original avant de déclarer l'image chargée.
    const img = e.target;
    if (img instanceof HTMLImageElement && img.dataset.original) {
      img.src = img.dataset.original;
      delete img.dataset.original;
      return;
    }
    markImageLoaded(e);
  },
  true,
);
// Image déjà en cache : React pose `src` AVANT d'insérer l'élément, elle peut
// finir de charger hors du document — son `load` ne nous parvient jamais et
// elle resterait blanche. On rattrape donc à l'insertion celles déjà prêtes.
const markIfComplete = (img: HTMLImageElement) => {
  if (img.complete && !("loaded" in img.dataset)) img.dataset.loaded = "";
};
new MutationObserver((mutations) => {
  for (const m of mutations)
    for (const node of m.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node instanceof HTMLImageElement && node.hasAttribute("data-fade"))
        markIfComplete(node);
      else
        node
          .querySelectorAll<HTMLImageElement>("img[data-fade]")
          .forEach(markIfComplete);
    }
}).observe(document.documentElement, { childList: true, subtree: true });

// Un chunk de l'ancien build a disparu après un déploiement : on recharge.
window.addEventListener("vite:preloadError", () => location.reload());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
