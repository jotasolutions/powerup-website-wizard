import { describe, expect, it } from "vitest";
import { deriveDomainDowngraded, mergeDomainInitialChoice } from "./domain-intent";

describe("mergeDomainInitialChoice", () => {
  it("fija la primera elección", () => {
    expect(mergeDomainInitialChoice(null, "paid")).toBe("paid");
    expect(mergeDomainInitialChoice("paid", "free")).toBe("paid");
  });
});

describe("deriveDomainDowngraded", () => {
  it("detecta downgrade pago a gratis", () => {
    expect(
      deriveDomainDowngraded({
        initial: "paid",
        domainIsCustom: false,
        hasExistingWebsite: false,
      }),
    ).toBe(true);
  });

  it("no marca downgrade si acabó con dominio custom", () => {
    expect(
      deriveDomainDowngraded({
        initial: "paid",
        domainIsCustom: true,
        hasExistingWebsite: false,
      }),
    ).toBe(false);
  });

  it("ignora fee de gestión (has_existing_website)", () => {
    expect(
      deriveDomainDowngraded({
        initial: "paid",
        domainIsCustom: false,
        hasExistingWebsite: true,
      }),
    ).toBe(false);
  });

  it("no aplica si la intención inicial fue gratis", () => {
    expect(
      deriveDomainDowngraded({
        initial: "free",
        domainIsCustom: false,
        hasExistingWebsite: false,
      }),
    ).toBe(false);
  });
});
