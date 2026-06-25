import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "@/lib/env.server";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | undefined;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const sql = neon(getDatabaseUrl());
    _db = drizzle({ client: sql, schema });
  }
  return _db;
}
