import { describe, expect, it } from "vitest";
import { isTestWhatsappBypass, normalizeWhatsappDigits } from "./whatsapp-validate.server";

describe("normalizeWhatsappDigits", () => {
  it("deja solo dígitos", () => {
    expect(normalizeWhatsappDigits("+34 600 111 222")).toBe("34600111222");
  });
});

describe("isTestWhatsappBypass", () => {
  it("acepta 000000000 y variantes con más ceros", () => {
    expect(isTestWhatsappBypass("000000000")).toBe(true);
    expect(isTestWhatsappBypass("0000000000")).toBe(true);
  });

  it("rechaza números reales", () => {
    expect(isTestWhatsappBypass("34600111222")).toBe(false);
    expect(isTestWhatsappBypass("3400000000")).toBe(false);
  });
});
