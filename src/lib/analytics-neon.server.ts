import { and, count, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { altas } from "@/db/schema";

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

async function countPaidInRange(filter: typeof revenuePaidFilter, from: Date, to: Date) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(altas)
    .where(and(filter, gte(altas.paidAt, from), lte(altas.paidAt, to)));
  return Number(row?.value ?? 0);
}

async function sumRevenueEurInRange(from: Date, to: Date) {
  const [row] = await getDb()
    .select({
      value: sql<string>`COALESCE(SUM(${altas.onetimeFeeAmount}::numeric), 0)`,
    })
    .from(altas)
    .where(and(revenuePaidFilter, gte(altas.paidAt, from), lte(altas.paidAt, to)));
  return Number(row?.value ?? 0);
}

export async function getWeeklyRevenueSumEur() {
  const now = new Date();
  const thisWeekStart = startOfUtcWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);

  const [current, previous] = await Promise.all([
    sumRevenueEurInRange(thisWeekStart, now),
    sumRevenueEurInRange(lastWeekStart, lastWeekEnd),
  ]);

  return { current, previous };
}

export async function getWeeklyPaidMetrics() {
  const now = new Date();
  const thisWeekStart = startOfUtcWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);

  const [revenueCurrent, revenuePrevious, trialsCurrent, trialsPrevious] = await Promise.all([
    countPaidInRange(revenuePaidFilter, thisWeekStart, now),
    countPaidInRange(revenuePaidFilter, lastWeekStart, lastWeekEnd),
    countPaidInRange(trialPaidFilter, thisWeekStart, now),
    countPaidInRange(trialPaidFilter, lastWeekStart, lastWeekEnd),
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

export async function getLeadToPaidCvr14d(rangeDays: number) {
  const since = addDays(new Date(), -rangeDays);

  const [leadsRow] = await getDb()
    .select({ value: count() })
    .from(altas)
    .where(gte(altas.createdAt, since));

  const [convertedRow] = await getDb()
    .select({ value: count() })
    .from(altas)
    .where(
      and(
        gte(altas.createdAt, since),
        isNotNull(altas.paidAt),
        sql`${altas.paidAt} <= ${altas.createdAt} + interval '14 days'`,
      ),
    );

  const leads = Number(leadsRow?.value ?? 0);
  const converted = Number(convertedRow?.value ?? 0);

  return {
    leads,
    converted,
    rate: leads > 0 ? converted / leads : 0,
    windowDays: 14,
  };
}

export async function countNeonPaidInLastDays(days: number) {
  const since = addDays(new Date(), -days);
  const [row] = await getDb()
    .select({ value: count() })
    .from(altas)
    .where(and(eq(altas.status, "paid"), isNotNull(altas.paidAt), gte(altas.paidAt, since)));
  return Number(row?.value ?? 0);
}

const anyPaidFilter = and(eq(altas.status, "paid"), isNotNull(altas.paidAt));

async function countAnyPaidInRange(from: Date, to: Date) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(altas)
    .where(and(anyPaidFilter, gte(altas.paidAt, from), lte(altas.paidAt, to)));
  return Number(row?.value ?? 0);
}

async function countAndSumPaidDomainInRange(from: Date, to: Date) {
  const [row] = await getDb()
    .select({
      count: count(),
      sumEur: sql<string>`COALESCE(SUM(${altas.onetimeFeeAmount}::numeric), 0)`,
    })
    .from(altas)
    .where(and(revenuePaidFilter, gte(altas.paidAt, from), lte(altas.paidAt, to)));
  return {
    count: Number(row?.count ?? 0),
    sumEur: Number(row?.sumEur ?? 0),
  };
}

async function countFreeSubdomainInRange(from: Date, to: Date) {
  return countPaidInRange(trialPaidFilter, from, to);
}

export type RegistrationsHeroData = {
  total: { current: number; previous: number };
  paidDomain: { count: number; sumEur: number };
  freeSubdomain: { count: number };
  weeklyTrend: number[];
  weeksOfHistory: number;
};

export async function getRegistrationsHeroMetrics(rangeDays: number): Promise<RegistrationsHeroData> {
  const now = new Date();
  const periodStart = addDays(now, -rangeDays);
  const prevStart = addDays(periodStart, -rangeDays);

  const [totalCurrent, totalPrevious, paidDomain, freeSubdomain, weeklyTrend, weeksOfHistory] =
    await Promise.all([
      countAnyPaidInRange(periodStart, now),
      countAnyPaidInRange(prevStart, periodStart),
      countAndSumPaidDomainInRange(periodStart, now),
      countFreeSubdomainInRange(periodStart, now),
      getLastWeekRegistrationCounts(4),
      getWeeksOfPaidHistory(),
    ]);

  return {
    total: { current: totalCurrent, previous: totalPrevious },
    paidDomain,
    freeSubdomain: { count: freeSubdomain },
    weeklyTrend,
    weeksOfHistory,
  };
}

async function getWeeksOfPaidHistory(): Promise<number> {
  const [row] = await getDb()
    .select({ minPaid: sql<string>`min(${altas.paidAt})` })
    .from(altas)
    .where(anyPaidFilter);
  const minPaid = row?.minPaid ? new Date(row.minPaid) : null;
  if (!minPaid || Number.isNaN(minPaid.getTime())) return 0;
  const diffMs = Date.now() - minPaid.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

async function getLastWeekRegistrationCounts(weekCount: number): Promise<number[]> {
  const now = new Date();
  const thisWeekStart = startOfUtcWeek(now);
  const counts: number[] = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = addDays(thisWeekStart, -7 * i);
  const weekEnd = i === 0 ? now : addDays(weekStart, 6);
    const to = i === 0 ? now : new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1);
    counts.push(await countAnyPaidInRange(weekStart, to));
  }

  return counts;
}

export type DailyRegistrationPoint = { day: string; count: number };

export async function getDailyRegistrations(rangeDays: number): Promise<DailyRegistrationPoint[]> {
  const since = addDays(new Date(), -rangeDays);
  const rows = await getDb()
    .select({
      day: sql<string>`to_char(date_trunc('day', ${altas.paidAt}), 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(altas)
    .where(and(anyPaidFilter, gte(altas.paidAt, since)))
    .groupBy(sql`date_trunc('day', ${altas.paidAt})`)
    .orderBy(sql`date_trunc('day', ${altas.paidAt})`);

  return rows.map((r) => ({
    day: String(r.day),
    count: Number(r.count ?? 0),
  }));
}
