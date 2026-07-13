import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FEE_GESTION_WEB_PROPIA_EUR } from "./alta-config";
import { dispatchAltaLeadNotification, dispatchAltaPaidNotification } from "./alta-slack.server";
import { dispatchCheckoutConfirmationEmail } from "./alta-email.server";
import { captureServerEvent } from "./posthog-server";
import {
  createAltaCheckoutSession,
  hasStripeCheckout,
  normalizeStripeId,
  retrieveCheckoutSession,
  extractAltaIdFromCheckoutSession,
  isCheckoutSessionComplete,
} from "./stripe.server";
import { getAppOrigin } from "./app-env.server";
import {
  fulfillAltaFromCheckout,
  getAltaById,
  insertAlta,
  markAltaPaidMock,
  markCheckoutStarted,
  type AltaInsertPayload,
} from "./db-server";
import {
  hasEvolutionConfig,
  hasGooglePlaces,
  hasNamecheapConfig,
  shouldMockDomainCheck,
} from "./env.server";
import {
  searchHospitalityBusinesses,
  resolveAddressSuggestions,
  getSimplifiedAddress,
} from "./google-places.server";
import { enrichPlaceProfile } from "./place-enrichment.server";
import { checkDomainWithNamecheap } from "./namecheap.server";
import { normalizePowerUpCustomerForPersist } from "./powerup-customer";
import { getClientIpFromRequest } from "./request-context.server";
import {
  isTestWhatsappBypass,
  normalizeWhatsappDigits,
} from "./whatsapp-validate.server";
import WhatsappRepository from "@/server/repositories/WhatsappRepository";

// ─────────────────────────────────────────────────────────────────────────────
// validate-whatsapp: comprueba si el número existe en WhatsApp vía Evolution.
// ─────────────────────────────────────────────────────────────────────────────
export const validateWhatsapp = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ phone: z.string().min(3) }).parse(input))
  .handler(async ({ data }) => {
    const phone = normalizeWhatsappDigits(data.phone);
    if (phone.length < 8) {
      throw new Error("invalid_whatsapp_number");
    }

    if (isTestWhatsappBypass(phone)) {
      return { valid: true as const, test_bypass: true as const };
    }

    if (!hasEvolutionConfig()) {
      throw new Error("Falta configuración de Evolution API en las variables de entorno.");
    }

    const exists = await WhatsappRepository.doesWhatsappNumExists(phone);
    if (!exists) {
      throw new Error("invalid_whatsapp_number");
    }

    return { valid: true as const };
  });

// ─────────────────────────────────────────────────────────────────────────────
// gmb-search: busca locales de hostelería en Google (restaurante, bar, cafetería…).
// ─────────────────────────────────────────────────────────────────────────────
export const gmbSearch = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ query: z.string().min(3) }).parse(input))
  .handler(async ({ data }) => {
    if (!hasGooglePlaces()) {
      throw new Error("Falta GOOGLE_PLACES_API_KEY en las variables de entorno.");
    }

    const results = await searchHospitalityBusinesses(data.query);
    return { results };
  });

// ─────────────────────────────────────────────────────────────────────────────
// address-autocomplete: sugerencias de dirección (calle + ciudad, sin número).
// ─────────────────────────────────────────────────────────────────────────────
export const addressAutocomplete = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        query: z.string().min(3),
        session_token: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (!hasGooglePlaces()) {
      throw new Error("Falta GOOGLE_PLACES_API_KEY en las variables de entorno.");
    }

    const suggestions = await resolveAddressSuggestions(data.query, data.session_token);
    return { suggestions };
  });

export const addressResolve = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ place_id: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    if (!hasGooglePlaces()) {
      throw new Error("Falta GOOGLE_PLACES_API_KEY en las variables de entorno.");
    }

    const simplified_address = await getSimplifiedAddress(data.place_id);
    return { simplified_address };
  });

// ─────────────────────────────────────────────────────────────────────────────
// enrich-place: perfil enriquecido de un restaurante (Places API New).
// ─────────────────────────────────────────────────────────────────────────────
export const enrichPlace = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        place_id: z.string().min(1),
        fallback_name: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (!hasGooglePlaces()) {
      throw new Error("Falta GOOGLE_PLACES_API_KEY en las variables de entorno.");
    }

    const profile = await enrichPlaceProfile(data.place_id, data.fallback_name);
    return { profile };
  });

