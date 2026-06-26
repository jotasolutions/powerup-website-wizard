import Stripe from "stripe";
import { PLAN_PRO_ANUAL_DIAS_PRUEBA } from "./alta-config";
import { getStripeAnnualPriceId, getStripeSecretKey, hasStripeConfig } from "./env.server";

function getStripe(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurada. Añádela en Vercel → Environment Variables.",
    );
  }

  return new Stripe(secretKey);
}

function getProAnnualPriceId(): string {
  const priceId = getStripeAnnualPriceId();

  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_PRO_ANUAL no está configurado. Añádelo en Vercel → Environment Variables.",
    );
  }

  return priceId;
}

export function hasStripeCheckout(): boolean {
  return hasStripeConfig();
}

export async function createAltaCheckoutSession(params: {
  altaId: string;
  origin: string;
  restaurantName: string;
  onetimeFeeConcept: "gestion" | "dominio" | null;
  onetimeFeeAmount: number | null;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: getProAnnualPriceId(),
      quantity: 1,
    },
  ];

  if (params.onetimeFeeConcept && params.onetimeFeeAmount && params.onetimeFeeAmount > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name:
            params.onetimeFeeConcept === "gestion"
              ? "Fee de gestión web"
              : "Dominio personalizado",
        },
        unit_amount: Math.round(params.onetimeFeeAmount * 100),
      },
      quantity: 1,
    });
  }

  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: lineItems,
    subscription_data: {
      trial_period_days: PLAN_PRO_ANUAL_DIAS_PRUEBA,
      metadata: {
        alta_id: params.altaId,
        restaurant_name: params.restaurantName,
      },
    },
    metadata: {
      alta_id: params.altaId,
      restaurant_name: params.restaurantName,
    },
    client_reference_id: params.altaId,
    success_url: `${params.origin}/confirmacion?alta_id=${params.altaId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/?cancelado=1`,
    billing_address_collection: "auto",
  });
}

export async function verifyCheckoutSession(
  altaId: string,
  sessionId: string,
): Promise<boolean> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.alta_id !== altaId && session.client_reference_id !== altaId) {
    return false;
  }

  return session.status === "complete" || session.payment_status === "paid";
}
