import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import useRememberedTab from "@/hooks/useRememberedTab";
import useMediaQuery from "@/hooks/useMediaQuery";
import { MobileTabSwitcher } from "@/components/MobileTabSwitcher";
import DataManager from "../admin/DataManager";
import AdminUsers from "../admin/AdminUsers";
import AccessRequests from "../admin/AccessRequests";
import AdminFeedback, { useNewFeedbackCount } from "../admin/AdminFeedback";
import useAccessRequests from "../hooks/useAccessRequests";
import { adminSections } from "../services/adminSections";
import { cn } from "@/lib/utils";

// Section "Admin" : regroupe les 4 tables admin en sous-onglets.
//  - Demandes : boîte de réception des bugs / idées envoyés par les collègues,
//    avec une puce tant qu'il en reste en attente. En premier : c'est ce qu'on
//    vient consulter le plus souvent.
//  - Inscription / Mot de passe : demandes d'accès (composant AccessRequests,
//    une catégorie par onglet, avec puce bleue "en attente").
//  - Utilisateurs : composant dédié (AdminUsers).
//  - Tags : CRUD générique (DataManager).
//
// Navigation entre sous-onglets : pills sur desktop, roue « ‹ Onglet › » dans
// le bandeau sur mobile (comme Mon compte). Pas de balayage ici, contrairement
// à Mon compte : les tables défilent horizontalement, le geste leur revient.
const tagsSection = adminSections.find((s) => s.tableName === "tags")!;

const tabs = [
  { key: "feedback", label: "Demandes" },
  { key: "creation", label: "Inscriptions" },
  { key: "password_reset", label: "Mot de passe" },
  { key: "users", label: "Utilisateurs" },
  { key: "tags", label: "Tags" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const AdminSection = () => {
  // On revient sur le dernier onglet ouvert quand on repasse par la navbar.
  const [active, setActive] = useRememberedTab<TabKey>(
    "admin",
    "feedback",
    (v): v is TabKey => tabs.some((t) => t.key === v)
  );

  // Puces "en attente" sur les onglets Inscription / Mot de passe.
  const { data: requests = [] } = useAccessRequests();
  const waitingByType = (type: "creation" | "password_reset") =>
    requests.filter((r) => r.type === type && r.state === "Waiting").length;

  // Puce "demandes en attente" sur l'onglet Demandes.
  const newFeedback = useNewFeedbackCount();

  const waitingFor = (key: TabKey) =>
    key === "creation" || key === "password_reset"
      ? waitingByType(key)
      : key === "feedback"
        ? newFeedback
        : 0;

  const isDesktop = useMediaQuery("(min-width: 640px)");
  const index = tabs.findIndex((t) => t.key === active);

  // Cible du portail. Le bandeau appartient au Layout, qui décide de le monter
  // d'après la même media query — mais pas forcément dans le même commit, les
  // deux composants s'abonnant chacun de leur côté. En ne regardant qu'une
  // fois, on pouvait tomber sur un bandeau pas encore monté et ne jamais
  // revoir celui apparu juste après : la roue des onglets disparaissait en
  // redimensionnant la fenêtre de desktop à mobile. D'où le second regard au
  // rendu suivant.
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () =>
      setToolbarSlot((prev) => {
        const el = document.getElementById("page-toolbar");
        return prev === el ? prev : el;
      });
    find();
    const raf = requestAnimationFrame(find);
    return () => cancelAnimationFrame(raf);
  }, [isDesktop]);

  // Mobile : onglets déjà ouverts (les autres restent vides tant qu'on n'y est
  // pas passé → pas de requêtes inutiles).
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set([active]));
  useEffect(() => {
    setVisited((v) => (v.has(active) ? v : new Set(v).add(active)));
  }, [active]);

  // Contenu d'un sous-onglet (partagé par le desktop et le pager mobile).
  const renderTab = (tab: TabKey) =>
    tab === "tags" ? (
      <DataManager section={tagsSection} />
    ) : tab === "users" ? (
      <AdminUsers />
    ) : tab === "feedback" ? (
      <AdminFeedback />
    ) : (
      <AccessRequests activeType={tab} />
    );

  return (
    <div className="tw-scope flex h-full w-full flex-col">
      {/* Mobile : la roue est portée dans le bandeau sous la navbar
          (#page-toolbar, fourni par le Layout). */}
      {toolbarSlot &&
        createPortal(
          <div className="flex w-full items-center gap-2">
            <MobileTabSwitcher
              className="min-w-0 flex-1"
              tabs={tabs.map((t) => ({
                key: t.key,
                label: t.label,
                dot: waitingFor(t.key) > 0,
              }))}
              active={active}
              onChange={setActive}
            />
          </div>,
          toolbarSlot
        )}

      {/* Desktop : pills. */}
      <div className="mb-3 hidden min-h-10 items-center justify-between gap-2 px-4 sm:flex">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const isActive = active === t.key;
            const waiting = waitingFor(t.key);
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
      </div>

      {isDesktop ? (
        <div className="min-h-0 flex-1">{renderTab(active)}</div>
      ) : (
        /* Mobile : pager façon appli native — chaque table est une « fenêtre »
           pleine hauteur (elle gère son propre scroll), la piste glisse d'un
           écran à l'autre en même temps que la roue. Les marges du Layout sont
           annulées pour que les panneaux n'aient que leurs 10 px à eux. */
        <div className="-mx-2.5 -my-3 min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {tabs.map((t) => (
              <div
                key={t.key}
                className="h-full w-full shrink-0 overflow-hidden p-2.5"
              >
                {visited.has(t.key) && renderTab(t.key)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSection;
