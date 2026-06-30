import { describe, expect, it } from "vitest";
import {
  detectPowerUpFromProfile,
  normalizePowerUpCustomerForPersist,
  resolvePowerUpCustomerForFlow,
} from "./powerup-customer";
import type { PlaceProfile } from "./place-profile.types";

function baseProfile(overrides: Partial<PlaceProfile> = {}): PlaceProfile {
  return {
    place_id: "ChIJtest",
    display_name: "Test",
    website_type: "own",
    enrichment_partial: false,
    missing_fields: [],
    ...overrides,
  };
}

describe("detectPowerUpFromProfile", () => {
  it("detecta carta powerup.menu", () => {
    expect(
      detectPowerUpFromProfile(
        baseProfile({ website_uri: "https://bar-la-plaza.powerup.menu" }),
      ),
    ).toEqual({
      status: "yes",
      domain: "bar-la-plaza.powerup.menu",
    });
  });

  it("web ajena → unknown", () => {
    expect(
      detectPowerUpFromProfile(baseProfile({ website_uri: "https://www.diverxo.com" })),
    ).toEqual({ status: "unknown" });
  });

  it("sin web → unknown", () => {
    expect(detectPowerUpFromProfile(baseProfile({ website_type: "none" }))).toEqual({
      status: "unknown",
    });
  });
});

describe("resolvePowerUpCustomerForFlow", () => {
  it("yes explícito permanece yes", () => {
    expect(resolvePowerUpCustomerForFlow("yes")).toBe("yes");
  });

  it("detecta yes desde perfil aunque estado sea unknown", () => {
    const profile = baseProfile({ website_uri: "https://bar.powerup.menu" });
    expect(resolvePowerUpCustomerForFlow("unknown", profile)).toBe("yes");
  });

  it("unknown sin perfil powerup → no", () => {
    expect(resolvePowerUpCustomerForFlow("unknown")).toBe("no");
    expect(resolvePowerUpCustomerForFlow("no")).toBe("no");
  });
});

describe("normalizePowerUpCustomerForPersist", () => {
  it("unknown → no", () => {
    expect(normalizePowerUpCustomerForPersist("unknown")).toBe("no");
  });

  it("yes permanece yes", () => {
    expect(normalizePowerUpCustomerForPersist("yes")).toBe("yes");
  });
});
