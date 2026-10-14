import { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Écritures optimistes : l'écran change au clic, le serveur suit.
 *
 * Mode d'emploi, dans un useMutation :
 * - `onMutate`  → `return patchQueries(queryClient, [[clé, (prev) => suivant], …])`
 *   (annule les lectures en cours, photographie les caches, applique le patch) ;
 * - `onError`   → `rollbackQueries(queryClient, context)` (remet les photos) ;
 * - `onSettled` → `settleWhenIdle(queryClient, mutationKey, invalider)`.
 *
 * Les écritures d'une même famille partagent un `mutationKey` et un `scope` :
 * TanStack les exécute alors l'une après l'autre, dans l'ordre des clics, et
 * l'on ne recharge qu'après la dernière — un rechargement intermédiaire
 * effacerait l'état optimiste des suivantes, l'écran ferait des allers-retours.
 *
 * Une clé PARTIELLE patche toutes les requêtes qui commencent par elle
 * (ex. ["reactions", "review"] : toutes les listes de réactions d'avis).
 *
 * Pas pour les formulaires d'AJOUT (avis, photos, menus, demandes, restos
 * proposés) : on y attend la réponse, qui peut refuser la saisie.
 */

type Snapshot = [QueryKey, unknown][];
export type OptimisticContext = { snapshots: Snapshot };

export const patchQueries = async (
  queryClient: QueryClient,
  patches: [QueryKey, (prev: never) => unknown][]
): Promise<OptimisticContext> => {
  const snapshots: Snapshot = [];
  for (const [queryKey, update] of patches) {
    await queryClient.cancelQueries({ queryKey });
    snapshots.push(...queryClient.getQueriesData({ queryKey }));
    // Pas de patch sur un cache vide : rien à afficher, le refetch suivra.
    queryClient.setQueriesData({ queryKey }, (prev: unknown) =>
      prev === undefined ? prev : update(prev as never)
    );
  }
  return { snapshots };
};

export const rollbackQueries = (
  queryClient: QueryClient,
  context: OptimisticContext | undefined
) => {
  context?.snapshots.forEach(([key, data]) =>
    queryClient.setQueryData(key, data)
  );
};

/** Lance `invalidate` une fois la DERNIÈRE écriture de la file terminée.
 *  Pendant onSettled, l'écriture qui se termine compte encore parmi les
 *  en-cours, d'où le `<= 1`. */
export const settleWhenIdle = (
  queryClient: QueryClient,
  mutationKey: QueryKey,
  invalidate: () => void
) => {
  if (queryClient.isMutating({ mutationKey }) <= 1) invalidate();
};
