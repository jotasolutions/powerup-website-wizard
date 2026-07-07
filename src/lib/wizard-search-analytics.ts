import { PLACES_MIN_QUERY_LENGTH } from "@/hooks/usePlacesSuggestions";

export type PlaceOrigin = "google" | "manual";

export function resolvePlaceOrigin(gmbPlaceId: string | null | undefined): PlaceOrigin {
  return gmbPlaceId ? "google" : "manual";
}

export type SearchCaptureState = {
  lastCapturedQuery: string | null;
  searchAttemptCount: number;
};

export const initialSearchCaptureState: SearchCaptureState = {
  lastCapturedQuery: null,
  searchAttemptCount: 0,
};

/** Dispara al arrancar un fetch real (transición a fetching), no al teclear ni en re-render. */
export function shouldCaptureSearchPerformed(params: {
  isFetching: boolean;
  wasFetching: boolean;
  trimmedQuery: string;
  minQueryLength?: number;
  lastCapturedQuery: string | null;
  onRestaurantStep: boolean;
}): boolean {
  if (!params.onRestaurantStep) return false;
  if (!params.isFetching || params.wasFetching) return false;
  const minLen = params.minQueryLength ?? PLACES_MIN_QUERY_LENGTH;
  if (params.trimmedQuery.length < minLen) return false;
  if (params.trimmedQuery === params.lastCapturedQuery) return false;
  return true;
}

export function nextSearchCaptureState(
  state: SearchCaptureState,
  trimmedQuery: string,
): {
  state: SearchCaptureState;
  properties: { search_attempt: number; is_first_search: boolean; query_length: number };
} {
  const searchAttempt = state.searchAttemptCount + 1;
  return {
    state: {
      lastCapturedQuery: trimmedQuery,
      searchAttemptCount: searchAttempt,
    },
    properties: {
      search_attempt: searchAttempt,
      is_first_search: searchAttempt === 1,
      query_length: trimmedQuery.length,
    },
  };
}
