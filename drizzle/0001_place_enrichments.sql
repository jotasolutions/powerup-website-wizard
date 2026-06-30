CREATE TABLE IF NOT EXISTS "place_enrichments" (
  "place_id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "schema_version" integer NOT NULL,
  "fetched_at" timestamptz DEFAULT now() NOT NULL
);
