ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;

-- Backfill: no existe updated_at en altas; created_at es la mejor aproximación histórica.
UPDATE "altas"
SET "paid_at" = "created_at"
WHERE "status" = 'paid' AND "paid_at" IS NULL;
