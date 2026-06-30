import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./places-client.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./places-client.server")>();
  return { ...actual, placesFetch: vi.fn() };
});

vi.mock("./place-enrichment-cache.server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./place-enrichment-cache.server")>();
  return {
    ...actual,
    getCachedPlaceProfile: vi.fn(),
    upsertPlaceProfileCache: vi.fn(),
  };
});

import { placesFetch } from "./places-client.server";
import {
  getCachedPlaceProfile,
  isCacheablePlaceProfile,
  upsertPlaceProfileCache,
} from "./place-enrichment-cache.server";
import {
  enrichPlaceProfile,
  enrichPlaceProfileWithCacheSource,
} from "./place-enrichment.server";

const PLACE_ID = "ChIJtestDegradeNoCache";
const FALLBACK_NAME = "Bar Fallback";

function fullPlacesResponse() {
  return {
    id: PLACE_ID,
    displayName: { text: "Restaurante Completo" },
    formattedAddress: "Calle Mayor 1, Madrid",
    addressComponents: [{ longText: "Centro", types: ["neighborhood"] }],
    rating: 4.5,
    userRatingCount: 100,
    primaryTypeDisplayName: { text: "Restaurante" },
    types: ["restaurant", "food"],
    websiteUri: "https://example.com",
    googleMapsUri: "https://maps.google.com/?cid=123",
  };
}

describe("enrichPlaceProfile — degradación cuando Places falla", () => {
  beforeEach(() => {
    vi.mocked(placesFetch).mockReset();
    vi.mocked(getCachedPlaceProfile).mockReset();
    vi.mocked(upsertPlaceProfileCache).mockReset();
    vi.mocked(getCachedPlaceProfile).mockResolvedValue(null);
    vi.mocked(upsertPlaceProfileCache).mockResolvedValue(undefined);
  });

  it("devuelve perfil mínimo sin propagar la excepción", async () => {
    vi.mocked(placesFetch).mockRejectedValue(
      new Error("Google Places no respondió correctamente: timeout"),
    );

    const profile = await enrichPlaceProfile(PLACE_ID, FALLBACK_NAME);

    expect(profile.place_id).toBe(PLACE_ID);
    expect(profile.display_name).toBe(FALLBACK_NAME);
    expect(profile.enrichment_partial).toBe(true);
    expect(profile.missing_fields).toContain("fetch_failed");
    expect(profile.website_type).toBe("none");
    expect(profile.google_maps_uri).toContain(PLACE_ID);
  });

  it("no cachea el perfil degradado tras fetch_failed", async () => {
    vi.mocked(placesFetch).mockRejectedValue(new Error("HTTP 503"));

    const { profile, source } = await enrichPlaceProfileWithCacheSource(
      PLACE_ID,
      FALLBACK_NAME,
    );

    expect(source).toBe("miss");
    expect(isCacheablePlaceProfile(profile)).toBe(false);
    expect(upsertPlaceProfileCache).not.toHaveBeenCalled();
    expect(getCachedPlaceProfile).toHaveBeenCalledWith(PLACE_ID);
  });

  it("reintenta Places tras fallo y cachea el perfil completo en el segundo intento", async () => {
    vi.mocked(placesFetch)
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValueOnce(fullPlacesResponse());

    const first = await enrichPlaceProfileWithCacheSource(PLACE_ID, FALLBACK_NAME);

    expect(first.source).toBe("miss");
    expect(first.profile.missing_fields).toContain("fetch_failed");
    expect(upsertPlaceProfileCache).not.toHaveBeenCalled();
    expect(placesFetch).toHaveBeenCalledTimes(1);

    const second = await enrichPlaceProfileWithCacheSource(PLACE_ID, FALLBACK_NAME);

    expect(second.source).toBe("miss");
    expect(second.profile.missing_fields).not.toContain("fetch_failed");
    expect(second.profile.enrichment_partial).toBe(false);
    expect(second.profile.display_name).toBe("Restaurante Completo");
    expect(placesFetch).toHaveBeenCalledTimes(2);
    expect(upsertPlaceProfileCache).toHaveBeenCalledTimes(1);
    expect(upsertPlaceProfileCache).toHaveBeenCalledWith(
      PLACE_ID,
      expect.objectContaining({
        place_id: PLACE_ID,
        display_name: "Restaurante Completo",
        enrichment_partial: false,
      }),
    );
  });
});
