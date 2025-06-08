import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { useState } from "react";
import supabaseClient from "../services/supabaseClient";

type MutationType = "insert" | "update" | "upsert" | "delete";

type MutationOptions = {
  id?: number | string;
  idColumn?: string; // default to "id"
};

const useMutation = <T>(table: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  };

  const mutate = async (
    type: MutationType,
    payload?: Partial<T> | Partial<T>[],
    options: MutationOptions = {}
  ) => {
    const { id, idColumn = "id" } = options;
    setLoading(true);
    setError(null);
    setSuccess(false);

    let response: PostgrestSingleResponse<any>;

    switch (type) {
      case "insert":
        response = await supabaseClient.from(table).insert(payload!);
        break;

      case "update":
        if (id === undefined) {
          setError("Missing ID for update");
          setLoading(false);
          return;
        }
        response = await supabaseClient
          .from(table)
          .update(payload!)
          .eq(idColumn, id);
        break;

      case "upsert":
        response = await supabaseClient.from(table).upsert(payload!);
        break;

      case "delete":
        if (id === undefined) {
          setError("Missing ID for delete");
          setLoading(false);
          return;
        }
        response = await supabaseClient.from(table).delete().eq(idColumn, id);
        break;

      default:
        setError("Unknown mutation type");
        setLoading(false);
        return;
    }

    if (response.error) {
      setError(response.error.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  return {
    mutate,
    loading,
    error,
    success,
    reset,
  };
};

export default useMutation;
