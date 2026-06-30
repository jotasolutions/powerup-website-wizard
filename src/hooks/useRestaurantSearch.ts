import { useCallback, useState } from "react";
import type { GmbResult } from "@/components/asistente/types";
import { ALTA_SEARCH_ERROR } from "@/lib/alta-copy";
import { PLACES_MIN_QUERY_LENGTH, useGmbSearch } from "./usePlacesSuggestions";

export function useRestaurantSearch(
  searchFn: (args: { data: { query: string } }) => Promise<{ results: GmbResult[] }>,
) {
  const [query, setQuery] = useState("");
  const { data, isFetching, error } = useGmbSearch(query, searchFn);
  const results = data?.results ?? [];
  const trimmed = query.trim();
  const showSuggestions = trimmed.length >= PLACES_MIN_QUERY_LENGTH;

  const searchError =
    error instanceof Error
      ? error.message
      : error
        ? ALTA_SEARCH_ERROR
        : null;

  const pick = useCallback(
    (placeId: string): GmbResult | undefined =>
      results.find((r) => r.place_id === placeId),
    [results],
  );

  const reset = useCallback(() => setQuery(""), []);

  return {
    query,
    setQuery,
    results,
    isFetching,
    searchError,
    showSuggestions,
    pick,
    reset,
  };
}
