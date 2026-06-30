import type { PlaceProfile } from "@/lib/place-profile.types";
import type { AltaState } from "@/components/asistente/types";

function googleMapsFallbackUri(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
}

/** Fallo de enrichPlace con place_id conocido — espejo de buildMinimalProfile del server. */
export function buildFallbackPlaceProfileFromApiError(alta: AltaState): PlaceProfile {
  const placeId = alta.gmb_place_id!;
  return {
    place_id: placeId,
    display_name: alta.restaurant_name,
    formatted_address: alta.restaurant_address || undefined,
    website_type: "none",
    google_maps_uri: googleMapsFallbackUri(placeId),
    enrichment_partial: true,
    missing_fields: ["fetch_failed"],
  };
}

/** Alta manual sin place_id — no se llama enrichPlace. */
export function buildFallbackPlaceProfileManual(alta: AltaState): PlaceProfile {
  const missing: string[] = [];
  if (!alta.restaurant_address?.trim()) missing.push("formatted_address");

  return {
    place_id: "manual",
    display_name: alta.restaurant_name,
    formatted_address: alta.restaurant_address || undefined,
    website_type: "none",
    enrichment_partial: true,
    missing_fields: missing,
  };
}
