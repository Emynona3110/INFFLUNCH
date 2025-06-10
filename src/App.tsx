import { Routes, Route, Navigate } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import PageNotFound from "./pages/PageNotFound";
import Wrapper from "./pages/Wrapper";
import AdminWrapper from "./pages/AdminWrapper";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import JoinWaitingList from "./pages/JoinWaitingList";
import ConfirmURLWrapper from "./pages/ConfirmURLWrapper";

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
      <Route path="/reinitialiser-password" element={<ConfirmURLWrapper />} />
      <Route path="/authentification" element={<ConfirmURLWrapper />} />
      <Route path="/inscription" element={<JoinWaitingList />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default App;
