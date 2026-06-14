import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";

type SupabaseResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * Wrapper léger autour de useQuery pour les requêtes Supabase.
 * Conserve la forme de retour de l'ancien hook useData ({ data, loading, error, empty, refetch })
 * afin de rester un remplacement transparent côté composants.
 */
const useSupabaseQuery = <T>(
  key: QueryKey,
  queryFn: () => PromiseLike<SupabaseResult<T>>,
  options?: Omit<UseQueryOptions<T[], Error>, "queryKey" | "queryFn">
) => {
  const query = useQuery<T[], Error>({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    ...options,
  });

  const data = query.data ?? [];

  return {
    data,
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    empty: !query.isPending && data.length === 0,
    refetch: query.refetch,
  };
};

export default useSupabaseQuery;
