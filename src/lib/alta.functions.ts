import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MOCK_MODE, FEE_GESTION_WEB_PROPIA_EUR } from "./alta-config";
import {
  createAltaCheckoutSession,
  hasStripeCheckout,
  verifyCheckoutSession,
} from "./stripe.server";
import { getAppOrigin } from "./supabase-env.server";
import { getAltaById, insertAlta, markAltaPaid } from "./db-server";

// ─────────────────────────────────────────────────────────────────────────────
// gmb-search: busca restaurantes en Google Business Profile / Places.
// ─────────────────────────────────────────────────────────────────────────────
export const gmbSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (MOCK_MODE) {
      const q = data.query.toLowerCase();
      const all = [
        {
          name: `Bar ${capitalize(data.query)}`,
          address: "Calle Mayor 12, 28013 Madrid, España",
          place_id: "mock_place_001",
        },
        {
          name: `Restaurante ${capitalize(data.query)} & Co.`,
          address: "Av. Diagonal 245, 08018 Barcelona, España",
          place_id: "mock_place_002",
        },
        {
          name: `Taberna La ${capitalize(data.query)}`,
          address: "Plaza del Carmen 3, 41004 Sevilla, España",
          place_id: "mock_place_003",
        },
        {
          name: `${capitalize(data.query)} Gastrobar`,
          address: "Calle Botxí 8, 46003 Valencia, España",
          place_id: "mock_place_004",
        },
      ];
      await new Promise((r) => setTimeout(r, 350));
      return { results: all.filter((_, i) => i < (q.length < 3 ? 3 : 4)) };
    }

    throw new Error("MOCK_MODE desactivado pero la integración real no está configurada.");
  });

// ─────────────────────────────────────────────────────────────────────────────
// check-domain: comprueba disponibilidad y devuelve precio final al cliente.
// ─────────────────────────────────────────────────────────────────────────────
export const checkDomain = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ domain: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      const domain = data.domain.toLowerCase().trim();
      if (domain.includes("test")) {
        return { available: false, price: 0 };
      }
      const price = Math.round((12 + Math.random() * 28) * 100) / 100;
      return { available: true, price };
    }

    throw new Error("MOCK_MODE desactivado pero la integración real no está configurada.");
  });

// ─────────────────────────────────────────────────────────────────────────────
// save-alta: persiste el alta en Neon antes de abrir Stripe Checkout.
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
});

export const saveAlta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AltaInput.parse(input))
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

// ─────────────────────────────────────────────────────────────────────────────
// create-checkout: abre Stripe Checkout para un alta ya guardada en la BBDD.
// ─────────────────────────────────────────────────────────────────────────────
export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ alta_id: z.string().uuid() }).parse(input),
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
      origin: getAppOrigin(),
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
  .inputValidator((input: unknown) =>
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
