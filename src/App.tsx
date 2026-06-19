import { Routes, Route, Navigate } from "react-router-dom";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import PageNotFound from "./pages/PageNotFound";
import Wrapper from "./pages/Wrapper";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import ForcePasswordChangeGate from "./components/ForcePasswordChangeGate";
import RequestAccessPage from "./pages/RequestAccessPage";

function App() {
  return (
    <Routes>
      {/* Redirection de la racine vers /user */}
      <Route path="/" element={<Navigate to="/user" replace />} />

      {/* L'espace admin est fusionné dans /user (sections Demandes / Tables
          visibles pour les admins). On redirige les anciennes URL /admin. */}
      <Route path="/admin/*" element={<Navigate to="/user" replace />} />
      <Route
        path="/user/*"
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/password-oublie" element={<ForgotPassword />} />
      <Route path="/inscription" element={<RequestAccessPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default App;
