import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import supabaseClient from "@/services/supabaseClient";
import useSession from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { CANDIES_DB } from "@/events/candiesDb";
import { currentEvent, eventTheme } from "@/events";
import { EVENTS } from "@/events/calendar";

/** Une ligne d'action : titre, détail, bouton. */
const Row = ({
  title,
  detail,
  action,
  onClick,
  disabled,
}: {
  title: string;
  detail: string;
  action: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-3">
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-card-foreground">{title}</span>
      <span className="block text-xs text-foreground/60">{detail}</span>
    </span>
    <Button variant="outline" disabled={disabled} onClick={onClick}>
      {action}
    </Button>
  </div>
);

/**
 * Onglet admin « Évènements » : les fenêtres de l'évènement affiché, à
 * rejouer pour les régler (annonce, trophée…), et la remise à zéro de sa
 * chasse aux bonbons. L'évènement affiché se choisit dans l'onglet Décors.
 */
const AdminEvents = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const replays = eventTheme()?.replays ?? [];
  const label = EVENTS.find((e) => e.id === currentEvent)?.label;

  /** Rend SES bonbons (chasse d'Halloween 2026) et retire son trophée,
   *  pour rejouer la chasse en test. Les autres joueurs ne sont pas touchés. */
  const resetCandies = async () => {
    if (!userId) return;
    setResetting(true);
    const candies = await supabaseClient.from("event_candies").delete().eq("user_id", userId);
    const trophies = await supabaseClient.from("user_trophies").delete().eq("user_id", userId);
    const error = candies.error ?? trophies.error;
    setResetting(false);
    if (error) {
      toast({ title: "Remise à zéro impossible.", status: "error" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["event-candies"] });
    queryClient.invalidateQueries({ queryKey: ["trophies"] });
    toast({ title: "Tes bonbons sont remis en place.", status: "success" });
  };

  return (
    <div className="tw-scope flex h-full w-full flex-col overflow-y-auto sm:px-4 sm:pb-4">
      <div className="flex w-full max-w-xl flex-col gap-2">
        {!label ? (
          <p className="m-0 rounded-card border border-dashed border-border bg-card p-4 text-sm text-foreground/60">
            Aucun évènement affiché. Choisis-en un dans l'onglet Décors pour
            rejouer ses fenêtres.
          </p>
        ) : (
          <>
            <p className="m-0 mb-1 text-sm text-foreground/60">
              Évènement affiché : <span className="font-semibold text-foreground">{label}</span>
            </p>
            {replays.map((r) => (
              <Row key={r.label} title={r.label} detail={r.detail} action="Revoir" onClick={r.run} />
            ))}
            {CANDIES_DB && currentEvent === "halloween" && (
              <Row
                title="Chasse aux bonbons"
                detail="Remet en place les bonbons que tu as trouvés et retire ton trophée."
                action="Remettre à zéro"
                disabled={resetting}
                onClick={resetCandies}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminEvents;
