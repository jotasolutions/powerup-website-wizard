import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim().replace(/^["']|["']$/g, "");

  if (url.startsWith("postgres://")) {
    url = `postgresql://${url.slice("postgres://".length)}`;
  }

  if (!url.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL debe ser un connection string de Neon con formato postgresql://user:password@host/dbname?...",
    );
  }

  return url;
}

function getDatabaseUrl(): string {
  const raw =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (!raw?.trim()) {
    throw new Error(
      "Falta DATABASE_URL. En Vercel añade el connection string de Neon en Settings → Environment Variables (Production).",
    );
  }

  return normalizeDatabaseUrl(raw);
}

let _db: NeonHttpDatabase<typeof schema> | undefined;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const sql = neon(getDatabaseUrl());
    _db = drizzle({ client: sql, schema });
  }
  return _db;
}
