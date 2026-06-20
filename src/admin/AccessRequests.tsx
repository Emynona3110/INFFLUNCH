import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiCopy, FiCheck, FiX } from "react-icons/fi";
import { toast } from "@/lib/toast";
import supabaseClient from "../services/supabaseClient";
import useAccessRequests, {
  AccessRequest,
  RequestState,
  requestTypes,
} from "../hooks/useAccessRequests";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const AccessRequests = () => {
  const queryClient = useQueryClient();

  const [activeType, setActiveType] = useState(requestTypes[0].type);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  const { data: requests = [], isPending, error } = useAccessRequests();

  // Nombre de demandes en attente par type (pour les puces des onglets).
  const waitingByType = (type: AccessRequest["type"]) =>
    requests.filter((r) => r.type === type && r.state === "Waiting").length;

  // Demandes du type actif, en attente d'abord.
  const sorted = requests
    .filter((r) => r.type === activeType)
    .sort((a, b) => {
      if (a.state === "Waiting" && b.state !== "Waiting") return -1;
      if (a.state !== "Waiting" && b.state === "Waiting") return 1;
      return 0;
    });

  const setState = (id: number, state: RequestState) =>
    supabaseClient.from("waiting_list").update({ state }).eq("id", id);

  const handleAccept = async (req: AccessRequest) => {
    setProcessingId(req.id);
    const { data, error } = await supabaseClient.functions.invoke(
      "admin-create-user",
      { body: { email: req.email, type: req.type } }
    );

    if (error || data?.error) {
      let description = data?.error;
      if (!description && error?.context) {
        try {
          description = (await error.context.json())?.error;
        } catch {
          /* ignore */
        }
      }
      setProcessingId(null);
      toast({
        title: "Action impossible",
        description: description || "Une erreur est survenue.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    await setState(req.id, "Accepted");
    setProcessingId(null);
    setCredentials({ email: data.email, tempPassword: data.tempPassword });
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  const handleReject = async (req: AccessRequest) => {
    setProcessingId(req.id);
    const { error } = await setState(req.id, "Rejected");
    setProcessingId(null);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["access-requests"] });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié", status: "success", duration: 1500 });
  };

  return (
    <div className="tw-scope flex h-full w-full flex-col px-4 pb-4">
      <div className="mb-3 flex min-h-10 flex-wrap items-center gap-2">
        {requestTypes.map((t) => {
          const isActive = t.type === activeType;
          const waiting = waitingByType(t.type);
          return (
            <button
              key={t.type}
              type="button"
              onClick={() => setActiveType(t.type)}
              className={cn(
                "relative inline-flex cursor-pointer items-center rounded-full px-4 py-1.5 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/70 hover:bg-muted/70"
              )}
            >
              {t.label}
              {waiting > 0 && (
                <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
              )}
            </button>
          );
        })}
      </div>

      {isPending ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive">Erreur : {error.message}</p>
      ) : sorted.length === 0 ? (
        <p className="text-foreground/60">Aucune demande.</p>
      ) : (
        <div className="flex max-h-full flex-col overflow-hidden rounded-card border border-border bg-card">
          <ScrollArea
            className="min-h-0 os-grid"
            style={{ ["--grid-right" as string]: "117px" }}
          >
            <table className="w-full border-separate border-spacing-0 text-sm" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  {["Email", "Date", "Statut / Action"].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "sticky top-0 bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]",
                        h === "Statut / Action"
                          ? "right-0 z-20 w-px whitespace-nowrap text-center shadow-[inset_1px_0_0_0_var(--border),inset_0_-1px_0_0_var(--border)]"
                          : "z-10 text-left"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
              {sorted.map((req) => {
                const pending = req.state === "Waiting";
                return (
                  <tr
                    key={req.id}
                    className={cn(
                      "transition [&>td]:border-t [&>td]:border-border/60",
                      pending ? "hover:bg-muted/40" : "opacity-60"
                    )}
                  >
                    <td className="px-4 py-3 text-foreground/90">{req.email}</td>
                    <td className="px-4 py-3 text-foreground/70">
                      {new Date(req.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="sticky right-0 z-[1] w-px whitespace-nowrap bg-card px-4 py-3 text-center shadow-[inset_1px_0_0_0_var(--border)]">
                      {pending ? (
                        <div className="flex justify-center gap-2">
                          <Tooltip label="Accepter">
                            <button
                              type="button"
                              aria-label="Accepter"
                              disabled={processingId === req.id}
                              onClick={() => handleAccept(req)}
                              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-emerald-600 transition hover:bg-emerald-500/10 disabled:pointer-events-none disabled:opacity-50"
                            >
                              <FiCheck className="h-5 w-5" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Refuser">
                            <button
                              type="button"
                              aria-label="Refuser"
                              disabled={processingId === req.id}
                              onClick={() => handleReject(req)}
                              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-destructive transition hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                            >
                              <FiX className="h-5 w-5" />
                            </button>
                          </Tooltip>
                        </div>
                      ) : req.state === "Accepted" ? (
                        <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                          Acceptée
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          Refusée
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {/* Mot de passe temporaire après acceptation */}
      {credentials && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCredentials(null)}
        >
          <div
            className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              role="heading"
              aria-level={2}
              className="font-display text-xl font-bold text-card-foreground"
            >
              Demande acceptée ✅
            </div>
            <p className="mt-3 text-sm text-foreground/80">
              Transmets ces identifiants à <b>{credentials.email}</b> via Teams.
              Le mot de passe devra être changé à la prochaine connexion.
            </p>
            <div className="mt-4">
              <span className="text-xs text-foreground/50">
                Mot de passe temporaire
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-md bg-muted px-3 py-1.5 text-base text-foreground">
                  {credentials.tempPassword}
                </code>
                <button
                  type="button"
                  onClick={() => copy(credentials.tempPassword)}
                  aria-label="Copier"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-border text-foreground/70 transition hover:bg-muted"
                >
                  <FiCopy />
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setCredentials(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRequests;
