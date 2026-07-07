import { describe, expect, it } from "vitest";
import {
  amountDueToday,
  getCheckoutScenario,
  isPowerUpUpgrade,
  planHeroBadgeLabel,
  resolveCheckoutScenario,
  stripeReassuranceLine,
  todayPaymentSubtitle,
} from "./checkout-scenario";
import type { AltaState } from "@/components/asistente/types";
import { initialAlta } from "@/components/asistente/types";

function alta(overrides: Partial<AltaState> = {}): AltaState {
  return { ...initialAlta, restaurant_name: "Test", domain: "test.powerup.menu", ...overrides };
}

describe("powerup upgrade checkout copy", () => {
  it("resolveCheckoutScenario cubre trial_free/custom_domain/management_fee", () => {
    expect(
      resolveCheckoutScenario({
        hasExistingWebsite: false,
        domainIsCustom: false,
      }),
    ).toBe("trial_free");

    expect(
      resolveCheckoutScenario({
        hasExistingWebsite: false,
        domainIsCustom: true,
      }),
    ).toBe("custom_domain");

    expect(
      resolveCheckoutScenario({
        hasExistingWebsite: true,
        domainIsCustom: false,
        managementFeeEnabled: true,
      }),
    ).toBe("management_fee");
  });

  it("isPowerUpUpgrade solo con yes", () => {
    expect(isPowerUpUpgrade(alta({ powerup_customer: "yes" }))).toBe(true);
    expect(isPowerUpUpgrade(alta({ powerup_customer: "no" }))).toBe(false);
    expect(isPowerUpUpgrade(alta({ powerup_customer: "unknown" }))).toBe(false);
  });

  it("badge sin 30 días gratis en upgrade", () => {
    expect(planHeroBadgeLabel(alta({ powerup_customer: "yes" }))).toBe("Upgrade a página web");
    expect(planHeroBadgeLabel(alta({ powerup_customer: "no" }))).toContain("30");
  });

  it("subtitle sin mención a prueba en upgrade", () => {
    const sub = todayPaymentSubtitle(alta({ powerup_customer: "yes" }));
    expect(sub).not.toContain("prueba del Plan Pro · incluye");
    expect(sub).toContain("añade tu página web");
  });

  it("reassurance sin cancelar prueba en upgrade", () => {
    expect(stripeReassuranceLine(alta({ powerup_customer: "yes" }))).not.toContain("prueba");
  });

  it("management_fee inactivo con ENABLE_MANAGEMENT_FEE=false aunque has_existing_website", () => {
    const withWeb = alta({ has_existing_website: true, existing_website_url: "https://ejemplo.es" });
    expect(getCheckoutScenario(withWeb)).toBe("trial_free");
    expect(amountDueToday(withWeb)).toBe(0);
  });
});
