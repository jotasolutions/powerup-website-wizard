import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GmbResult } from "@/components/asistente/types";
import type { AddressSuggestion } from "@/lib/google-places.server";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;
const STALE_TIME_MS = 30_000;

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useGmbSearch(
  query: string,
  searchFn: (args: { data: { query: string } }) => Promise<{ results: GmbResult[] }>,
) {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  return useQuery({
    queryKey: ["places", "gmb", debouncedQuery],
    queryFn: () => searchFn({ data: { query: debouncedQuery } }),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
    retry: 1,
  });
}

export function useAddressAutocomplete(
  query: string,
  sessionToken: string,
  autocompleteFn: (args: {
    data: { query: string; session_token?: string };
  }) => Promise<{ suggestions: AddressSuggestion[] }>,
) {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  return useQuery({
    queryKey: ["places", "address", debouncedQuery, sessionToken],
    queryFn: () =>
      autocompleteFn({
        data: { query: debouncedQuery, session_token: sessionToken },
      }),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
    retry: 1,
  });
}

export { MIN_QUERY_LENGTH as PLACES_MIN_QUERY_LENGTH };
