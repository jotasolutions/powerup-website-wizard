import { describe, expect, it } from "vitest";
import { buildDomainPreferenceInsight } from "./analytics-domain-insight";

describe("buildDomainPreferenceInsight", () => {
  it("alerta cuando Namecheap empuja downgrades de pago a gratis", () => {
    const insight = buildDomainPreferenceInsight({
      paidChosen: 10,
      freeChosen: 10,
      paidActivationRate: 0.5,
      freeActivationRate: 0.6,
      downgradesTotal: 4,
      namecheapDegraded: 3,
      skipLink: 1,
    });

    expect(insight.tone).toBe("amber");
    expect(insight.message).toContain("Namecheap");
  });

  it("mantiene muestra insuficiente por debajo del umbral", () => {
    const insight = buildDomainPreferenceInsight({
      paidChosen: 5,
      freeChosen: 5,
      paidActivationRate: null,
      freeActivationRate: null,
      downgradesTotal: 3,
      namecheapDegraded: 3,
      skipLink: 0,
    });

    expect(insight.tone).toBe("gray");
    expect(insight.message).toContain("insuficiente");
  });
});