// ─────────────────────────────────────────────────────────────────────────────
// check-domain: comprueba disponibilidad y devuelve precio final al cliente.
// ─────────────────────────────────────────────────────────────────────────────
export const checkDomain = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ domain: z.string().min(3) }).parse(input))
  .handler(async ({ data }) => {
    const domain = data.domain.toLowerCase().trim();

    if (shouldMockDomainCheck()) {
      await new Promise((r) => setTimeout(r, 500));
      if (domain.includes("test")) {
        const [sld = "turestaurante", tld = "es"] = domain.split(".");
        return {
          available: false as const,
          alternatives: [
            { domain: `${sld}.com`, price: 17.9 },
            { domain: `${sld}.menu`, price: 21.9 },
            { domain: `${sld}-restaurante.${tld}`, price: 16.9 },
          ],
        };
      }
      const price = Math.round((12 + Math.random() * 28) * 100) / 100;
      return { available: true, price };
    }

    if (!hasNamecheapConfig()) {
      throw new Error(
        "Falta configuración de Namecheap. Define NAMECHEAP_API_USER, NAMECHEAP_API_KEY y NAMECHEAP_CLIENT_IP.",
      );
    }

    return checkDomainWithNamecheap(domain);
  });

// ─────────────────────────────────────────────────────────────────────────────
// Checkout: persiste el alta en Neon y abre Stripe Checkout (una sola llamada).
// Para guardar el lead antes del pago, usar saveAlta + createCheckout por separado.
// ─────────────────────────────────────────────────────────────────────────────
const AltaConsentFields = z.object({
  terms_version: z.string().min(1),
  terms_document_url: z.string().url(),
  consent_user_agent: z.string().nullable().optional(),
});

const AltaInput = z
  .object({
    restaurant_name: z.string().min(1),
    restaurant_address: z.string().nullable(),
    gmb_place_id: z.string().nullable(),
    has_existing_website: z.boolean(),
    existing_website_url: z.string().nullable(),
    wants_custom_domain: z.boolean(),
    domain: z.string().min(1),
    domain_is_custom: z.boolean(),
    domain_initial_choice: z.enum(["free", "paid"]).nullable(),
    domain_downgraded: z.boolean(),
    powerup_customer: z.enum(["unknown", "yes", "no"]),
    onetime_fee_concept: z.enum(["gestion", "dominio"]).nullable(),
    onetime_fee_amount: z.number().nullable(),
    contact_name: z.string().min(1),
    whatsapp: z.string().min(3),
    /** Origen del navegador (p. ej. http://localhost:8081) para URLs de vuelta de Stripe. */
    origin: z.string().url().optional(),
  })
  .merge(AltaConsentFields);

function toInsertPayload(
  data: z.infer<typeof AltaInput>,
  powerupCustomer: "yes" | "no",
): AltaInsertPayload {
  return {
    restaurant_name: data.restaurant_name,
    restaurant_address: data.restaurant_address,
    gmb_place_id: data.gmb_place_id,
    has_existing_website: data.has_existing_website,
    existing_website_url: data.existing_website_url,
    wants_custom_domain: data.wants_custom_domain,
    domain: data.domain,
    domain_is_custom: data.domain_is_custom,
    domain_initial_choice: data.domain_initial_choice,
    domain_downgraded: data.domain_downgraded,
    powerup_customer: powerupCustomer,
    onetime_fee_concept: data.onetime_fee_concept,
    onetime_fee_amount: data.onetime_fee_amount,
    contact_name: data.contact_name,
    whatsapp: data.whatsapp,
    terms_accepted_at: new Date(),
    terms_version: data.terms_version,
    terms_document_url: data.terms_document_url,
    consent_user_agent: data.consent_user_agent ?? null,
    consent_ip: getClientIpFromRequest(),
  };
}

export const startCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => AltaInput.parse(input))
  .handler(async ({ data }) => {
    const powerupCustomer = normalizePowerUpCustomerForPersist(data.powerup_customer);
    const altaId = await insertAlta(toInsertPayload(data, powerupCustomer));

    dispatchAltaLeadNotification(altaId);

    const useStripe = hasStripeCheckout();

    if (!useStripe) {
      const result = await markAltaPaidMock(altaId);
      if (result.outcome === "fulfilled") {
        dispatchAltaPaidNotification(altaId, "mock_checkout");
        dispatchCheckoutConfirmationEmail(altaId);
      }
      void FEE_GESTION_WEB_PROPIA_EUR;
      return { alta_id: altaId, checkout_url: null as string | null, mock: true };
    }

    const session = await createAltaCheckoutSession({
      altaId,
      origin: data.origin ?? getAppOrigin(),
      restaurantName: data.restaurant_name,
      powerupCustomer,
      onetimeFeeConcept: data.onetime_fee_concept,
      onetimeFeeAmount: data.onetime_fee_amount,
    });

    if (!session.url) {
      throw new Error("Stripe no devolvió una URL de checkout.");
    }

    return { alta_id: altaId, checkout_url: session.url, mock: false };
  });

