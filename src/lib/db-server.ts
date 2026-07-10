import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { altas } from "@/db/schema";
import { getServerAppEnv } from "./posthog-server";

export type AltaInsertPayload = {
  restaurant_name: string;
  restaurant_address: string | null;
  gmb_place_id: string | null;
  has_existing_website: boolean;
  existing_website_url: string | null;
  wants_custom_domain: boolean;
  domain: string;
  domain_is_custom: boolean;
  powerup_customer: "unknown" | "yes" | "no";
  onetime_fee_concept: "gestion" | "dominio" | null;
  onetime_fee_amount: number | null;
  contact_name: string;
  whatsapp: string;
  terms_accepted_at: Date;
  terms_version: string;
  terms_document_url: string;
  consent_user_agent: string | null;
  consent_ip: string | null;
};

export type FulfillAltaFromCheckoutParams = {
  altaId: string;
  stripeSessionId: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  customerEmail?: string | null;
};

export type FulfillAltaOutcome =
  | { outcome: "fulfilled" }
  | { outcome: "already_fulfilled" }
  | {
      outcome: "duplicate_paid_checkout";
      existingSubscriptionId: string | null;
      incomingSubscriptionId: string | null;
    }
  | { outcome: "alta_not_found" }
  | { outcome: "still_pending" };

/** Compara IDs de suscripción para idempotencia y detección de doble cobro. */
export function stripeSubscriptionIdsMatch(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): boolean {
  const a = existing ?? null;
  const b = incoming ?? null;
  return a === b;
}

export async function insertAlta(payload: AltaInsertPayload): Promise<string> {
  const [row] = await getDb()
    .insert(altas)
    .values({
      restaurantName: payload.restaurant_name,
      restaurantAddress: payload.restaurant_address,
      gmbPlaceId: payload.gmb_place_id,
      hasExistingWebsite: payload.has_existing_website,
      existingWebsiteUrl: payload.existing_website_url,
      wantsCustomDomain: payload.wants_custom_domain,
      domain: payload.domain,
      domainIsCustom: payload.domain_is_custom,
      powerupCustomer: payload.powerup_customer,
      onetimeFeeConcept: payload.onetime_fee_concept,
      onetimeFeeAmount:
        payload.onetime_fee_amount != null ? String(payload.onetime_fee_amount) : null,
      contactName: payload.contact_name,
      whatsapp: payload.whatsapp,
      termsAcceptedAt: payload.terms_accepted_at,
      termsVersion: payload.terms_version,
      termsDocumentUrl: payload.terms_document_url,
      consentUserAgent: payload.consent_user_agent,
      consentIp: payload.consent_ip,
      appEnv: getServerAppEnv(),
      status: "pending_payment",
    })
    .returning({ id: altas.id });

  if (!row) {
    throw new Error("No se pudo guardar el alta.");
  }

  return row.id;
}

/**
 * Promueve un alta a paid de forma idempotente.
 * Si el UPDATE no toca filas (ya paid), SELECT para distinguir reentrega vs doble cobro.
 */
export async function fulfillAltaFromCheckout(
  params: FulfillAltaFromCheckoutParams,
): Promise<FulfillAltaOutcome> {
  const paidAt = new Date();
  const updated = await getDb()
    .update(altas)
    .set({
      status: "paid",
      paidAt,
      stripeSessionId: params.stripeSessionId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripeCustomerId: params.stripeCustomerId,
      ...(params.customerEmail != null ? { customerEmail: params.customerEmail } : {}),
    })
    .where(and(eq(altas.id, params.altaId), ne(altas.status, "paid")))
    .returning({ id: altas.id });

  if (updated.length > 0) {
    return { outcome: "fulfilled" };
  }

  const existing = await getAltaById(params.altaId);
  if (!existing) {
    return { outcome: "alta_not_found" };
  }

  if (existing.status === "pending_payment") {
    return { outcome: "still_pending" };
  }

  if (stripeSubscriptionIdsMatch(existing.stripeSubscriptionId, params.stripeSubscriptionId)) {
    return { outcome: "already_fulfilled" };
  }

  console.warn(
    JSON.stringify({
      event: "duplicate_paid_checkout",
      alta_id: params.altaId,
      existing_subscription_id: existing.stripeSubscriptionId ?? null,
      incoming_subscription_id: params.stripeSubscriptionId ?? null,
      stripe_session_id: params.stripeSessionId ?? null,
    }),
  );

  return {
    outcome: "duplicate_paid_checkout",
    existingSubscriptionId: existing.stripeSubscriptionId ?? null,
    incomingSubscriptionId: params.stripeSubscriptionId ?? null,
  };
}

/** Camino mock sin Stripe: marca paid con session id sintético. */
export async function markAltaPaidMock(altaId: string): Promise<FulfillAltaOutcome> {
  const updated = await getDb()
    .update(altas)
    .set({ status: "paid", paidAt: new Date(), stripeSessionId: `mock_${altaId}` })
    .where(and(eq(altas.id, altaId), ne(altas.status, "paid")))
    .returning({ id: altas.id });

  if (updated.length > 0) {
    return { outcome: "fulfilled" };
  }

  const existing = await getAltaById(altaId);
  if (!existing) {
    return { outcome: "alta_not_found" };
  }

  if (existing.status === "paid") {
    return { outcome: "already_fulfilled" };
  }

  return { outcome: "still_pending" };
}

export async function getAltaById(altaId: string) {
  const [row] = await getDb().select().from(altas).where(eq(altas.id, altaId)).limit(1);
  return row ?? null;
}

export async function markCheckoutStarted(altaId: string, stripeSessionId: string) {
  await getDb()
    .update(altas)
    .set({
      stripeSessionId,
      checkoutStartedAt: new Date(),
    })
    .where(and(eq(altas.id, altaId), eq(altas.status, "pending_payment")));
}
