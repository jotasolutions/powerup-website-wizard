import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DomainCheckResult } from "@/lib/domain-check.types";
import { generarSubdominio, suggestPrimaryCustomDomain } from "@/lib/alta-config";
import {
  resolveDomainPrefetchOutcome,
  type DomainPrefetchOutcome,
} from "@/lib/domain-prefetch";

const PREFETCH_STALE_MS = Number.POSITIVE_INFINITY;
const PREFETCH_GC_MS = 30 * 60_000;

export type DomainPrefetchStatus = "idle" | "loading" | "ready" | "degraded";

export type DomainPrefetchView = {
  status: DomainPrefetchStatus;
  candidate: string;
  freeSubdomain: string;
  outcome: DomainPrefetchOutcome | null;
};

export function useDomainPrefetch(
  restaurantName: string,
  checkDomainFn: (args: { data: { domain: string } }) => Promise<DomainCheckResult>,
): DomainPrefetchView {
  const trimmed = restaurantName.trim();
  // candidateDomain se recalcula cada render; la queryKey ["domain-prefetch", candidate]
  // garantiza que el resultado siempre corresponde al nombre actual (sin estado duplicado).
  const candidate = useMemo(() => suggestPrimaryCustomDomain(trimmed), [trimmed]);
  const freeSubdomain = useMemo(() => generarSubdominio(trimmed), [trimmed]);
  const enabled = trimmed.length > 0;

  const query = useQuery({
    queryKey: ["domain-prefetch", candidate],
    queryFn: async () => {
      const raw = await checkDomainFn({ data: { domain: candidate } });
      return resolveDomainPrefetchOutcome(candidate, raw);
    },
    enabled,
    staleTime: PREFETCH_STALE_MS,
    gcTime: PREFETCH_GC_MS,
    retry: 1,
  });

  const status: DomainPrefetchStatus = !enabled
    ? "idle"
    : query.isPending
      ? "loading"
      : query.isError
        ? "degraded"
        : "ready";

  return {
    status,
    candidate,
    freeSubdomain,
    outcome: query.data ?? null,
  };
}
