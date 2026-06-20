import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import Wrapper from "./pages/Wrapper";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import ForcePasswordChangeGate from "./components/ForcePasswordChangeGate";
import RequestAccessPage from "./pages/RequestAccessPage";

/** Redirige les anciennes URL /user/* vers la racine (compat liens existants). */
function RedirectFromUser() {
  const { pathname, search } = useLocation();
  const target = pathname.replace(/^\/user/, "") || "/";
  return <Navigate to={target + search} replace />;
}

function App() {
  return (
    <Routes>
      {/* Pages publiques */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/password-oublie" element={<ForgotPassword />} />
      <Route path="/inscription" element={<RequestAccessPage />} />

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
