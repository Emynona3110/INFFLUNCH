import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { useVersionCheck } from "./hooks/useVersionCheck";
import { useEventCheck } from "./hooks/useEventCheck";
import { lazy, Suspense, useEffect } from "react";
import { releaseBoot } from "./components/brand/screenLoaderControl";
import ScreenLoader from "./components/brand/ScreenLoader";

// Code découpé : le chunk de départ ne contient que la connexion. Le reste du
// site n'est téléchargé qu'une fois connecté (ou à la demande pour les pages
// publiques secondaires).
const loadAuthenticatedApp = () => import("./pages/AuthenticatedApp");
const AuthenticatedApp = lazy(loadAuthenticatedApp);
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const RequestAccessPage = lazy(() => import("./pages/RequestAccessPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

// Session Supabase déjà enregistrée : on lance le téléchargement de l'appli
// tout de suite, en parallèle de la vérification de session, au lieu
// d'attendre sa réponse. Simple anticipation : l'accès reste décidé par
// ProtectedRoute.
try {
  if (Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token")))
    void loadAuthenticatedApp();
} catch {
  /* localStorage indisponible : chargement à la validation de session */
}

/** Attente plein écran pendant le téléchargement d'un chunk. */
const ChunkLoader = () => (
  <div className="tw-scope flex h-screen items-center justify-center bg-background">
    <ScreenLoader />
  </div>
);

/** Redirige les anciennes URL /user/* vers la racine (compat liens existants). */
function RedirectFromUser() {
  const { pathname, search } = useLocation();
  const target = pathname.replace(/^\/user/, "") || "/";
  return <Navigate to={target + search} replace />;
}

function App() {
  // Après le premier rendu (effets des enfants passés : les écrans d'attente
  // ont déjà réclamé le monogramme) : fin du démarrage. Sans relais, le
  // monogramme d'index.html s'efface (page de connexion…).
  useEffect(releaseBoot, []);
  useVersionCheck();
  useEventCheck();
  return (
    <Suspense fallback={<ChunkLoader />}>
      <Routes>
        {/* Pages publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/password-oublie" element={<ForgotPassword />} />
        <Route path="/inscription" element={<RequestAccessPage />} />
        <Route path="/mentions-legales" element={<LegalPage kind="mentions" />} />
        <Route path="/confidentialite" element={<LegalPage kind="confidentialite" />} />

        {/* Compat : anciennes URL /user/* -> racine */}
        <Route path="/user/*" element={<RedirectFromUser />} />

        {/* Application protégée, désormais à la racine. UserPage gère ses propres
            routes imbriquées (restaurants, fiche, mon-compte, à propos, /admin/*). */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AuthenticatedApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
