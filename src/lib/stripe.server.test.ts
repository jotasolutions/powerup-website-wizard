import { describe, expect, it } from "vitest";
import { buildCheckoutSubscriptionData } from "./stripe.server";

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
