import { useEffect, useState } from "react";
import apiClients from "../services/api-clients";
import { AxiosRequestConfig, CanceledError } from "axios";

interface FetchResponse<T> {
  count: number;
  results: T[];
}

const useData = <T>(
  endpoint: string,
  requestConfig?: AxiosRequestConfig,
  depedences?: any[]
) => {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(
    () => {
      const controller = new AbortController();
      const signal = controller.signal;

      setLoading(true);

      apiClients
        .get<FetchResponse<T>>(endpoint, { signal, ...requestConfig })
        .then((res) => {
          setData(res.data.results);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof CanceledError) return;
          setError(err.message);
          setLoading(false);
        });

      return () => controller.abort();
    },
    depedences ? [...depedences] : []
  );

  return { data, error, loading };
};

export default useData;
