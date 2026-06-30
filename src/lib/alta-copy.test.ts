import { describe, expect, it } from "vitest";
import {
  formatConfirmInfoPrompt,
  formatEncontradoBotPrompt,
  formatEncontradoLoadingLabel,
  formatOrderDetailLabel,
  formatSupportBusinessLabel,
} from "./alta-copy";

/** Copy neutro — no depende de business_term (Voltereta Manhattan y similares). */
describe("alta-copy — sin afirmar tipo de local", () => {
  it("confirmarInfo", () => {
    expect(formatConfirmInfoPrompt()).toBe("¿Es correcta esta información?");
  });

  it("encontrado bot y loading", () => {
    expect(formatEncontradoBotPrompt()).toBe("Estamos mirando tu ficha en Google…");
    expect(formatEncontradoLoadingLabel()).toBe("Un momento…");
  });

  it("resumen y soporte", () => {
    expect(formatOrderDetailLabel()).toBe("Local");
    expect(formatSupportBusinessLabel()).toBe("Local");
  });
});
