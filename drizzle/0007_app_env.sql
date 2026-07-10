-- app_env: mismo valor que properties.app_env en eventos PostHog de servidor.
-- Backfill: filas existentes son pruebas locales → development.
-- Verificar antes del deploy: SELECT count(*) FROM altas;
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "app_env" text;
UPDATE "altas" SET "app_env" = 'development' WHERE "app_env" IS NULL;
ALTER TABLE "altas" ALTER COLUMN "app_env" SET DEFAULT 'development';
ALTER TABLE "altas" ALTER COLUMN "app_env" SET NOT NULL;
