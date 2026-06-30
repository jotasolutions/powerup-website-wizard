import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { hasStripeWebhookConfig } from "@/lib/env.server";
import { constructStripeWebhookEvent } from "@/lib/stripe.server";
import { handleStripeWebhookEvent } from "@/lib/stripe-webhook.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Sin config: 200 silencioso — Stripe reintenta días ante 4xx/5xx.
        if (!hasStripeWebhookConfig()) {
          return new Response(null, { status: 200 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
          return new Response("Missing stripe-signature header", { status: 400 });
        }

        let event: Stripe.Event;
        try {
          event = constructStripeWebhookEvent(rawBody, signature);
        } catch (error) {
          if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
            return new Response("Invalid signature", { status: 400 });
          }
          throw error;
        }

        const result = await handleStripeWebhookEvent(event);
        return new Response(result.body ?? null, {
          status: result.status,
          headers: result.body ? { "content-type": "application/json" } : undefined,
        });
      },
    },
  },
});
