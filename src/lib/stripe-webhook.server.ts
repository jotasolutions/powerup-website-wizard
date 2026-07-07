import type Stripe from "stripe";
import { dispatchAltaPaidNotification } from "./alta-slack.server";
import { fulfillAltaFromCheckout, getAltaById } from "./db-server";
import { resolveCheckoutScenario } from "./checkout-scenario";
import {
  extractAltaIdFromCheckoutSession,
  isCheckoutSessionComplete,
  normalizeStripeId,
} from "./stripe.server";
import { captureServerEvent } from "./posthog-server";

export type WebhookHandlerResult = {
  status: number;
  body?: string;
};

/**
 * Procesa eventos Stripe ya verificados (firma validada en la route).
 * Siempre devuelve 200 salvo fallos transitorios que deben reintentarse.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<WebhookHandlerResult> {
  if (event.type === "checkout.session.completed") {
    return handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
  }

  // TODO(etapa 8+): checkout.session.async_payment_succeeded / async_payment_failed
  return { status: 200, body: JSON.stringify({ received: true }) };
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult> {
  if (!isCheckoutSessionComplete(session)) {
    console.error(
      JSON.stringify({
        event: "checkout_session_not_complete",
        session_id: session.id,
        status: session.status,
      }),
    );
    return { status: 200, body: JSON.stringify({ received: true }) };
  }

  const altaId = extractAltaIdFromCheckoutSession(session);
  if (!altaId) {
    console.error(
      JSON.stringify({
        event: "checkout_session_missing_alta_id",
        session_id: session.id,
      }),
    );
    return { status: 200, body: JSON.stringify({ received: true }) };
  }

  const stripeSubscriptionId = normalizeStripeId(session.subscription);
  const stripeCustomerId = normalizeStripeId(session.customer);

  const result = await fulfillAltaFromCheckout({
    altaId,
    stripeSessionId: session.id,
    stripeSubscriptionId,
    stripeCustomerId,
  });

  if (result.outcome === "fulfilled") {
    dispatchAltaPaidNotification(altaId, "stripe_webhook");
    const properties: Record<string, unknown> = {
      alta_id: altaId,
      stripe_session_id: session.id,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      source: "stripe_webhook",
    };

    // Enriquecimiento best-effort: nunca bloquear fulfillment/webhook por estas props extra.
    try {
      const alta = await getAltaById(altaId);
      if (alta) {
        const onetimeFeeAmount =
          alta.onetimeFeeAmount != null ? Number(alta.onetimeFeeAmount) : null;
        properties.checkout_scenario = resolveCheckoutScenario({
          hasExistingWebsite: alta.hasExistingWebsite,
          domainIsCustom: alta.domainIsCustom,
        });
        properties.onetime_fee_amount = onetimeFeeAmount;
      } else {
        console.warn(
          JSON.stringify({
            event: "alta_fulfilled_enrichment_missing_alta",
            alta_id: altaId,
          }),
        );
      }
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: "alta_fulfilled_enrichment_failed",
          alta_id: altaId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    captureServerEvent({
      distinctId: altaId,
      event: "alta_fulfilled",
      properties,
    });
  }

  switch (result.outcome) {
    case "fulfilled":
    case "already_fulfilled":
    case "duplicate_paid_checkout":
    case "alta_not_found":
      return { status: 200, body: JSON.stringify({ received: true }) };
    case "still_pending":
      console.error(
        JSON.stringify({
          event: "fulfill_still_pending",
          alta_id: altaId,
          session_id: session.id,
        }),
      );
      return { status: 500, body: "Fulfillment conflict, retry" };
  }
}
