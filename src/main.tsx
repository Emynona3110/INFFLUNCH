import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { ThemeProvider, useTheme } from "./lib/theme";
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
