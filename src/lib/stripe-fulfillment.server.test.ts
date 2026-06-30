import { describe, expect, it } from "vitest";
import { stripeSubscriptionIdsMatch } from "./db-server";
import {
  buildCheckoutSubscriptionData,
  extractAltaIdFromCheckoutSession,
  isCheckoutSessionComplete,
  normalizeStripeId,
} from "./stripe.server";

describe("normalizeStripeId", () => {
  it("devuelve string tal cual", () => {
    expect(normalizeStripeId("sub_123")).toBe("sub_123");
  });

  it("extrae id de objeto expandido", () => {
    expect(normalizeStripeId({ id: "cus_456", object: "customer" } as never)).toBe("cus_456");
  });

  it("null para valores vacíos", () => {
    expect(normalizeStripeId(null)).toBeNull();
    expect(normalizeStripeId(undefined)).toBeNull();
  });
});

describe("extractAltaIdFromCheckoutSession", () => {
  it("prefiere metadata.alta_id", () => {
    expect(
      extractAltaIdFromCheckoutSession({
        metadata: { alta_id: "meta-id" },
        client_reference_id: "ref-id",
      }),
    ).toBe("meta-id");
  });

  it("usa client_reference_id como respaldo", () => {
    expect(
      extractAltaIdFromCheckoutSession({
        metadata: {},
        client_reference_id: "ref-id",
      }),
    ).toBe("ref-id");
  });
});

describe("isCheckoutSessionComplete", () => {
  it("acepta status complete (incluye trial no_payment_required)", () => {
    expect(isCheckoutSessionComplete({ status: "complete" })).toBe(true);
  });

  it("rechaza open", () => {
    expect(isCheckoutSessionComplete({ status: "open" })).toBe(false);
  });
});

describe("stripeSubscriptionIdsMatch", () => {
  it("coincide si ambos null", () => {
    expect(stripeSubscriptionIdsMatch(null, null)).toBe(true);
  });

  it("coincide si mismo id", () => {
    expect(stripeSubscriptionIdsMatch("sub_a", "sub_a")).toBe(true);
  });

  it("no coincide si distintos", () => {
    expect(stripeSubscriptionIdsMatch("sub_a", "sub_b")).toBe(false);
  });

  it("no coincide si uno null y otro no", () => {
    expect(stripeSubscriptionIdsMatch(null, "sub_b")).toBe(false);
  });
});

describe("buildCheckoutSubscriptionData", () => {
  const base = {
    altaId: "alta-123",
    restaurantName: "Bar Test",
  };

  it("cliente nuevo incluye trial de 30 días", () => {
    const data = buildCheckoutSubscriptionData({
      ...base,
      powerupCustomer: "no",
    });
    expect(data.trial_period_days).toBe(30);
    expect(data.metadata?.powerup_customer).toBe("no");
  });

  it("unknown incluye trial (mismo que cliente nuevo)", () => {
    const data = buildCheckoutSubscriptionData({
      ...base,
      powerupCustomer: "unknown",
    });
    expect(data.trial_period_days).toBe(30);
  });

  it("upgrade carta PowerUp omite trial", () => {
    const data = buildCheckoutSubscriptionData({
      ...base,
      powerupCustomer: "yes",
    });
    expect(data.trial_period_days).toBeUndefined();
    expect(data.metadata?.powerup_customer).toBe("yes");
  });
});
