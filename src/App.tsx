import { Routes, Route, Navigate } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import PageNotFound from "./pages/PageNotFound";
import Wrapper from "./pages/Wrapper";
import AdminWrapper from "./pages/AdminWrapper";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Redirection de la racine vers /user */}
      <Route path="/" element={<Navigate to="/user" replace />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminWrapper>
              <AdminPage />
            </AdminWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/*"
        element={
          <ProtectedRoute>
            <Wrapper>
              <UserPage />
            </Wrapper>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/password-oublie" element={<ForgotPassword />} />
      <Route path="/reinitialiser-password" element={<ResetPassword />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default App;
