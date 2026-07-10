import { and, count, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { altas } from "@/db/schema";
import type { DashboardAppEnvFilter } from "./analytics-posthog.server";
import { withNeonAppEnv } from "./neon-env-filter.server";
import type { NeonPanelQueryContext } from "./neon-env-filter.server";

/** Altas pagadas antes de la migración paid_at usan created_at en backfill — no son timestamp exacto de pago. */
export const PAID_AT_BACKFILL_APPROXIMATE = true as const;

function startOfUtcWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const revenuePaidFilter = and(
  eq(altas.status, "paid"),
  isNotNull(altas.paidAt),
  sql`${altas.onetimeFeeAmount} IS NOT NULL AND ${altas.onetimeFeeAmount}::numeric > 0`,
);

const trialPaidFilter = and(
  eq(altas.status, "paid"),
  isNotNull(altas.paidAt),
  or(sql`${altas.onetimeFeeAmount} IS NULL`, sql`${altas.onetimeFeeAmount}::numeric = 0`),
);

async function countPaidInRange(
  ctx: NeonPanelQueryContext,
  filter: typeof revenuePaidFilter,
  from: Date,
  to: Date,
) {
  const where = withNeonAppEnv(
    ctx.appEnv,
    ctx.envColumnReady,
    filter,
    gte(altas.paidAt, from),
    lte(altas.paidAt, to),
  );
  const [row] = await getDb().select({ value: count() }).from(altas).where(where);
  return Number(row?.value ?? 0);
}

async function sumRevenueEurInRange(ctx: NeonPanelQueryContext, from: Date, to: Date) {
  const where = withNeonAppEnv(
    ctx.appEnv,
    ctx.envColumnReady,
    revenuePaidFilter,
    gte(altas.paidAt, from),
    lte(altas.paidAt, to),
  );
  const [row] = await getDb()
    .select({
      value: sql<string>`COALESCE(SUM(${altas.onetimeFeeAmount}::numeric), 0)`,
    })
    .from(altas)
    .where(where);
  return Number(row?.value ?? 0);
}

export async function getWeeklyRevenueSumEur(ctx: NeonPanelQueryContext) {
  const now = new Date();
  const thisWeekStart = startOfUtcWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);

  const [current, previous] = await Promise.all([
    sumRevenueEurInRange(ctx, thisWeekStart, now),
    sumRevenueEurInRange(ctx, lastWeekStart, lastWeekEnd),
  ]);

  return { current, previous };
}

export async function getWeeklyPaidMetrics(ctx: NeonPanelQueryContext) {
  const now = new Date();
  const thisWeekStart = startOfUtcWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);

  const [revenueCurrent, revenuePrevious, trialsCurrent, trialsPrevious] = await Promise.all([
    countPaidInRange(ctx, revenuePaidFilter, thisWeekStart, now),
    countPaidInRange(ctx, revenuePaidFilter, lastWeekStart, lastWeekEnd),
    countPaidInRange(ctx, trialPaidFilter, thisWeekStart, now),
    countPaidInRange(ctx, trialPaidFilter, lastWeekStart, lastWeekEnd),
  ]);

  return {
    revenue: {
      current: revenueCurrent,
      previous: revenuePrevious,
    },
    trials: {
      current: trialsCurrent,
      previous: trialsPrevious,
    },
  };
}

export async function getLeadToPaidCvr14d(ctx: NeonPanelQueryContext, rangeDays: number) {
  const since = addDays(new Date(), -rangeDays);

  const leadsWhere = withNeonAppEnv(ctx.appEnv, ctx.envColumnReady, gte(altas.createdAt, since));
  const convertedWhere = withNeonAppEnv(
    ctx.appEnv,
    ctx.envColumnReady,
    gte(altas.createdAt, since),
    isNotNull(altas.paidAt),
    sql`${altas.paidAt} <= ${altas.createdAt} + interval '14 days'`,
  );

  const [leadsRow] = await getDb().select({ value: count() }).from(altas).where(leadsWhere);
  const [convertedRow] = await getDb()
    .select({ value: count() })
    .from(altas)
    .where(convertedWhere);

  const leads = Number(leadsRow?.value ?? 0);
  const converted = Number(convertedRow?.value ?? 0);

  return {
    leads,
    converted,
    rate: leads > 0 ? converted / leads : 0,
    windowDays: 14,
  };
}

export async function countNeonPaidInLastDays(ctx: NeonPanelQueryContext, days: number) {
  const since = addDays(new Date(), -days);
  const where = withNeonAppEnv(
    ctx.appEnv,
    ctx.envColumnReady,
    eq(altas.status, "paid"),
    isNotNull(altas.paidAt),
    gte(altas.paidAt, since),
  );
  const [row] = await getDb().select({ value: count() }).from(altas).where(where);
  return Number(row?.value ?? 0);
}

