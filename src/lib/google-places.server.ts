import { getGooglePlacesApiKey } from "./env.server";

export type GmbResult = {
  name: string;
  address: string;
  place_id: string;
};

type PlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
  }>;
  error?: { message?: string; status?: string };
};

function parsePlaceId(resourceName: string): string {
  return resourceName.startsWith("places/") ? resourceName.slice("places/".length) : resourceName;
}

export async function searchRestaurants(query: string): Promise<GmbResult[]> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    throw new Error("Falta GOOGLE_PLACES_API_KEY en las variables de entorno.");
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "es",
      regionCode: "ES",
      includedType: "restaurant",
      maxResultCount: 8,
    }),
  });

  const payload = (await response.json()) as PlacesSearchResponse;

  if (!response.ok) {
    const detail = payload.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Google Places no respondió correctamente: ${detail}`);
  }

  return (payload.places ?? [])
    .filter((place) => place.id && place.displayName?.text)
    .map((place) => ({
      name: place.displayName!.text!,
      address: place.formattedAddress ?? "",
      place_id: parsePlaceId(place.id!),
    }));
}
