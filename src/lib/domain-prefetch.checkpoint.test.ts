import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { suggestPrimaryCustomDomain } from "./alta-config";
import { resolveDomainPrefetchOutcome } from "./domain-prefetch";

/** Checkpoint B3: prefetch listo antes de elegirDominio. */
describe("domain prefetch checkpoint B3", () => {
  it("mock 500ms termina antes del tiempo típico de enrichment (~2s)", async () => {
    const candidate = suggestPrimaryCustomDomain("Voltereta Kioto");
    const started = Date.now();

    await new Promise((r) => setTimeout(r, 500));
    const outcome = resolveDomainPrefetchOutcome(candidate, {
      available: true,
      price: 14.9,
    });

    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(450);
    expect(elapsed).toBeLessThan(2000);
    expect(outcome.primary).toEqual({ domain: "voltereta-kioto.es", price: 14.9 });
  });

  it("queryKey distinta por restaurante aísla caché", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const checkDomainFn = vi.fn(async ({ data }: { data: { domain: string } }) => {
      await new Promise((r) => setTimeout(r, 20));
      return { available: true as const, price: data.domain.length };
    });

    const bar = suggestPrimaryCustomDomain("Bar La Plaza");
    const diverxo = suggestPrimaryCustomDomain("DiverXO");

    const barOutcome = await client.fetchQuery({
      queryKey: ["domain-prefetch", bar],
      queryFn: async () =>
        resolveDomainPrefetchOutcome(bar, await checkDomainFn({ data: { domain: bar } })),
    });

    const diverxoOutcome = await client.fetchQuery({
      queryKey: ["domain-prefetch", diverxo],
      queryFn: async () =>
        resolveDomainPrefetchOutcome(diverxo, await checkDomainFn({ data: { domain: diverxo } })),
    });

    expect(barOutcome.primary?.domain).toBe("bar-la-plaza.es");
    expect(diverxoOutcome.primary?.domain).toBe("diverxo.es");
    expect(checkDomainFn).toHaveBeenCalledTimes(2);

    client.removeQueries({ queryKey: ["domain-prefetch"] });
    expect(client.getQueryCache().findAll({ queryKey: ["domain-prefetch"] })).toHaveLength(0);
  });
});
