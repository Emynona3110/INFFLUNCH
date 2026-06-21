import { useState } from "react";
import DataManager from "../admin/DataManager";
import AdminUsers from "../admin/AdminUsers";
import { adminSections } from "../services/adminSections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Section "Tables" : Tags (CRUD générique) + Utilisateurs (composant dédié).
// (Badges retiré ; waiting_list a son propre onglet "Demandes".)
const tagsSection = adminSections.find((s) => s.tableName === "tags")!;

const tabs = [
  { key: "tags", label: "Tags" },
  { key: "users", label: "Utilisateurs" },
] as const;

const AdminTablesSection = () => {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("tags");
  const [addSignal, setAddSignal] = useState(0);

  return (
    <div className="tw-scope flex h-full w-full flex-col">
      <div className="mb-3 flex min-h-10 items-center justify-between gap-2 px-4">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition",
                active === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/70 hover:bg-muted/70"
              )}
            >
              {t.label}
            </button>
          ))}
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
        ) : (
          <AdminUsers />
        )}
      </div>
    </div>
  );
};

export default AdminTablesSection;
