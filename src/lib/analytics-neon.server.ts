import { and, count, eq, gte, isNotNull, lte, min, or, sql } from "drizzle-orm";
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

export type Day30SubscriptionTile =
  | {
      mode: "waiting";
      hasPaidAltas: false;
      oldestPaidAt: null;
      matureDate: null;
    }
  | {
      mode: "waiting";
      hasPaidAltas: true;
      oldestPaidAt: string;
      matureDate: string;
    }
  | {
      mode: "data_unavailable";
      hasPaidAltas: true;
      oldestPaidAt: string;
      matureDate: string;
      todo: string;
    };

export async function getDay30SubscriptionTile(): Promise<Day30SubscriptionTile> {
  const [row] = await getDb()
    .select({ oldest: min(altas.paidAt) })
    .from(altas)
    .where(and(eq(altas.status, "paid"), isNotNull(altas.paidAt)));

  const oldestPaidAt = row?.oldest ?? null;
  if (!oldestPaidAt) {
    return { mode: "waiting", hasPaidAltas: false, oldestPaidAt: null, matureDate: null };
  }

  const matureDate = addDays(oldestPaidAt, 30);
  const isoOldest = oldestPaidAt.toISOString();
  const isoMature = matureDate.toISOString();

  if (new Date() < matureDate) {
    return {
      mode: "waiting",
      hasPaidAltas: true,
      oldestPaidAt: isoOldest,
      matureDate: isoMature,
    };
  }

  return {
    mode: "data_unavailable",
    hasPaidAltas: true,
    oldestPaidAt: isoOldest,
    matureDate: isoMature,
    todo:
      "Falta estado de suscripción Stripe en Neon (webhooks customer.subscription.updated/deleted).",
  };
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
