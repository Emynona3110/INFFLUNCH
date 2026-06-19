import { useState } from "react";
import DataManager from "../admin/DataManager";
import { adminSections } from "../services/adminSections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Les "Tables" regroupent les tables gérées en CRUD générique (Tags, Badges).
// On exclut waiting_list qui a son propre onglet "Demandes".
const tableSections = adminSections.filter(
  (s) => s.tableName !== "waiting_list"
);

const AdminTablesSection = () => {
  const [activePath, setActivePath] = useState(tableSections[0].path);
  const [addSignal, setAddSignal] = useState(0);
  const section =
    tableSections.find((s) => s.path === activePath) ?? tableSections[0];

  return (
    <div className="tw-scope flex h-full w-full flex-col">
      <div className="mb-3 flex min-h-10 items-center justify-between gap-2 px-4">
        <div className="flex gap-2">
          {tableSections.map((s) => {
            const isActive = s.path === activePath;
            return (
              <button
                key={s.path}
                type="button"
                onClick={() => setActivePath(s.path)}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground/70 hover:bg-muted/70"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <Button
          variant="primarySoft"
          onClick={() => setAddSignal((n) => n + 1)}
        >
          Ajouter +
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <DataManager section={section} addSignal={addSignal} />
      </div>
    </div>
  );
};

export default AdminTablesSection;
