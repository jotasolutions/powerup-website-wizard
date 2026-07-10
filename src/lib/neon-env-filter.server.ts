import { and, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { altas } from "@/db/schema";
import type { DashboardAppEnvFilter } from "./analytics-posthog.server";

export type NeonPanelQueryContext = {
  appEnv: DashboardAppEnvFilter;
  envColumnReady: boolean;
};

export type NeonEnvFilterStatus = {
  /** Columna app_env existe y todas las filas tienen valor (backfill aplicado). */
  columnReady: boolean;
};

let cachedStatus: { at: number; status: NeonEnvFilterStatus } | null = null;
const STATUS_CACHE_MS = 60_000;

export function clearNeonEnvFilterStatusCache(): void {
  cachedStatus = null;
}

export async function getNeonEnvFilterStatus(): Promise<NeonEnvFilterStatus> {
  if (cachedStatus && Date.now() - cachedStatus.at < STATUS_CACHE_MS) {
    return cachedStatus.status;
  }

  try {
    const [row] = await getDb()
      .select({ nullCount: sql<number>`count(*)::int` })
      .from(altas)
      .where(sql`${altas.appEnv} IS NULL`);
    const status = { columnReady: Number(row?.nullCount ?? 0) === 0 };
    cachedStatus = { at: Date.now(), status };
    return status;
  } catch {
    const status = { columnReady: false };
    cachedStatus = { at: Date.now(), status };
    return status;
  }
}

/** Comparación Neon vs PostHog solo es válida si ambos aplican (o ninguno) el mismo filtro. */
export function isEnvComparisonComparable(
  appEnv: DashboardAppEnvFilter,
  neonStatus: NeonEnvFilterStatus,
): boolean {
  if (appEnv === "all") return true;
  return neonStatus.columnReady;
}

export function neonAppEnvCondition(
  appEnv: DashboardAppEnvFilter,
  columnReady: boolean,
): SQL | undefined {
  if (appEnv === "all" || !columnReady) return undefined;
  return eq(altas.appEnv, "production");
}

export function withNeonAppEnv(
  appEnv: DashboardAppEnvFilter,
  columnReady: boolean,
  ...conditions: Array<SQL | undefined>
): SQL | undefined {
  const parts = conditions.filter((c): c is SQL => c != null);
  const env = neonAppEnvCondition(appEnv, columnReady);
  if (env) parts.push(env);
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : and(...parts);
}
