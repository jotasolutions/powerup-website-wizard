import { getGooglePlacesApiKey } from "./env.server";

export function parsePlaceId(resourceName: string): string {
  return resourceName.startsWith("places/") ? resourceName.slice("places/".length) : resourceName;
}

export async function placesFetch<T>(
  path: string,
  init: RequestInit & { fieldMask?: string },
): Promise<T> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    throw new Error("Falta GOOGLE_PLACES_API_KEY en las variables de entorno.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    ...(init.fieldMask ? { "X-Goog-FieldMask": init.fieldMask } : {}),
  };

  const { fieldMask: _fm, ...rest } = init;
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...rest,
    headers: { ...headers, ...(rest.headers as Record<string, string>) },
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok) {
    const detail = payload.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Google Places no respondió correctamente: ${detail}`);
  }

  return payload;
}
