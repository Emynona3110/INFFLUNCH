import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronDown } from "react-icons/bs";
import darkLogo from "../assets/infflux.svg";
import lightLogo from "../assets/w-infflux.svg";
import ColorModeSwitch from "../components/ColorModeSwitch";
import { adminSections } from "../services/adminSections";
import { cn } from "@/lib/utils";

interface AdminNavbarProps {
  page: string;
  setPage: (page: string) => void;
}

const AdminNavbar = ({ page, setPage }: AdminNavbarProps) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentLabel =
    adminSections.find((item) => item.path === page)?.label ?? "Menu";

  return (
    <div className="flex h-full w-full select-none items-center justify-between gap-1">
      <div className="flex h-full items-center gap-1">
        <div
          className="flex cursor-pointer items-center"
          onClick={() => navigate("/user")}
        >
          <img src={darkLogo} alt="" className="block h-8 w-8 dark:hidden" />
          <img src={lightLogo} alt="" className="hidden h-8 w-8 dark:block" />
          <span className="ml-1 mr-4 hidden font-display text-xl font-extrabold text-[#113894] dark:text-white lg:block">
            ADMINFFLUNCH
          </span>
        </div>

        {/* Onglets desktop */}
        <nav className="hidden h-full items-center lg:flex">
          {adminSections.map((item) => {
            const isActive = item.path === page;
            return (
              <div key={item.path} className="h-full px-2.5">
                <button
                  type="button"
                  onClick={() => setPage(item.path)}
                  className={cn(
                    "flex h-full cursor-pointer items-center border-b-2 text-xl transition",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-foreground/50 hover:text-foreground"
                  )}
                >
                  {/* Calque fantôme gras : réserve la largeur → pas de saut d'1px */}
                  <span className="grid">
                    <span
                      className={cn(
                        "col-start-1 row-start-1",
                        isActive && "font-semibold"
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      aria-hidden
                      className="invisible col-start-1 row-start-1 font-semibold"
                    >
                      {item.label}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Menu mobile */}
        <div className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-muted"
          >
            {currentLabel}
            <BsChevronDown />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                {adminSections.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setPage(item.path);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "block w-full cursor-pointer px-4 py-2 text-left text-base transition hover:bg-muted",
                      page === item.path
                        ? "font-semibold text-primary"
                        : "text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ColorModeSwitch />
    </div>
  );
};

export default AdminNavbar;
