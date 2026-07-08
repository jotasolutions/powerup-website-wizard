import { describe, expect, it } from "vitest";
import { aggregateDay30Retention, isDomainPaidAlta, isSubscriptionRetained } from "./analytics-day30.server";

describe("isSubscriptionRetained", () => {
  it("considera active, trialing y past_due como retenidos", () => {
    expect(isSubscriptionRetained("active")).toBe(true);
    expect(isSubscriptionRetained("trialing")).toBe(true);
    expect(isSubscriptionRetained("past_due")).toBe(true);
    expect(isSubscriptionRetained("canceled")).toBe(false);
  });
});

describe("isDomainPaidAlta", () => {
  it("detecta dominio de pago por onetime_fee_amount", () => {
    expect(isDomainPaidAlta("49.00")).toBe(true);
    expect(isDomainPaidAlta("0")).toBe(false);
    expect(isDomainPaidAlta(null)).toBe(false);
  });
});

describe("aggregateDay30Retention", () => {
  it("agrega retención total y por tipo de dominio", () => {
    const result = aggregateDay30Retention([
      { status: "active", isDomainPaid: true },
      { status: "canceled", isDomainPaid: true },
      { status: "active", isDomainPaid: false },
      { status: "missing", isDomainPaid: false },
    ]);

    expect(result.cohortSize).toBe(4);
    expect(result.retained).toBe(2);
    expect(result.retentionRate).toBe(0.5);
    expect(result.missingStripeIds).toBe(1);
    expect(result.domainPaid).toEqual({ total: 2, retained: 1, rate: 0.5 });
    expect(result.subdomainFree).toEqual({ total: 2, retained: 1, rate: 0.5 });
  });
});
