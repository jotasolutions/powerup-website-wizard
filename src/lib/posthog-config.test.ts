import { describe, expect, it } from "vitest";
import {
  POSTHOG_PROJECT_TOKEN,
  PRODUCTION_HOSTNAME,
  resolveClientPostHogToken,
  resolveServerPostHogToken,
} from "./posthog-config";

describe("resolveClientPostHogToken", () => {
  it("la variable de entorno manda", () => {
    expect(resolveClientPostHogToken("phc_env", "localhost")).toBe("phc_env");
  });

  it("la clave del código solo se usa en el dominio de producción", () => {
    expect(resolveClientPostHogToken(undefined, PRODUCTION_HOSTNAME)).toBe(POSTHOG_PROJECT_TOKEN);
    expect(resolveClientPostHogToken("", PRODUCTION_HOSTNAME)).toBe(POSTHOG_PROJECT_TOKEN);
    expect(resolveClientPostHogToken(undefined, "localhost")).toBe("");
    expect(resolveClientPostHogToken(undefined, "powerup-website-wizard-xi.vercel.app")).toBe("");
  });
});

describe("resolveServerPostHogToken", () => {
  it("la variable de entorno manda", () => {
    expect(resolveServerPostHogToken("phc_env", undefined)).toBe("phc_env");
  });

  it("la clave del código solo se usa en producción", () => {
    expect(resolveServerPostHogToken(undefined, "production")).toBe(POSTHOG_PROJECT_TOKEN);
    expect(resolveServerPostHogToken(undefined, "preview")).toBeUndefined();
    expect(resolveServerPostHogToken(undefined, undefined)).toBeUndefined();
  });
});
