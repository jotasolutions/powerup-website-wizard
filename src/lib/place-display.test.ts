import { describe, expect, it } from "vitest";
import type { PlaceProfile } from "./place-profile.types";
import {
  buildPlaceDataLine,
  shouldShowCuisineLabel,
} from "./place-display";

function profile(overrides: Partial<PlaceProfile>): PlaceProfile {
  return {
    place_id: "test",
    display_name: "Test",
    website_type: "own",
    enrichment_partial: false,
    missing_fields: [],
    ...overrides,
  };
}

/** Casos reales de los 5 CURATED (etapa 5) — congela composición data card. */
describe("buildPlaceDataLine — 5 website_types", () => {
  it("own: cocina específica + rating + reseñas", () => {
    const line = buildPlaceDataLine(
      profile({
        cuisine_label: "Restaurante de alta cocina",
        rating: 4.4,
        review_count: 3272,
      }),
    );
    expect(line).toBe("Restaurante de alta cocina · ★4,4 · 3272 reseñas");
    expect(shouldShowCuisineLabel("Restaurante de alta cocina")).toBe(true);
  });

  it("aggregator: cocina específica + rating + reseñas", () => {
    const line = buildPlaceDataLine(
      profile({
        cuisine_label: "Restaurante de cocina de Oriente Medio",
        rating: 4.9,
        review_count: 82,
      }),
    );
    expect(line).toBe("Restaurante de cocina de Oriente Medio · ★4,9 · 82 reseñas");
  });

  it("social: omite Bar genérico, solo rating + reseñas", () => {
    const line = buildPlaceDataLine(
      profile({
        cuisine_label: "Bar",
        rating: 4.4,
        review_count: 15830,
      }),
    );
    expect(shouldShowCuisineLabel("Bar")).toBe(false);
    expect(line).toBe("★4,4 · 15.830 reseñas");
  });

  it("builder: omite Restaurante genérico, solo rating + reseñas", () => {
    const line = buildPlaceDataLine(
      profile({
        cuisine_label: "Restaurante",
        rating: 4.4,
        review_count: 1646,
      }),
    );
    expect(shouldShowCuisineLabel("Restaurante")).toBe(false);
    expect(line).toBe("★4,4 · 1646 reseñas");
  });

  it("none: cocina específica + rating + reseñas", () => {
    const line = buildPlaceDataLine(
      profile({
        website_type: "none",
        cuisine_label: "Hamburguesería",
        rating: 4.9,
        review_count: 7,
      }),
    );
    expect(line).toBe("Hamburguesería · ★4,9 · 7 reseñas");
  });
});

describe("shouldShowCuisineLabel", () => {
  it("omite vacío y genéricos", () => {
    expect(shouldShowCuisineLabel(undefined)).toBe(false);
    expect(shouldShowCuisineLabel("")).toBe(false);
    expect(shouldShowCuisineLabel("Restaurante")).toBe(false);
    expect(shouldShowCuisineLabel("Bar")).toBe(false);
  });
});
