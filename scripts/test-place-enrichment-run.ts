import "./load-env.mjs";
import { classifyWebsite } from "../src/lib/website-classifier";
import {
  enrichPlaceProfileWithDebug,
  enrichPlaceProfileWithCacheSource,
  type ZoneLabelSource,
} from "../src/lib/place-enrichment.server";
import { ALTA_CURATED_PLACES } from "../src/lib/alta-curated-places";
import { getGooglePlacesApiKey } from "../src/lib/env.server";
import type { PlaceProfile, WebsiteType } from "../src/lib/place-profile.types";

const CLASSIFIER_EXAMPLES: Array<{ uri: string; expected: WebsiteType }> = [
  { uri: "https://www.diverxo.com", expected: "own" },
  { uri: "https://disfrutarbarcelona.com", expected: "own" },
  { uri: "https://linktr.ee/mirestaurante", expected: "aggregator" },
  { uri: "https://www.thefork.es/restaurant/xyz", expected: "aggregator" },
  { uri: "https://www.instagram.com/restaurante", expected: "social" },
  { uri: "https://m.facebook.com/restaurante", expected: "social" },
  { uri: "https://casa-pepe.wixsite.com/restaurante", expected: "builder" },
  { uri: "https://misitio.weebly.com", expected: "builder" },
  { uri: "https://sites.google.com/view/mirestaurante", expected: "builder" },
  { uri: "https://restaurante.negocio.site", expected: "builder" },
  { uri: "https://foo.squarespace.com", expected: "builder" },
  { uri: "", expected: "none" },
];

function printClassifierExamples() {
  console.log("\n═══ Classifier (classifyWebsite) ═══\n");
  for (const { uri, expected } of CLASSIFIER_EXAMPLES) {
    const got = classifyWebsite(uri || undefined);
    const ok = got === expected ? "✓" : "✗";
    console.log(`${ok}  ${JSON.stringify(uri || "(vacío)")} → ${got} (esperado: ${expected})`);
  }
}

type EnrichedOutput = {
  scenario: string;
  profile: PlaceProfile;
  zone_source: ZoneLabelSource;
};

function printValidationSummary(items: EnrichedOutput[]) {
  console.log("\n═══ Resumen validación (dónde mirar en el JSON) ═══\n");

  for (const item of items) {
    const { scenario, profile, zone_source } = item;
    console.log(`── ${scenario} ──`);
    console.log(`  website_type → profile.website_type = "${profile.website_type}"`);
    if (profile.website_uri) {
      console.log(`    (desde profile.website_uri = ${profile.website_uri})`);
    }
    console.log(
      `  zone_label → profile.zone_label = "${profile.zone_label ?? "(vacío)"}"`,
    );
    console.log(
      `    (fuente: zone_source.zone_source_type = "${zone_source.zone_source_type ?? "(sin componente)"}")`,
    );
    console.log("");
  }
}

async function enrichOne(
  scenario: string,
  place_id: string,
  fallback_name: string,
): Promise<EnrichedOutput> {
  const { profile, zone_source } = await enrichPlaceProfileWithDebug(place_id, fallback_name);
  return { scenario, profile, zone_source };
}

async function resolveValenciaSamples(): Promise<
  Array<{ label: string; place_id: string; fallback_name: string }>
> {
  const { searchRestaurants } = await import("../src/lib/google-places.server");

  const queries = [
    { label: "Ruzafa", search: "Casa Montaña Ruzafa Valencia" },
    { label: "El Carmen", search: "La Pilareta El Carmen Valencia" },
  ];

  const resolved: Array<{ label: string; place_id: string; fallback_name: string }> = [];

  for (const { label, search } of queries) {
    const hits = await searchRestaurants(search);
    const hit = hits[0];
    if (hit) {
      resolved.push({ label, place_id: hit.place_id, fallback_name: hit.name });
    }
  }

  return resolved;
}

async function main() {
  if (!getGooglePlacesApiKey()) {
    console.error(
      "Falta GOOGLE_PLACES_API_KEY (o alias GOOGLE_API_KEY / VITE_GOOGLE_API_KEY) en .env",
    );
    process.exit(1);
  }

  printClassifierExamples();

  console.log("\n═══ Enrichment (5 perfiles fijos) ═══\n");

  const profiles: EnrichedOutput[] = [];

  for (const entry of ALTA_CURATED_PLACES) {
    process.stdout.write(`Enriqueciendo: ${entry.tag}… `);
    try {
      const result = await enrichOne(entry.tag, entry.place_id, entry.fallback_name);
      profiles.push(result);
      console.log(`ok → ${result.profile.display_name} (${result.profile.website_type})`);
    } catch (err) {
      console.log(`error: ${err instanceof Error ? err.message : err}`);
    }
  }

  for (const item of profiles) {
    console.log(`\n── ${item.scenario} ──`);
    console.log(
      JSON.stringify(
        {
          profile: item.profile,
          zone_source: item.zone_source,
        },
        null,
        2,
      ),
    );
  }

  printValidationSummary(profiles);

  console.log("═══ zone_label Valencia (muestras) ═══\n");
  const valenciaSamples = await resolveValenciaSamples();
  for (const sample of valenciaSamples) {
    process.stdout.write(`${sample.label} (${sample.fallback_name})… `);
    try {
      const result = await enrichOne(sample.label, sample.place_id, sample.fallback_name);
      console.log(`zone_label="${result.profile.zone_label}" ← ${result.zone_source.zone_source_type}`);
      console.log(`  formatted_address: ${result.profile.formatted_address}`);
    } catch (err) {
      console.log(`error: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n✓ ${profiles.length} perfiles enriquecidos.\n`);

  await printCacheVerification();
}

async function printCacheVerification() {
  const testPlaceId = "ChIJfUIagAMpQg0RRYLx9K82nJc";
  const testName = "DiverXO";

  console.log("═══ Caché Neon (2ª llamada = HIT, sin Google) ═══\n");

  const first = await enrichPlaceProfileWithCacheSource(testPlaceId, testName);
  console.log(`1ª llamada → ${first.source === "miss" ? "MISS" : "HIT"} (source: ${first.source})`);

  const second = await enrichPlaceProfileWithCacheSource(testPlaceId, testName);
  console.log(`2ª llamada → ${second.source === "cache" ? "HIT" : "MISS"} (source: ${second.source})`);

  if (first.source === "miss" && second.source === "cache") {
    console.log("\n✓ Caché OK: 1ª MISS (Google + UPSERT), 2ª HIT (Neon, sin Places API).\n");
  } else {
    console.warn(
      `\n⚠ Resultado inesperado: esperado miss→cache, obtuvo ${first.source}→${second.source}\n`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
