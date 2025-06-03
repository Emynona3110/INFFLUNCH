import { useEffect, useState } from "react";
import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

export type Query = PostgrestFilterBuilder<any, any, any[], string, unknown>;

const useData = <T>(query: Query, deps: any[] = []) => {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data, error }: PostgrestSingleResponse<T[]> = await query;

      if (error) {
        setError(error.message);
        setData([]);
      } else {
        setData(data ?? []);
        setError(null);
      }

      setLoading(false);
    };

    fetchData();
  }, deps);

  return {
    data,
    error,
    loading,
    empty: !loading && data.length === 0,
  };
};

export default useData;
