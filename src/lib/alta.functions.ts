import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FEE_GESTION_WEB_PROPIA_EUR } from "./alta-config";
import {
  createAltaCheckoutSession,
  hasStripeCheckout,
  verifyCheckoutSession,
} from "./stripe.server";
import { getAppOrigin } from "./app-env.server";
import { getAltaById, insertAlta, markAltaPaid } from "./db-server";
import {
  hasEvolutionConfig,
  hasGooglePlaces,
  hasNamecheapConfig,
  shouldMockDomainCheck,
} from "./env.server";
import { searchRestaurants } from "./google-places.server";
import { checkDomainWithNamecheap } from "./namecheap.server";
import WhatsappRepository from "@/server/repositories/WhatsappRepository";

function normalizeWhatsapp(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// validate-whatsapp: comprueba si el número existe en WhatsApp vía Evolution.
// ─────────────────────────────────────────────────────────────────────────────
export const validateWhatsapp = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ phone: z.string().min(3) }).parse(input))
  .handler(async ({ data }) => {
    if (!hasEvolutionConfig()) {
      throw new Error("Falta configuración de Evolution API en las variables de entorno.");
    }

    const phone = normalizeWhatsapp(data.phone);
    if (phone.length < 8) {
      throw new Error("invalid_whatsapp_number");
    }

    const exists = await WhatsappRepository.doesWhatsappNumExists(phone);
    if (!exists) {
      throw new Error("invalid_whatsapp_number");
    }

    return { valid: true as const };
  });

// ─────────────────────────────────────────────────────────────────────────────
// gmb-search: busca restaurantes en Google Business Profile / Places.
// ─────────────────────────────────────────────────────────────────────────────
export const gmbSearch = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ query: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    if (!hasGooglePlaces()) {
      throw new Error("Falta GOOGLE_PLACES_API_KEY en las variables de entorno.");
    }

    const results = await searchRestaurants(data.query);
    return { results };
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
const AltaInput = z.object({
  restaurant_name: z.string().min(1),
  restaurant_address: z.string().nullable(),
  gmb_place_id: z.string().nullable(),
  has_existing_website: z.boolean(),
  existing_website_url: z.string().nullable(),
  wants_custom_domain: z.boolean(),
  domain: z.string().min(1),
  domain_is_custom: z.boolean(),
  onetime_fee_concept: z.enum(["gestion", "dominio"]).nullable(),
  onetime_fee_amount: z.number().nullable(),
  contact_name: z.string().min(1),
  whatsapp: z.string().min(3),
  /** Origen del navegador (p. ej. http://localhost:8081) para URLs de vuelta de Stripe. */
  origin: z.string().url().optional(),
});

export const startCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => AltaInput.parse(input))
  .handler(async ({ data }) => {
    const altaId = await insertAlta({
      restaurant_name: data.restaurant_name,
      restaurant_address: data.restaurant_address,
      gmb_place_id: data.gmb_place_id,
      has_existing_website: data.has_existing_website,
      existing_website_url: data.existing_website_url,
      wants_custom_domain: data.wants_custom_domain,
      domain: data.domain,
      domain_is_custom: data.domain_is_custom,
      onetime_fee_concept: data.onetime_fee_concept,
      onetime_fee_amount: data.onetime_fee_amount,
      contact_name: data.contact_name,
      whatsapp: data.whatsapp,
    });

    const useStripe = hasStripeCheckout();

    if (!useStripe) {
      await markAltaPaid(altaId, `mock_${altaId}`);
      void FEE_GESTION_WEB_PROPIA_EUR;
      return { alta_id: altaId, checkout_url: null as string | null, mock: true };
    }

    const session = await createAltaCheckoutSession({
      altaId,
      origin: data.origin ?? getAppOrigin(),
      restaurantName: data.restaurant_name,
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
    const altaId = await insertAlta({
      restaurant_name: data.restaurant_name,
      restaurant_address: data.restaurant_address,
      gmb_place_id: data.gmb_place_id,
      has_existing_website: data.has_existing_website,
      existing_website_url: data.existing_website_url,
      wants_custom_domain: data.wants_custom_domain,
      domain: data.domain,
      domain_is_custom: data.domain_is_custom,
      onetime_fee_concept: data.onetime_fee_concept,
      onetime_fee_amount: data.onetime_fee_amount,
      contact_name: data.contact_name,
      whatsapp: data.whatsapp,
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
      await markAltaPaid(data.alta_id, `mock_${data.alta_id}`);
      void FEE_GESTION_WEB_PROPIA_EUR;
      return { alta_id: data.alta_id, checkout_url: null as string | null, mock: true };
    }

    const onetimeFeeAmount =
      alta.onetimeFeeAmount != null ? Number(alta.onetimeFeeAmount) : null;

    const session = await createAltaCheckoutSession({
      altaId: data.alta_id,
      origin: data.origin ?? getAppOrigin(),
      restaurantName: alta.restaurantName,
      onetimeFeeConcept: alta.onetimeFeeConcept,
      onetimeFeeAmount,
    });

    if (!session.url) {
      throw new Error("Stripe no devolvió una URL de checkout.");
    }

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

    const isValid = await verifyCheckoutSession(data.alta_id, data.session_id);
    if (!isValid) {
      throw new Error("El pago no se ha completado todavía.");
    }

    await markAltaPaid(data.alta_id, data.session_id);
    return { ok: true, mock: false };
  });
