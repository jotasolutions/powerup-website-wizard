import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AltaInsertPayload = {
  restaurant_name: string;
  restaurant_address: string | null;
  gmb_place_id: string | null;
  has_existing_website: boolean;
  existing_website_url: string | null;
  wants_custom_domain: boolean;
  domain: string;
  domain_is_custom: boolean;
  onetime_fee_concept: "gestion" | "dominio" | null;
  onetime_fee_amount: number | null;
  contact_name: string;
  whatsapp: string;
};

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createPublishableClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY.");
  }

  return createClient<Database>(url, publishableKey, {
    global: { fetch: createSupabaseFetch(publishableKey) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isServiceRoleUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("SUPABASE_SERVICE_ROLE_KEY") || message.includes("Missing Supabase environment variable");
}

async function withSupabaseAdmin<T>(
  adminOp: (admin: SupabaseClient<Database>) => Promise<T>,
  fallbackOp: (client: SupabaseClient<Database>) => Promise<T>,
): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    return await adminOp(supabaseAdmin);
  } catch (error) {
    if (!isServiceRoleUnavailable(error)) {
      throw error;
    }

    const client = createPublishableClient();
    return await fallbackOp(client);
  }
}

export async function insertAlta(payload: AltaInsertPayload): Promise<string> {
  return withSupabaseAdmin(
    async (admin) => {
      const { data, error } = await admin
        .from("altas")
        .insert({
          ...payload,
          status: "pending_payment",
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`No se pudo guardar el alta: ${error?.message ?? "desconocido"}`);
      }

      return data.id;
    },
    async (client) => {
      const { data, error } = await client.rpc("create_alta", {
        p_restaurant_name: payload.restaurant_name,
        p_restaurant_address: payload.restaurant_address,
        p_gmb_place_id: payload.gmb_place_id,
        p_has_existing_website: payload.has_existing_website,
        p_existing_website_url: payload.existing_website_url,
        p_wants_custom_domain: payload.wants_custom_domain,
        p_domain: payload.domain,
        p_domain_is_custom: payload.domain_is_custom,
        p_onetime_fee_concept: payload.onetime_fee_concept,
        p_onetime_fee_amount: payload.onetime_fee_amount,
        p_contact_name: payload.contact_name,
        p_whatsapp: payload.whatsapp,
      });

      if (error || !data) {
        throw new Error(
          `No se pudo guardar el alta en local: ${error?.message ?? "desconocido"}. En Lovable Cloud el backend usa supabaseAdmin automáticamente.`,
        );
      }

      return data;
    },
  );
}

export async function markAltaPaid(altaId: string, stripeSessionId: string): Promise<void> {
  await withSupabaseAdmin(
    async (admin) => {
      const { error } = await admin
        .from("altas")
        .update({ status: "paid", stripe_session_id: stripeSessionId })
        .eq("id", altaId);

      if (error) {
        throw new Error(`No se pudo actualizar el alta: ${error.message}`);
      }
    },
    async (client) => {
      const { error } = await client.rpc("mark_alta_paid", {
        p_alta_id: altaId,
        p_stripe_session_id: stripeSessionId,
      });

      if (error) {
        throw new Error(`No se pudo actualizar el alta: ${error.message}`);
      }
    },
  );
}
