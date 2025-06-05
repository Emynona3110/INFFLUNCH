import { Routes, Route } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import PageNotFound from "./pages/PageNotFound";
import Wrapper from "./pages/Wrapper";

function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Wrapper>
            <AdminPage />
          </Wrapper>
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
