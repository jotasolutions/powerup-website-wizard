import { useQuery } from "@tanstack/react-query";
import type { PlaceProfile } from "@/lib/place-profile.types";

const ENRICHMENT_STALE_MS = Number.POSITIVE_INFINITY;
const ENRICHMENT_GC_MS = 30 * 60_000;

export function usePlaceEnrichment(
  placeId: string | null | undefined,
  fallbackName: string,
  enrichFn: (args: {
    data: { place_id: string; fallback_name?: string };
  }) => Promise<{ profile: PlaceProfile }>,
) {
  return useQuery({
    queryKey: ["place-enrichment", placeId],
    queryFn: () =>
      enrichFn({
        data: {
          place_id: placeId!,
          fallback_name: fallbackName || undefined,
        },
      }),
    enabled: Boolean(placeId),
    staleTime: ENRICHMENT_STALE_MS,
    gcTime: ENRICHMENT_GC_MS,
    retry: 1,
  });
}
