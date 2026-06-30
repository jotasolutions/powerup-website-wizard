import { eq } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { placeEnrichments } from "@/db/schema";
import type { PlaceProfile } from "./place-profile.types";
import { parsePlaceId } from "./places-client.server";

/** Sube este valor al cambiar normalización/clasificación para invalidar caché existente. */
export const ENRICHMENT_SCHEMA_VERSION = 3;

const ENRICHMENT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < ENRICHMENT_CACHE_TTL_MS;
}

export function isCacheablePlaceProfile(profile: PlaceProfile): boolean {
  return !profile.missing_fields.includes("fetch_failed");
}

export async function getCachedPlaceProfile(
  placeId: string,
): Promise<PlaceProfile | null> {
  const id = parsePlaceId(placeId);

  const [row] = await getDb()
    .select()
    .from(placeEnrichments)
    .where(eq(placeEnrichments.placeId, id))
    .limit(1);

  if (!row) {
    console.info("[place-enrichment-cache] MISS", id, "(no row)");
    return null;
  }

  if (row.schemaVersion !== ENRICHMENT_SCHEMA_VERSION) {
    console.info(
      "[place-enrichment-cache] MISS",
      id,
      `(schema_version ${row.schemaVersion} != ${ENRICHMENT_SCHEMA_VERSION})`,
    );
    return null;
  }

  if (!isFresh(row.fetchedAt)) {
    console.info("[place-enrichment-cache] MISS", id, "(TTL expired)");
    return null;
  }

  const payload = row.payload;
  if (!payload || payload.place_id !== id) {
    console.info("[place-enrichment-cache] MISS", id, "(invalid payload)");
    return null;
  }

  console.info("[place-enrichment-cache] HIT", id);
  return payload;
}

export async function upsertPlaceProfileCache(
  placeId: string,
  profile: PlaceProfile,
): Promise<void> {
  const id = parsePlaceId(placeId);

  await getDb()
    .insert(placeEnrichments)
    .values({
      placeId: id,
      payload: profile,
      schemaVersion: ENRICHMENT_SCHEMA_VERSION,
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: placeEnrichments.placeId,
      set: {
        payload: profile,
        schemaVersion: ENRICHMENT_SCHEMA_VERSION,
        fetchedAt: new Date(),
      },
    });

  console.info("[place-enrichment-cache] UPSERT", id, `v${ENRICHMENT_SCHEMA_VERSION}`);
}
