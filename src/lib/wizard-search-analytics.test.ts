import { describe, expect, it } from "vitest";
import {
  initialSearchCaptureState,
  nextSearchCaptureState,
  resolvePlaceOrigin,
  shouldCaptureSearchPerformed,
} from "./wizard-search-analytics";

describe("resolvePlaceOrigin", () => {
  it("devuelve google si hay gmb_place_id", () => {
    expect(resolvePlaceOrigin("ChIJ123")).toBe("google");
  });

  it("devuelve manual sin gmb_place_id", () => {
    expect(resolvePlaceOrigin(null)).toBe("manual");
    expect(resolvePlaceOrigin(undefined)).toBe("manual");
    expect(resolvePlaceOrigin("")).toBe("manual");
  });
});

describe("shouldCaptureSearchPerformed", () => {
  const base = {
    trimmedQuery: "pizza",
    minQueryLength: 3,
    lastCapturedQuery: null as string | null,
    onRestaurantStep: true,
  };

  it("captura en transición a fetching con query válida", () => {
    expect(
      shouldCaptureSearchPerformed({
        ...base,
        isFetching: true,
        wasFetching: false,
      }),
    ).toBe(true);
  });

  it("no captura si no está en paso restaurante", () => {
    expect(
      shouldCaptureSearchPerformed({
        ...base,
        isFetching: true,
        wasFetching: false,
        onRestaurantStep: false,
      }),
    ).toBe(false);
  });

  it("no captura en re-render ya fetching", () => {
    expect(
      shouldCaptureSearchPerformed({
        ...base,
        isFetching: true,
        wasFetching: true,
      }),
    ).toBe(false);
  });

  it("no captura query demasiado corta", () => {
    expect(
      shouldCaptureSearchPerformed({
        ...base,
        trimmedQuery: "ab",
        isFetching: true,
        wasFetching: false,
      }),
    ).toBe(false);
  });

  it("no captura la misma query ya registrada", () => {
    expect(
      shouldCaptureSearchPerformed({
        ...base,
        isFetching: true,
        wasFetching: false,
        lastCapturedQuery: "pizza",
      }),
    ).toBe(false);
  });
});

describe("nextSearchCaptureState", () => {
  it("primera búsqueda: attempt 1 y is_first_search true", () => {
    const { state, properties } = nextSearchCaptureState(initialSearchCaptureState, "pizza");
    expect(properties).toEqual({
      search_attempt: 1,
      is_first_search: true,
      query_length: 5,
    });
    expect(state.searchAttemptCount).toBe(1);
    expect(state.lastCapturedQuery).toBe("pizza");
  });

  it("segunda query distinta incrementa attempt", () => {
    const afterFirst = nextSearchCaptureState(initialSearchCaptureState, "pizza");
    const { properties } = nextSearchCaptureState(afterFirst.state, "sushi");
    expect(properties).toEqual({
      search_attempt: 2,
      is_first_search: false,
      query_length: 5,
    });
  });
});
