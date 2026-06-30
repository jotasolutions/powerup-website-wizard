import type { DomainAlternative, DomainCheckResult } from "./domain-check.types";

export type DomainPrefetchPrimary = {
  domain: string;
  price: number;
};

/** Resultado normalizado del prefetch: candidato .es o primera alternativa viable. */
export type DomainPrefetchOutcome = {
  candidate: string;
  primary: DomainPrefetchPrimary | null;
  /** Candidato .es pedido que no estaba libre (si aplica). */
  unavailableCandidate?: string;
  moreAlternatives: DomainAlternative[];
  raw: DomainCheckResult;
};

export function resolveDomainPrefetchOutcome(
  candidate: string,
  result: DomainCheckResult,
): DomainPrefetchOutcome {
  if (result.available) {
    return {
      candidate,
      primary: { domain: candidate, price: result.price },
      moreAlternatives: [],
      raw: result,
    };
  }

  const [first, ...rest] = result.alternatives;
  if (first) {
    return {
      candidate,
      primary: { domain: first.domain, price: first.price },
      unavailableCandidate: candidate,
      moreAlternatives: rest.slice(0, 2),
      raw: result,
    };
  }

  return {
    candidate,
    primary: null,
    unavailableCandidate: candidate,
    moreAlternatives: [],
    raw: result,
  };
}
