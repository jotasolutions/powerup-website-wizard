import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MOCK_MODE, FEE_GESTION_WEB_PROPIA_EUR } from "./alta-config";

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
      // pequeña simulación de latencia para que se note el "buscando"
      await new Promise((r) => setTimeout(r, 350));
      return { results: all.filter((_, i) => i < (q.length < 3 ? 3 : 4)) };
    }

    // TODO: Integración real con Google Places API.
    // Lee la API key desde Lovable Cloud secrets (p. ej. GOOGLE_PLACES_API_KEY).
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
      // precio final aleatorio 12-40 €
      const price = Math.round((12 + Math.random() * 28) * 100) / 100;
      return { available: true, price };
    }

    // TODO: Integración real con el registrador de dominios.
    // price = coste registrador + nuestro recargo, calculado aquí.
    throw new Error("MOCK_MODE desactivado pero la integración real no está configurada.");
  });

// ─────────────────────────────────────────────────────────────────────────────
// create-checkout: persiste el alta y abre Stripe Checkout.
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

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AltaInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("altas")
      .insert({
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
        status: "pending_payment",
      })
      .select("id")
      .single();

    if (error || !row) {
      throw new Error(`No se pudo guardar el alta: ${error?.message ?? "desconocido"}`);
    }

    if (MOCK_MODE) {
      // En mock saltamos Stripe y devolvemos directamente confirmación.
      await supabaseAdmin
        .from("altas")
        .update({ status: "paid", stripe_session_id: `mock_${row.id}` })
        .eq("id", row.id);
      return { alta_id: row.id, checkout_url: null, mock: true };
    }

    // TODO: Crear sesión real de Stripe Checkout con:
    //  - Subscripción del plan Pro Anual (Stripe Price ID configurable) + trial_period_days ≈ 30
    //  - Si onetime_fee_concept != null → añadir línea one-time con onetime_fee_amount
    //  - Activar billing_address_collection y tax_id_collection
    //  - success_url=/confirmacion?alta_id=<id>, cancel_url=/?cancelado=1
    // Lee STRIPE_SECRET_KEY y STRIPE_PRICE_PRO_ANUAL desde Lovable Cloud secrets.
    void FEE_GESTION_WEB_PROPIA_EUR; // silencia "unused" hasta integración real
    throw new Error("MOCK_MODE desactivado pero la integración real no está configurada.");
  });

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
