import { useEffect, useRef } from "react";
import supabaseClient from "../services/supabaseClient";

type Listener = () => void;

type Entry = {
  channel: ReturnType<typeof supabaseClient.channel> | null;
  /** Une ouverture est déjà en cours (le setAuth est asynchrone). */
  opening: boolean;
  listeners: Set<Listener>;
};

/**
 * Un seul canal par table, partagé par toutes les instances du hook : la même
 * table est souvent écoutée à plusieurs endroits en même temps (la puce d'un
 * onglet et la liste qu'il affiche, par exemple), inutile d'ouvrir une
 * connexion par composant.
 */
const entries = new Map<string, Entry>();

const open = async (table: string, entry: Entry) => {
  entry.opening = true;
  try {
    // Ces tables sont protégées par RLS : sans le JWT, la connexion Realtime
    // reste "anon" et le serveur ne délivre aucun événement.
    const { data } = await supabaseClient.auth.getSession();
    // Tout a pu être démonté pendant l'await.
    if (entry.listeners.size === 0) return;
    await supabaseClient.realtime.setAuth(data.session?.access_token ?? null);
    if (entry.listeners.size === 0) return;

    entry.channel = supabaseClient
      .channel(`${table}-rt-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => entry.listeners.forEach((fn) => fn())
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[realtime ${table}] statut:`, status);
        }
      });
  } finally {
    entry.opening = false;
    // Le dernier auditeur est parti pendant l'ouverture : on referme.
    if (entry.listeners.size === 0) close(table, entry);
  }
};

const close = (table: string, entry: Entry) => {
  if (entry.opening) return; // `open` refermera lui-même en sortant.
  if (entry.channel) supabaseClient.removeChannel(entry.channel);
  entries.delete(table);
};

/**
 * Rejoue `onChange` à chaque INSERT/UPDATE/DELETE sur `table` — en pratique une
 * invalidation react-query, pour que l'écran se mette à jour sans recharger ni
 * changer d'onglet.
 *
 * ⚠️ Nécessite que la table soit dans la publication realtime de Supabase
 * (cf. les scripts `sql/*_realtime.sql`).
 */
const useRealtimeTable = (
  table: string,
  onChange: () => void,
  enabled = true
) => {
  // La callback change à chaque rendu : on la garde dans une ref pour ne pas
  // rouvrir le canal pour autant.
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    let entry = entries.get(table);
    if (!entry) {
      entry = { channel: null, opening: false, listeners: new Set() };
      entries.set(table, entry);
    }
    const listener = () => latest.current();
    entry.listeners.add(listener);
    if (!entry.channel && !entry.opening) void open(table, entry);

    return () => {
      entry!.listeners.delete(listener);
      if (entry!.listeners.size === 0) close(table, entry!);
    };
  }, [table, enabled]);
};

export default useRealtimeTable;
