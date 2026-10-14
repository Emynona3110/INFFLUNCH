import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import Wrapper from "./pages/Wrapper";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import ForcePasswordChangeGate from "./components/ForcePasswordChangeGate";
import RequestAccessPage from "./pages/RequestAccessPage";
import LegalPage from "./pages/LegalPage";
import { useVersionCheck } from "./hooks/useVersionCheck";
import { useEffect } from "react";
import { releaseBoot } from "./components/brand/screenLoaderControl";

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
  return (
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
            <ForcePasswordChangeGate>
              <Wrapper>
                <UserPage />
              </Wrapper>
            </ForcePasswordChangeGate>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
