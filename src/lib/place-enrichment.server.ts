import { resolveBusinessTerm } from "./business-type";
import type { PlaceProfile } from "./place-profile.types";
import {
  getCachedPlaceProfile,
  isCacheablePlaceProfile,
  upsertPlaceProfileCache,
} from "./place-enrichment-cache.server";
import { parsePlaceId, placesFetch } from "./places-client.server";
import { classifyWebsite } from "./website-classifier";

const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "rating",
  "userRatingCount",
  "primaryTypeDisplayName",
  "types",
  "websiteUri",
  "googleMapsUri",
].join(",");

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlaceDetailsEnrichmentResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  websiteUri?: string;
  googleMapsUri?: string;
};

function componentText(components: AddressComponent[], type: string): string | undefined {
  const c = components.find((item) => item.types?.includes(type));
  return c?.longText ?? c?.shortText;
}

const ZONE_COMPONENT_PRIORITY = [
  "sublocality",
  "neighborhood",
  "locality",
  "postal_town",
  "administrative_area_level_2",
] as const;

function extractZoneLabel(components: AddressComponent[]): string | undefined {
  for (const type of ZONE_COMPONENT_PRIORITY) {
    const text = componentText(components, type);
    if (text) return text;
  }
  return undefined;
}

export type ZoneLabelSource = {
  zone_label?: string;
  /** Tipo de addressComponent elegido (p. ej. sublocality, neighborhood). */
  zone_source_type?: string;
};

export function extractZoneLabelWithSource(
  components: AddressComponent[],
): ZoneLabelSource {
  for (const type of ZONE_COMPONENT_PRIORITY) {
    const text = componentText(components, type);
    if (text) return { zone_label: text, zone_source_type: type };
  }
  return {};
}

function googleMapsFallbackUri(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
}

function buildMinimalProfile(
  placeId: string,
  displayName: string,
  missingFields: string[] = ["fetch_failed"],
): PlaceProfile {
  return {
    place_id: placeId,
    display_name: displayName,
    website_type: "none",
    google_maps_uri: googleMapsFallbackUri(placeId),
    enrichment_partial: true,
    missing_fields: missingFields,
  };
}

function normalizePlaceProfile(
  placeId: string,
  raw: PlaceDetailsEnrichmentResponse,
  fallbackName?: string,
): PlaceProfile {
  const missing: string[] = [];

  const displayName = raw.displayName?.text?.trim() || fallbackName?.trim();
  if (!displayName) missing.push("display_name");

  const formatted_address = raw.formattedAddress?.trim() || undefined;
  if (!formatted_address) missing.push("formatted_address");

  const zone_label = extractZoneLabel(raw.addressComponents ?? []);
  if (!zone_label) missing.push("zone_label");

  const cuisine_label = raw.primaryTypeDisplayName?.text?.trim() || undefined;
  if (!cuisine_label) missing.push("cuisine_label");

  const google_types = raw.types?.length ? [...raw.types] : undefined;
  const business_term = resolveBusinessTerm(google_types, cuisine_label);

  const rating = typeof raw.rating === "number" ? raw.rating : undefined;
  if (rating === undefined) missing.push("rating");

  const review_count =
    typeof raw.userRatingCount === "number" ? raw.userRatingCount : undefined;
  if (review_count === undefined) missing.push("review_count");

  const website_uri = raw.websiteUri?.trim() || undefined;
  const website_type = classifyWebsite(website_uri);
  if (!website_uri) missing.push("website_uri");

  const google_maps_uri = raw.googleMapsUri?.trim() || googleMapsFallbackUri(placeId);

  return {
    place_id: placeId,
    display_name: displayName ?? placeId,
    formatted_address,
    zone_label,
    cuisine_label,
    business_term,
    google_types,
    rating,
    review_count,
    website_uri,
    website_type,
    google_maps_uri,
    enrichment_partial: missing.length > 0,
    missing_fields: missing,
  };
}

async function fetchPlaceProfileFromGoogle(
  placeId: string,
  fallbackName?: string,
): Promise<PlaceProfile> {
  const id = parsePlaceId(placeId);

  try {
    const raw = await placesFetch<PlaceDetailsEnrichmentResponse>(
      `places/${id}?languageCode=es`,
      {
        method: "GET",
        fieldMask: PLACE_DETAILS_FIELD_MASK,
      },
    );

    return normalizePlaceProfile(id, raw, fallbackName);
  } catch {
    const name = fallbackName?.trim() || id;
    return buildMinimalProfile(id, name);
  }
}

export type PlaceEnrichmentCacheSource = "cache" | "miss";

/** Solo para scripts de verificación — no usar en server fn pública. */
export async function enrichPlaceProfileWithCacheSource(
  placeId: string,
  fallbackName?: string,
): Promise<{ profile: PlaceProfile; source: PlaceEnrichmentCacheSource }> {
  const id = parsePlaceId(placeId);

  const cached = await getCachedPlaceProfile(id);
  if (cached) {
    return { profile: cached, source: "cache" };
  }

  const profile = await fetchPlaceProfileFromGoogle(id, fallbackName);

  if (isCacheablePlaceProfile(profile)) {
    await upsertPlaceProfileCache(id, profile);
  }

  return { profile, source: "miss" };
}

export async function enrichPlaceProfile(
  placeId: string,
  fallbackName?: string,
): Promise<PlaceProfile> {
  const { profile } = await enrichPlaceProfileWithCacheSource(placeId, fallbackName);
  return profile;
}

export type PlaceEnrichmentDebug = {
  profile: PlaceProfile;
  zone_source: ZoneLabelSource;
};

export async function enrichPlaceProfileWithDebug(
  placeId: string,
  fallbackName?: string,
): Promise<PlaceEnrichmentDebug> {
  const id = parsePlaceId(placeId);

  try {
    const raw = await placesFetch<PlaceDetailsEnrichmentResponse>(
      `places/${id}?languageCode=es`,
      {
        method: "GET",
        fieldMask: PLACE_DETAILS_FIELD_MASK,
      },
    );

    return {
      profile: normalizePlaceProfile(id, raw, fallbackName),
      zone_source: extractZoneLabelWithSource(raw.addressComponents ?? []),
    };
  } catch {
    const name = fallbackName?.trim() || id;
    return {
      profile: buildMinimalProfile(id, name),
      zone_source: {},
    };
  }
}
