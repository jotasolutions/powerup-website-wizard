DO $$ BEGIN
  CREATE TYPE "public"."powerup_customer_status" AS ENUM('unknown', 'yes', 'no');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "powerup_customer" "powerup_customer_status" DEFAULT 'unknown' NOT NULL;
