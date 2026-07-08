import type Stripe from "stripe";
import { and, eq, isNotNull, lte, min } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { altas } from "@/db/schema";
import { hasStripeConfig } from "./env.server";
import { retrieveStripeSubscription } from "./stripe.server";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export type Day30CohortMember = {
  stripeSubscriptionId: string | null;
  isDomainPaid: boolean;
};

export type Day30RetentionBreakdown = {
  total: number;
  retained: number;
  rate: number;
};

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
      mode: "retention";
      cohortSize: number;
      retained: number;
      retentionRate: number;
      pastDue: number;
      missingStripeIds: number;
      domainPaid: Day30RetentionBreakdown;
      subdomainFree: Day30RetentionBreakdown;
      cachedAt: string;
    }
  | {
      mode: "stripe_unavailable";
      matureDate: string;
      reason: string;
    };

/** Suscripción que sigue activa post-trial (incluye past_due: aún no cancelada). */
export function isSubscriptionRetained(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function isDomainPaidAlta(onetimeFeeAmount: string | null | undefined): boolean {
  if (onetimeFeeAmount == null) return false;
  return Number(onetimeFeeAmount) > 0;
}

export function aggregateDay30Retention(
  members: Array<{ status: Stripe.Subscription.Status | "missing"; isDomainPaid: boolean }>,
): Pick<
  Day30SubscriptionTile & { mode: "retention" },
  | "cohortSize"
  | "retained"
  | "retentionRate"
  | "pastDue"
  | "missingStripeIds"
  | "domainPaid"
  | "subdomainFree"
> {
  const cohortSize = members.length;
  let retained = 0;
  let pastDue = 0;
  let missingStripeIds = 0;

  const domainMembers = members.filter((m) => m.isDomainPaid);
  const subdomainMembers = members.filter((m) => !m.isDomainPaid);

  const countRetained = (list: typeof members) =>
    list.filter((m) => m.status !== "missing" && isSubscriptionRetained(m.status)).length;

  const countPastDue = (list: typeof members) =>
    list.filter((m) => m.status === "past_due").length;

  for (const m of members) {
    if (m.status === "missing") {
      missingStripeIds += 1;
      continue;
    }
    if (isSubscriptionRetained(m.status)) retained += 1;
    if (m.status === "past_due") pastDue += 1;
  }

  const domainRetained = countRetained(domainMembers);
  const subdomainRetained = countRetained(subdomainMembers);

  return {
    cohortSize,
    retained,
    retentionRate: cohortSize > 0 ? retained / cohortSize : 0,
    pastDue,
    missingStripeIds,
    domainPaid: {
      total: domainMembers.length,
      retained: domainRetained,
      rate: domainMembers.length > 0 ? domainRetained / domainMembers.length : 0,
    },
    subdomainFree: {
      total: subdomainMembers.length,
      retained: subdomainRetained,
      rate: subdomainMembers.length > 0 ? subdomainRetained / subdomainMembers.length : 0,
    },
  };
}

let cachedTile: { at: number; data: Day30SubscriptionTile } | null = null;

export function clearDay30SubscriptionCache(): void {
  cachedTile = null;
}

async function getOldestPaidAt(): Promise<Date | null> {
  const [row] = await getDb()
    .select({ oldest: min(altas.paidAt) })
    .from(altas)
    .where(and(eq(altas.status, "paid"), isNotNull(altas.paidAt)));
  return row?.oldest ?? null;
}

async function getMatureCohortMembers(): Promise<Day30CohortMember[]> {
  const cutoff = addDays(new Date(), -30);
  const rows = await getDb()
    .select({
      stripeSubscriptionId: altas.stripeSubscriptionId,
      onetimeFeeAmount: altas.onetimeFeeAmount,
    })
    .from(altas)
    .where(
      and(eq(altas.status, "paid"), isNotNull(altas.paidAt), lte(altas.paidAt, cutoff)),
    );

  return rows.map((row) => ({
    stripeSubscriptionId: row.stripeSubscriptionId,
    isDomainPaid: isDomainPaidAlta(row.onetimeFeeAmount),
  }));
}

async function resolveSubscriptionStatus(
  subscriptionId: string,
): Promise<Stripe.Subscription.Status | "missing"> {
  try {
    const sub = await retrieveStripeSubscription(subscriptionId);
    return sub.status;
  } catch {
    return "missing";
  }
}

export async function getDay30SubscriptionTile(): Promise<Day30SubscriptionTile> {
  if (cachedTile && Date.now() - cachedTile.at < CACHE_TTL_MS) {
    return cachedTile.data;
  }

  const oldestPaidAt = await getOldestPaidAt();
  if (!oldestPaidAt) {
    const data: Day30SubscriptionTile = {
      mode: "waiting",
      hasPaidAltas: false,
      oldestPaidAt: null,
      matureDate: null,
    };
    cachedTile = { at: Date.now(), data };
    return data;
  }

  const matureDate = addDays(oldestPaidAt, 30);
  const isoOldest = oldestPaidAt.toISOString();
  const isoMature = matureDate.toISOString();

  if (new Date() < matureDate) {
    const data: Day30SubscriptionTile = {
      mode: "waiting",
      hasPaidAltas: true,
      oldestPaidAt: isoOldest,
      matureDate: isoMature,
    };
    cachedTile = { at: Date.now(), data };
    return data;
  }

  if (!hasStripeConfig()) {
    const data: Day30SubscriptionTile = {
      mode: "stripe_unavailable",
      matureDate: isoMature,
      reason: "STRIPE_SECRET_KEY no configurada — no se puede consultar el estado de suscripción.",
    };
    cachedTile = { at: Date.now(), data };
    return data;
  }

  const cohort = await getMatureCohortMembers();
  const statuses = await Promise.all(
    cohort.map(async (member) => {
      if (!member.stripeSubscriptionId) {
        return { status: "missing" as const, isDomainPaid: member.isDomainPaid };
      }
      const status = await resolveSubscriptionStatus(member.stripeSubscriptionId);
      return { status, isDomainPaid: member.isDomainPaid };
    }),
  );

  const aggregated = aggregateDay30Retention(statuses);
  const data: Day30SubscriptionTile = {
    mode: "retention",
    ...aggregated,
    cachedAt: new Date().toISOString(),
  };
  cachedTile = { at: Date.now(), data };
  return data;
}
