import { describe, expect, it } from "vitest";
import { resolveDomainPrefetchOutcome } from "./domain-prefetch";

describe("resolveDomainPrefetchOutcome", () => {
  it("usa el candidato .es cuando está disponible", () => {
    const outcome = resolveDomainPrefetchOutcome("voltereta-kioto.es", {
      available: true,
      price: 14.9,
    });
    expect(outcome.primary).toEqual({ domain: "voltereta-kioto.es", price: 14.9 });
    expect(outcome.unavailableCandidate).toBeUndefined();
    expect(outcome.moreAlternatives).toEqual([]);
  });

  it("promueve la primera alternativa si el .es exacto está cogido", () => {
    const outcome = resolveDomainPrefetchOutcome("voltereta-kioto.es", {
      available: false,
      alternatives: [
        { domain: "voltereta-kioto.com", price: 17.9 },
        { domain: "voltereta-kioto.menu", price: 21.9 },
        { domain: "elvoltereta-kioto.es", price: 16.9 },
      ],
    });
    expect(outcome.primary).toEqual({ domain: "voltereta-kioto.com", price: 17.9 });
    expect(outcome.unavailableCandidate).toBe("voltereta-kioto.es");
    expect(outcome.moreAlternatives).toEqual([
      { domain: "voltereta-kioto.menu", price: 21.9 },
      { domain: "elvoltereta-kioto.es", price: 16.9 },
    ]);
  });

  it("queda sin sugerencia si no hay alternativas", () => {
    const outcome = resolveDomainPrefetchOutcome("cogido.es", {
      available: false,
      alternatives: [],
    });
    expect(outcome.primary).toBeNull();
    expect(outcome.unavailableCandidate).toBe("cogido.es");
  });
});
