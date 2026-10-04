import { useEffect, useRef, useState } from "react";
import { Query, useIsFetching, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

/** Au-delà, on montre la page quand même (réseau lent) : mieux vaut un
 *  chargement visible qu'un écran vide. */
const MAX_WAIT_MS = 300;
/** Délai de stabilité : une requête dépendante (activée par le résultat d'une
 *  autre) démarre un rendu plus tard — sans ce sas, on révélerait entre les
 *  deux et la page sauterait quand même. */
const SETTLE_MS = 60;

/** Requête en premier chargement (pas encore de données en cache). Une requête
 *  qui échoue (ou a déjà échoué) ne bloque pas : ses tentatives successives
 *  tiendraient la page masquée jusqu'au plafond à chaque ouverture. */
const isFirstLoad = (q: Query) =>
  q.state.data === undefined &&
  q.state.fetchFailureCount === 0 &&
  q.state.errorUpdateCount === 0;

/**
 * Page (ou sous-onglet) révélée d'un bloc : invisible tant que ses premières
 * données chargent, puis fondu en montant — la transition de la navbar.
 * Seules les requêtes SANS données comptent (premier chargement) : un
 * rafraîchissement en arrière-plan d'un cache déjà servi ne masque rien.
 * Les images ne sont pas attendues : à leurs conteneurs d'avoir une taille.
 * À remonter (prop `key`) pour rejouer la révélation.
 */
const PageReveal = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const queryClient = useQueryClient();
  const loading = useIsFetching({ predicate: isFirstLoad });
  const [ready, setReady] = useState(false);
  // Un premier chargement a-t-il eu lieu ? Sinon, pas de sas à respecter.
  const sawLoading = useRef(false);
  if (loading) sawLoading.current = true;

  // Montage : les effets des enfants sont passés (leurs requêtes sont
  // lancées). Rien à attendre (cache) → fondu tout de suite, sans délai.
  // Sinon, plafond compté d'ici.
  useEffect(() => {
    if (queryClient.isFetching({ predicate: isFirstLoad }) === 0) {
      setReady(true);
      return;
    }
    // Dev : ce qui retient la page (pour traquer un délai inattendu).
    if (import.meta.env.DEV)
      console.debug(
        "[PageReveal] attend",
        queryClient
          .getQueryCache()
          .findAll({ predicate: isFirstLoad, fetchStatus: "fetching" })
          .map((q) => q.queryKey),
      );
    const t = setTimeout(() => setReady(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, [queryClient]);
  // Les premiers chargements sont finis, et ça tient : on révèle.
  useEffect(() => {
    if (loading || !sawLoading.current) return;
    const t = setTimeout(() => setReady(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageReveal;
