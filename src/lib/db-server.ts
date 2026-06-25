import { eq } from "drizzle-orm";
import { getDb } from "@/db/index.server";
import { altas } from "@/db/schema";

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
      onetimeFeeConcept: payload.onetime_fee_concept,
      onetimeFeeAmount:
        payload.onetime_fee_amount != null ? String(payload.onetime_fee_amount) : null,
      contactName: payload.contact_name,
      whatsapp: payload.whatsapp,
      status: "pending_payment",
    })
    .returning({ id: altas.id });

  if (!row) {
    throw new Error("No se pudo guardar el alta.");
  }

  return row.id;
}

export async function markAltaPaid(altaId: string, stripeSessionId: string): Promise<void> {
  const updated = await getDb()
    .update(altas)
    .set({ status: "paid", stripeSessionId })
    .where(eq(altas.id, altaId))
    .returning({ id: altas.id });

  if (updated.length === 0) {
    throw new Error("No se pudo actualizar el alta.");
  }
}

export async function getAltaById(altaId: string) {
  const [row] = await getDb().select().from(altas).where(eq(altas.id, altaId)).limit(1);
  return row ?? null;
}
