import { describe, expect, it } from "vitest";
import type { PlaceProfile } from "./place-profile.types";
import {
  PLACE_GAP_AGGREGATOR_GENERIC,
  PLACE_GAP_MESSAGES,
  PLACE_GAP_PLATFORM_PLACEHOLDER,
  PLACE_GAP_SOCIAL_GENERIC,
} from "./place-gap.messages";
import { resolvePlaceGapMessage } from "./place-gap";

function minimalProfile(overrides: Partial<PlaceProfile>): PlaceProfile {
  return {
    place_id: "ChIJtest",
    display_name: "Test Restaurant",
    website_type: "none",
    enrichment_partial: false,
    missing_fields: [],
    ...overrides,
  };
}

describe("resolvePlaceGapMessage", () => {
  it("none → frase exacta del mapa", () => {
    const profile = minimalProfile({ website_type: "none" });
    expect(resolvePlaceGapMessage(profile)).toBe(PLACE_GAP_MESSAGES.none);
  });

  it("builder → frase exacta del mapa", () => {
    const profile = minimalProfile({ website_type: "builder" });
    expect(resolvePlaceGapMessage(profile)).toBe(PLACE_GAP_MESSAGES.builder);
  });

  it("own → frase exacta del mapa", () => {
    const profile = minimalProfile({
      website_type: "own",
      website_uri: "https://www.mirestaurante.com",
    });
    expect(resolvePlaceGapMessage(profile)).toBe(PLACE_GAP_MESSAGES.own);
  });

  it("aggregator con Linktree → sustituye {plataforma}", () => {
    const profile = minimalProfile({
      website_type: "aggregator",
      website_uri: "https://linktr.ee/mirestaurante",
    });
    const message = resolvePlaceGapMessage(profile);

    expect(message).toContain("Linktree");
    expect(message).not.toContain(PLACE_GAP_PLATFORM_PLACEHOLDER);
    expect(message).toBe(
      PLACE_GAP_MESSAGES.aggregator.replace(PLACE_GAP_PLATFORM_PLACEHOLDER, "Linktree"),
    );
  });

  it("social con Facebook → sustituye {plataforma}", () => {
    const profile = minimalProfile({
      website_type: "social",
      website_uri: "https://facebook.com/mirestaurante",
    });
    const message = resolvePlaceGapMessage(profile);

    expect(message).toContain("Facebook");
    expect(message).not.toContain(PLACE_GAP_PLATFORM_PLACEHOLDER);
    expect(message).toBe(
      PLACE_GAP_MESSAGES.social.replace(PLACE_GAP_PLATFORM_PLACEHOLDER, "Facebook"),
    );
  });

  it("aggregator sin marca identificada → respaldo genérico", () => {
    const profile = minimalProfile({
      website_type: "aggregator",
      website_uri: "https://unknown-aggregator.example.com",
    });

    expect(resolvePlaceGapMessage(profile)).toBe(PLACE_GAP_AGGREGATOR_GENERIC);
  });

  it("social sin website_uri → respaldo genérico", () => {
    const profile = minimalProfile({ website_type: "social" });

    expect(resolvePlaceGapMessage(profile)).toBe(PLACE_GAP_SOCIAL_GENERIC);
  });
});