const anyPaidFilter = and(eq(altas.status, "paid"), isNotNull(altas.paidAt));

async function countAnyPaidInRange(
  ctx: NeonPanelQueryContext,
  from: Date,
  to: Date,
) {
  const where = withNeonAppEnv(
    ctx.appEnv,
    ctx.envColumnReady,
    anyPaidFilter,
    gte(altas.paidAt, from),
    lte(altas.paidAt, to),
  );
  const [row] = await getDb().select({ value: count() }).from(altas).where(where);
  return Number(row?.value ?? 0);
}

async function countAndSumPaidDomainInRange(ctx: NeonPanelQueryContext, from: Date, to: Date) {
  const where = withNeonAppEnv(
    ctx.appEnv,
    ctx.envColumnReady,
    revenuePaidFilter,
    gte(altas.paidAt, from),
    lte(altas.paidAt, to),
  );
  const [row] = await getDb()
    .select({
      count: count(),
      sumEur: sql<string>`COALESCE(SUM(${altas.onetimeFeeAmount}::numeric), 0)`,
    })
    .from(altas)
    .where(where);
  return {
    count: Number(row?.count ?? 0),
    sumEur: Number(row?.sumEur ?? 0),
  };
}

async function countFreeSubdomainInRange(ctx: NeonPanelQueryContext, from: Date, to: Date) {
  return countPaidInRange(ctx, trialPaidFilter, from, to);
}

export type RegistrationsHeroData = {
  total: { current: number; previous: number };
  paidDomain: { count: number; sumEur: number };
  freeSubdomain: { count: number };
  weeklyTrend: number[];
  weeksOfHistory: number;
};

export async function getRegistrationsHeroMetrics(
  ctx: NeonPanelQueryContext,
  rangeDays: number,
): Promise<RegistrationsHeroData> {
  const now = new Date();
  const periodStart = addDays(now, -rangeDays);
  const prevStart = addDays(periodStart, -rangeDays);

  const [totalCurrent, totalPrevious, paidDomain, freeSubdomain, weeklyTrend, weeksOfHistory] =
    await Promise.all([
      countAnyPaidInRange(ctx, periodStart, now),
      countAnyPaidInRange(ctx, prevStart, periodStart),
      countAndSumPaidDomainInRange(ctx, periodStart, now),
      countFreeSubdomainInRange(ctx, periodStart, now),
      getLastWeekRegistrationCounts(ctx, 4),
      getWeeksOfPaidHistory(ctx),
    ]);

  return {
    total: { current: totalCurrent, previous: totalPrevious },
    paidDomain,
    freeSubdomain: { count: freeSubdomain },
    weeklyTrend,
    weeksOfHistory,
  };
}

async function getWeeksOfPaidHistory(ctx: NeonPanelQueryContext): Promise<number> {
  const where = withNeonAppEnv(ctx.appEnv, ctx.envColumnReady, anyPaidFilter);
  const [row] = await getDb()
    .select({ minPaid: sql<string>`min(${altas.paidAt})` })
    .from(altas)
    .where(where);
  const minPaid = row?.minPaid ? new Date(row.minPaid) : null;
  if (!minPaid || Number.isNaN(minPaid.getTime())) return 0;
  const diffMs = Date.now() - minPaid.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

async function getLastWeekRegistrationCounts(
  ctx: NeonPanelQueryContext,
  weekCount: number,
): Promise<number[]> {
  const now = new Date();
  const thisWeekStart = startOfUtcWeek(now);
  const counts: number[] = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = addDays(thisWeekStart, -7 * i);
    const weekEnd = i === 0 ? now : addDays(weekStart, 6);
    const to = i === 0 ? now : new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1);
    counts.push(await countAnyPaidInRange(ctx, weekStart, to));
  }

  return counts;
}

export type DailyRegistrationPoint = { day: string; count: number };

export async function getDailyRegistrations(
  ctx: NeonPanelQueryContext,
  rangeDays: number,
): Promise<DailyRegistrationPoint[]> {
  const since = addDays(new Date(), -rangeDays);
  const where = withNeonAppEnv(
    ctx.appEnv,
    ctx.envColumnReady,
    anyPaidFilter,
    gte(altas.paidAt, since),
  );
  const rows = await getDb()
    .select({
      day: sql<string>`to_char(date_trunc('day', ${altas.paidAt}), 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(altas)
    .where(where)
    .groupBy(sql`date_trunc('day', ${altas.paidAt})`)
    .orderBy(sql`date_trunc('day', ${altas.paidAt})`);

  return rows.map((r) => ({
    day: String(r.day),
    count: Number(r.count ?? 0),
  }));
}
