import { useLocation, useNavigate } from "react-router-dom";
import AdminNavbar from "../admin/AdminNavbar";
import DataManager from "../admin/DataManager";
import AccessRequests from "../admin/AccessRequests";
import { adminSections } from "../services/adminSections";

export const AdminPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage =
    adminSections.find((section) => location.pathname.includes(section.path))
      ?.path ?? adminSections[0].path;

  const currentSection = adminSections.find(
    (section) => section.path === currentPage
  );

  return (
    <div className="tw-scope flex h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-[1000] flex h-[60px] shrink-0 items-center border-b border-border bg-card px-4 shadow-sm">
        <AdminNavbar
          page={currentPage}
          setPage={(page) => navigate("/" + page.toLowerCase())}
        />
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        {currentSection?.tableName === "waiting_list" ? (
          <AccessRequests />
        ) : (
          <DataManager section={currentSection ?? adminSections[0]} />
        )}
      </main>
    </div>
  );
};

export default AdminPage;
