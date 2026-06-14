import { Routes, Route, Navigate } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import PageNotFound from "./pages/PageNotFound";
import Wrapper from "./pages/Wrapper";
import AdminWrapper from "./pages/AdminWrapper";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import ForcePasswordChangeGate from "./components/ForcePasswordChangeGate";
import RequestAccessPage from "./pages/RequestAccessPage";
import ConfirmURLWrapper from "./pages/ConfirmURLWrapper";
import NewInvite from "./pages/NewInvite";

function App() {
  return (
    <Routes>
      {/* Redirection de la racine vers /user */}
      <Route path="/" element={<Navigate to="/user" replace />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <ForcePasswordChangeGate>
              <AdminWrapper>
                <AdminPage />
              </AdminWrapper>
            </ForcePasswordChangeGate>
          </ProtectedRoute>
        }
      />
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
      <Route path="/authentification" element={<ConfirmURLWrapper />} />
      <Route path="/inscription" element={<RequestAccessPage />} />
      <Route path="/invitation-expiree" element={<NewInvite />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default App;
