import { parsePlaceId, placesFetch } from "./places-client.server";

export type GmbResult = {
  name: string;
  address: string;
  place_id: string;
};

export type AddressSuggestion = {
  place_id: string;
  label: string;
  simplified_address: string;
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function componentText(components: AddressComponent[], type: string): string | undefined {
  const c = components.find((item) => item.types?.includes(type));
  return c?.longText ?? c?.shortText;
}

/** Calle aprox + ciudad, sin número de portal. */
export function formatSimplifiedAddress(components: AddressComponent[]): string {
  const route = componentText(components, "route");
  const locality =
    componentText(components, "locality") ??
    componentText(components, "postal_town") ??
    componentText(components, "administrative_area_level_2");

  if (route && locality) return `${route}, ${locality}`;
  if (route) return route;
  if (locality) return locality;
  return "";
}

type PlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
  }>;
};

/** Tipos GMB incluidos en la búsqueda paralela (restaurante, bar, cafetería…). */
export const GMB_SEARCH_INCLUDED_TYPES = [
  "restaurant",
  "bar",
  "cafe",
  "coffee_shop",
  "bakery",
  "pub",
] as const;

const GMB_RESULTS_PER_TYPE = 4;
const GMB_MAX_MERGED_RESULTS = 8;

async function searchPlacesByIncludedType(
  query: string,
  includedType: string,
): Promise<GmbResult[]> {
  const payload = await placesFetch<PlacesSearchResponse>("places:searchText", {
    method: "POST",
    fieldMask: "places.id,places.displayName,places.formattedAddress",
    body: JSON.stringify({
      textQuery: query,
      languageCode: "es",
      regionCode: "ES",
      includedType,
      maxResultCount: GMB_RESULTS_PER_TYPE,
    }),
  });

  return (payload.places ?? [])
    .filter((place) => place.id && place.displayName?.text)
    .map((place) => ({
      name: place.displayName!.text!,
      address: place.formattedAddress ?? "",
      place_id: parsePlaceId(place.id!),
    }));
}

/** Fusiona lotes de resultados GMB sin duplicar place_id (orden de llegada). */
export function mergeGmbResults(batches: GmbResult[][]): GmbResult[] {
  const seen = new Set<string>();
  const merged: GmbResult[] = [];

  for (const batch of batches) {
    for (const item of batch) {
      if (seen.has(item.place_id)) continue;
      seen.add(item.place_id);
      merged.push(item);
      if (merged.length >= GMB_MAX_MERGED_RESULTS) return merged;
    }
  }

  return merged;
}

/** Búsqueda en Google: restaurantes, bares, cafeterías y similares. */
export async function searchHospitalityBusinesses(query: string): Promise<GmbResult[]> {
  const batches = await Promise.all(
    GMB_SEARCH_INCLUDED_TYPES.map((includedType) =>
      searchPlacesByIncludedType(query, includedType).catch(() => [] as GmbResult[]),
    ),
  );

  return mergeGmbResults(batches);
}

/** @deprecated Alias — usar searchHospitalityBusinesses */
export async function searchRestaurants(query: string): Promise<GmbResult[]> {
  return searchHospitalityBusinesses(query);
}

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
    };
  }>;
};

export async function autocompleteAddress(
  query: string,
  sessionToken?: string,
): Promise<Array<{ place_id: string; label: string }>> {
  const body: Record<string, unknown> = {
    input: query,
    languageCode: "es",
    regionCode: "ES",
    includedRegionCodes: ["ES"],
    includedPrimaryTypes: ["street_address", "route", "premise", "subpremise"],
  };

  if (sessionToken) {
    body.sessionToken = sessionToken;
  }

  const payload = await placesFetch<AutocompleteResponse>("places:autocomplete", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return (payload.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId && p.text?.text))
    .map((p) => ({
      place_id: p.placeId!,
      label: p.text!.text!,
    }));
}

type PlaceDetailsResponse = {
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
};

export async function getSimplifiedAddress(placeId: string): Promise<string> {
  const id = parsePlaceId(placeId);
  const payload = await placesFetch<PlaceDetailsResponse>(`places/${id}`, {
    method: "GET",
    fieldMask: "formattedAddress,addressComponents",
  });

  const simplified = formatSimplifiedAddress(payload.addressComponents ?? []);
  if (simplified) return simplified;

  if (!payload.formattedAddress) return "";

  return payload.formattedAddress.replace(/,?\s*\d+\s*,/, ",").replace(/\s+\d+\s*,/, ", ");
}

export async function resolveAddressSuggestions(
  query: string,
  sessionToken?: string,
): Promise<AddressSuggestion[]> {
  const suggestions = await autocompleteAddress(query, sessionToken);
  return suggestions.slice(0, 6).map((s) => ({
    place_id: s.place_id,
    label: s.label,
    simplified_address: s.label,
  }));
}
