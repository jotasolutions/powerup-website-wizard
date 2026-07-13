-- Primer click en botón WhatsApp del panel de operaciones (dato silencioso, sin UI en v1).
ALTER TABLE "altas" ADD COLUMN IF NOT EXISTS "wa_opened_at" timestamptz;
