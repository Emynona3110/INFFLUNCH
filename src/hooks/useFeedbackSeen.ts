import { useCallback, useEffect, useState } from "react";
import useFeedback from "./useFeedback";

const KEY = "infflunch:feedback-seen";
const EVENT = "infflunch:feedback-seen-change";

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/**
 * Puce « une de mes demandes a été classée » : on compare la date du dernier
 * classement admin (`handled_at`, posé à chaque changement de statut) à ce que
 * l'utilisateur a déjà vu, gardé en localStorage — comme les nouveautés et les
 * succès.
 *
 * Le temps réel vient de `useFeedback` lui-même : son canal Realtime rafraîchit
 * la liste, donc la puce s'allume à la seconde où l'admin tranche.
 *
 * Une demande corrigée par son auteur repart en attente avec `handled_at` à
 * null : agir sur sa propre demande n'allume donc jamais la puce.
 */
const useFeedbackSeen = () => {
  const { data: items = [] } = useFeedback("mine");
  const [seen, setSeen] = useState<string>(read);

  useEffect(() => {
    const sync = () => setSeen(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const latest = items.reduce(
    (max, item) => (item.handled_at && item.handled_at > max ? item.handled_at : max),
    ""
  );

  const markSeen = useCallback(() => {
    if (!latest) return;
    try {
      localStorage.setItem(KEY, latest);
    } catch {
      /* stockage indisponible : pas bloquant */
    }
    window.dispatchEvent(new Event(EVENT));
  }, [latest]);

  // Comparaison lexicographique d'ISO dates. "" (jamais vu) < toute date.
  return { hasUnseen: !!latest && latest > seen, markSeen };
};

export default useFeedbackSeen;
