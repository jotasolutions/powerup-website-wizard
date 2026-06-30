ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamptz;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "terms_version" text;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "terms_document_url" text;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "consent_user_agent" text;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "consent_ip" text;

UPDATE "altas"
SET
  "terms_accepted_at" = COALESCE("terms_accepted_at", "created_at"),
  "terms_version" = COALESCE("terms_version", 'legacy'),
  "terms_document_url" = COALESCE("terms_document_url", 'https://powerup.menu/legal')
WHERE "terms_accepted_at" IS NULL;

ALTER TABLE "altas" ALTER COLUMN "terms_accepted_at" SET NOT NULL;
ALTER TABLE "altas" ALTER COLUMN "terms_version" SET NOT NULL;
ALTER TABLE "altas" ALTER COLUMN "terms_document_url" SET NOT NULL;
