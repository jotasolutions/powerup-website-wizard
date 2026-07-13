import { describe, expect, it } from "vitest";
import {
  looseVolumeForFunnelStep,
  NARRATIVE_FUNNEL_STEPS,
} from "./analytics-narrative";

describe("NARRATIVE_FUNNEL_STEPS", () => {
  it("usa orden narrativo hasta alta_fulfilled", () => {
    const events = NARRATIVE_FUNNEL_STEPS.map((s) => s.event);
    expect(events).toEqual([
      "wizard_started",
      "wizard_restaurant_located",
      "wizard_place_confirmed",
      "wizard_brecha_viewed",
      "wizard_domain_type_chosen",
      "alta_lead_saved",
      "checkout_session_created",
      "alta_fulfilled",
    ]);
  });

  it("etiqueta alta_fulfilled como inicio de prueba, no publicación de página", () => {
    const fulfilled = NARRATIVE_FUNNEL_STEPS.find((s) => s.event === "alta_fulfilled");
    expect(fulfilled?.label).toBe("Comenzó la prueba");
  });

  it("coloca brecha antes que elección de dominio", () => {
    const brechaIdx = NARRATIVE_FUNNEL_STEPS.findIndex((s) => s.event === "wizard_brecha_viewed");
    const domainIdx = NARRATIVE_FUNNEL_STEPS.findIndex(
      (s) => s.event === "wizard_domain_type_chosen",
    );
    expect(brechaIdx).toBeGreaterThan(-1);
    expect(domainIdx).toBeGreaterThan(brechaIdx);
  });

  it("looseVolumeForFunnelStep agrupa eventos de localización", () => {
    expect(
      looseVolumeForFunnelStep("wizard_restaurant_located", {
        wizard_restaurant_located: 0,
        wizard_restaurant_selected: 4,
        wizard_restaurant_entered_manually: 1,
      }),
    ).toBe(4);
  });
});
