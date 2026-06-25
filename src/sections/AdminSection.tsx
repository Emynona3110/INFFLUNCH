import { useState } from "react";
import DataManager from "../admin/DataManager";
import AdminUsers from "../admin/AdminUsers";
import AccessRequests from "../admin/AccessRequests";
import useAccessRequests from "../hooks/useAccessRequests";
import { adminSections } from "../services/adminSections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Section "Admin" : regroupe les 4 tables admin en sous-onglets.
//  - Inscription / Mot de passe : demandes d'accès (composant AccessRequests,
//    une catégorie par onglet, avec puce bleue "en attente").
//  - Utilisateurs : composant dédié (AdminUsers).
//  - Tags : CRUD générique (DataManager).
const tagsSection = adminSections.find((s) => s.tableName === "tags")!;

const tabs = [
  { key: "creation", label: "Inscriptions" },
  { key: "password_reset", label: "Mot de passe" },
  { key: "users", label: "Utilisateurs" },
  { key: "tags", label: "Tags" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const AdminSection = () => {
  const [active, setActive] = useState<TabKey>("creation");
  const [addSignal, setAddSignal] = useState(0);

  // Puces "en attente" sur les onglets Inscription / Mot de passe.
  const { data: requests = [] } = useAccessRequests();
  const waitingByType = (type: "creation" | "password_reset") =>
    requests.filter((r) => r.type === type && r.state === "Waiting").length;

  return (
    <div className="tw-scope flex h-full w-full flex-col">
      <div className="mb-3 flex min-h-10 items-center justify-between gap-2 px-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const isActive = active === t.key;
            const waiting =
              t.key === "creation" || t.key === "password_reset"
                ? waitingByType(t.key)
                : 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={cn(
                  "relative inline-flex cursor-pointer items-center rounded-full px-4 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground/70 hover:bg-muted/70"
                )}
              >
                {t.label}
                {waiting > 0 && (
                  <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-[#f79220] ring-2 ring-background" />
                )}
              </button>
            );
          })}
        </div>
        {/* "Ajouter +" uniquement pour le CRUD générique (Tags). */}
        {active === "tags" && (
          <Button variant="primarySoft" onClick={() => setAddSignal((n) => n + 1)}>
            Ajouter +
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {active === "tags" ? (
          <DataManager section={tagsSection} addSignal={addSignal} />
        ) : active === "users" ? (
          <AdminUsers />
        ) : (
          <AccessRequests activeType={active} />
        )}
      </div>
    </div>
  );
};

export default AdminSection;
