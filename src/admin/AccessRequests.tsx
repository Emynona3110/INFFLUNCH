import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCopy } from "react-icons/fi";
import { toast } from "@/lib/toast";
import supabaseClient from "../services/supabaseClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type RequestType = "creation" | "password_reset";
type RequestState = "Waiting" | "Accepted" | "Rejected";

interface AccessRequest {
  id: number;
  email: string;
  type: RequestType;
  state: RequestState;
  created_at: string;
}

const typeLabel: Record<RequestType, string> = {
  creation: "Création de compte",
  password_reset: "Réinit. mot de passe",
};

const AccessRequests = () => {
  const queryClient = useQueryClient();

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  const {
    data: requests = [],
    isPending,
    error,
  } = useQuery<AccessRequest[], Error>({
    queryKey: ["access-requests"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("waiting_list")
        .select("id, email, type, state, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AccessRequest[];
    },
  });

  const sorted = [...requests].sort((a, b) => {
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
    <div className="tw-scope flex h-full flex-col p-4">
      <div className="mb-4 flex h-10 items-center">
        <div
          role="heading"
          aria-level={1}
          className="font-display text-xl font-bold text-foreground"
        >
          Demandes d'accès
        </div>
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
        <div className="min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-card">
          <ScrollArea
            className="h-full os-grid"
            style={{ ["--grid-right" as string]: "211px" }}
          >
            <table className="w-full border-separate border-spacing-0 text-sm" style={{ minWidth: 750 }}>
              <thead>
                <tr>
                  {["Email", "Type", "Date", "Statut / Action"].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "sticky top-0 bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground/55 shadow-[inset_0_-1px_0_0_var(--border)]",
                        i === 3
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
                    <td className="px-4 py-3 text-foreground/80">
                      {typeLabel[req.type]}
                    </td>
                    <td className="px-4 py-3 text-foreground/70">
                      {new Date(req.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="sticky right-0 z-[1] w-px whitespace-nowrap bg-card px-4 py-3 text-center shadow-[inset_1px_0_0_0_var(--border)]">
                      {pending ? (
                        <div className="flex justify-center gap-2">
                          <Button
                            size="default"
                            className="h-9 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                            disabled={processingId === req.id}
                            onClick={() => handleAccept(req)}
                          >
                            Accepter
                          </Button>
                          <Button
                            variant="outline"
                            className="h-9 px-3 text-destructive"
                            disabled={processingId === req.id}
                            onClick={() => handleReject(req)}
                          >
                            Refuser
                          </Button>
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