/** Guarda el alta en Neon (lead con WhatsApp) antes de abrir Stripe. */
export const saveAlta = createServerFn({ method: "POST" })
  .validator((input: unknown) => AltaInput.omit({ origin: true }).parse(input))
  .handler(async ({ data }) => {
    const powerupCustomer = normalizePowerUpCustomerForPersist(data.powerup_customer);
    const altaId = await insertAlta(toInsertPayload(data, powerupCustomer));

    dispatchAltaLeadNotification(altaId);

    captureServerEvent({
      distinctId: altaId,
      event: "alta_lead_saved",
      properties: {
        alta_id: altaId,
        restaurant_name: data.restaurant_name,
        has_gmb: data.gmb_place_id != null,
        domain_is_custom: data.domain_is_custom,
        domain_initial_choice: data.domain_initial_choice,
        domain_downgraded: data.domain_downgraded,
        powerup_customer: powerupCustomer,
      },
    });

    return { alta_id: altaId, saved: true as const };
  });

/** Abre Stripe Checkout para un alta ya guardado (pending_payment). */
export const createCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        alta_id: z.string().uuid(),
        origin: z.string().url().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const alta = await getAltaById(data.alta_id);
    if (!alta) {
      throw new Error("No encontramos tu solicitud. Vuelve a intentarlo.");
    }

    if (alta.status !== "pending_payment") {
      throw new Error("Esta solicitud ya fue procesada.");
    }

    const useStripe = hasStripeCheckout();

    if (!useStripe) {
      const result = await markAltaPaidMock(data.alta_id);
      if (result.outcome === "fulfilled") {
        dispatchAltaPaidNotification(data.alta_id, "mock_checkout");
        dispatchCheckoutConfirmationEmail(data.alta_id);
      }
      void FEE_GESTION_WEB_PROPIA_EUR;
      return { alta_id: data.alta_id, checkout_url: null as string | null, mock: true };
    }

    const onetimeFeeAmount = alta.onetimeFeeAmount != null ? Number(alta.onetimeFeeAmount) : null;

    const powerupCustomer = normalizePowerUpCustomerForPersist(alta.powerupCustomer);

    const session = await createAltaCheckoutSession({
      altaId: data.alta_id,
      origin: data.origin ?? getAppOrigin(),
      restaurantName: alta.restaurantName,
      powerupCustomer,
      onetimeFeeConcept: alta.onetimeFeeConcept,
      onetimeFeeAmount,
    });

    if (!session.url) {
      throw new Error("Stripe no devolvió una URL de checkout.");
    }

    await markCheckoutStarted(data.alta_id, session.id);

    captureServerEvent({
      distinctId: data.alta_id,
      event: "checkout_session_created",
      properties: {
        alta_id: data.alta_id,
        restaurant_name: alta.restaurantName,
        powerup_customer: powerupCustomer,
        stripe_session_id: session.id,
      },
    });

    return { alta_id: data.alta_id, checkout_url: session.url, mock: false };
  });

export const finalizeCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        alta_id: z.string().uuid(),
        session_id: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (!hasStripeCheckout()) {
      return { ok: true, mock: true };
    }

    const session = await retrieveCheckoutSession(data.session_id);

    if (extractAltaIdFromCheckoutSession(session) !== data.alta_id) {
      throw new Error("La sesión de pago no corresponde a esta solicitud.");
    }

    if (!isCheckoutSessionComplete(session)) {
      throw new Error("El pago no se ha completado todavía.");
    }

    const result = await fulfillAltaFromCheckout({
      altaId: data.alta_id,
      stripeSessionId: session.id,
      stripeSubscriptionId: normalizeStripeId(session.subscription),
      stripeCustomerId: normalizeStripeId(session.customer),
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    });

    if (result.outcome === "still_pending") {
      throw new Error("No se pudo confirmar el alta todavía. Inténtalo de nuevo en unos segundos.");
    }

    if (result.outcome === "alta_not_found") {
      throw new Error("No encontramos tu solicitud.");
    }

    if (result.outcome === "fulfilled") {
      const amountPaidEur =
        session.amount_total != null ? session.amount_total / 100 : null;
      dispatchAltaPaidNotification(data.alta_id, "finalize_checkout");
      dispatchCheckoutConfirmationEmail(data.alta_id, amountPaidEur);
    }

    return {
      ok: true,
      mock: false,
      fulfilled: result.outcome === "fulfilled",
      outcome: result.outcome,
    };
  });

/** Resumen público del alta para la página de confirmación (sin datos sensibles). */
export const getAltaSummary = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ alta_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const alta = await getAltaById(data.alta_id);
    if (!alta) return null;

    return {
      alta_id: alta.id,
      powerup_customer: alta.powerupCustomer,
      restaurant_name: alta.restaurantName,
      contact_name: alta.contactName,
      restaurant_address: alta.restaurantAddress,
      whatsapp: alta.whatsapp,
      domain: alta.domain,
      customer_email: alta.customerEmail,
      checkout_email_sent: alta.checkoutEmailSentAt != null,
      customer_email_bounced: alta.customerEmailBouncedAt != null,
    };
  });
