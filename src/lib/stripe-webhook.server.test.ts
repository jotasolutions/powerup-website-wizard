import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { handleStripeWebhookEvent } from "./stripe-webhook.server";
import { fulfillAltaFromCheckout, getAltaById } from "./db-server";
import { captureServerEvent } from "./posthog-server";

vi.mock("./alta-slack.server", () => ({
  dispatchAltaPaidNotification: vi.fn(),
}));

vi.mock("./db-server", () => ({
  fulfillAltaFromCheckout: vi.fn(),
  getAltaById: vi.fn(),
}));

vi.mock("./posthog-server", () => ({
  captureServerEvent: vi.fn(),
}));

function completedEvent(): Stripe.Event {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        status: "complete",
        metadata: { alta_id: "alta-123" },
        subscription: "sub_123",
        customer: "cus_123",
      },
    },
  } as unknown as Stripe.Event;
}

describe("handleStripeWebhookEvent analytics enrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captura alta_fulfilled enriquecido cuando outcome es fulfilled", async () => {
    vi.mocked(fulfillAltaFromCheckout).mockResolvedValue({ outcome: "fulfilled" });
    vi.mocked(getAltaById).mockResolvedValue({
      hasExistingWebsite: false,
      domainIsCustom: true,
      onetimeFeeAmount: "19.99",
    } as never);

    const result = await handleStripeWebhookEvent(completedEvent());

    expect(result.status).toBe(200);
    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "alta-123",
        event: "alta_fulfilled",
        properties: expect.objectContaining({
          checkout_scenario: "custom_domain",
          onetime_fee_amount: 19.99,
          source: "stripe_webhook",
        }),
      }),
    );
  });

  it("si falla derivación de props nuevas mantiene capture base sin romper webhook", async () => {
    vi.mocked(fulfillAltaFromCheckout).mockResolvedValue({ outcome: "fulfilled" });
    vi.mocked(getAltaById).mockRejectedValue(new Error("db down"));

    const result = await handleStripeWebhookEvent(completedEvent());

    expect(result.status).toBe(200);
    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "alta_fulfilled",
        properties: expect.objectContaining({
          alta_id: "alta-123",
          source: "stripe_webhook",
        }),
      }),
    );
    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.not.objectContaining({
          checkout_scenario: expect.anything(),
          onetime_fee_amount: expect.anything(),
        }),
      }),
    );
  });

  it("no lee alta ni captura evento cuando outcome no es fulfilled", async () => {
    vi.mocked(fulfillAltaFromCheckout).mockResolvedValue({ outcome: "already_fulfilled" });

    const result = await handleStripeWebhookEvent(completedEvent());

    expect(result.status).toBe(200);
    expect(getAltaById).not.toHaveBeenCalled();
    expect(captureServerEvent).not.toHaveBeenCalled();
  });
});
