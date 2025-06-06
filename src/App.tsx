import { Routes, Route, Navigate } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import PageNotFound from "./pages/PageNotFound";
import Wrapper from "./pages/Wrapper";
import AdminWrapper from "./pages/AdminWrapper";

function App() {
  return (
    <Routes>
      {/* Redirection de la racine vers /user */}
      <Route path="/" element={<Navigate to="/user" replace />} />

      <Route
        path="/admin/*"
        element={
          <AdminWrapper>
            <AdminPage />
          </AdminWrapper>
        }
      />
      <Route
        path="/user/*"
        element={
          <Wrapper>
            <UserPage />
          </Wrapper>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default App;
