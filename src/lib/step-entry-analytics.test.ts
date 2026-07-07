import { describe, expect, it } from "vitest";
import { isStepEntry } from "./step-entry-analytics";

describe("isStepEntry", () => {
  it("detecta entrada inicial al paso objetivo", () => {
    expect(
      isStepEntry({
        previousStep: "confirmarInfo",
        currentStep: "brecha",
        targetStep: "brecha",
      }),
    ).toBe(true);
  });

  it("no dispara en re-render dentro del mismo paso", () => {
    expect(
      isStepEntry({
        previousStep: "brecha",
        currentStep: "brecha",
        targetStep: "brecha",
      }),
    ).toBe(false);
  });

  it("vuelve a disparar al re-entrar al paso tras salir", () => {
    expect(
      isStepEntry({
        previousStep: "elegirDominio",
        currentStep: "brecha",
        targetStep: "brecha",
      }),
    ).toBe(true);
  });
});
