import type { AltaState } from "@/components/asistente/types";
import {
  FEE_GESTION_WEB_PROPIA_EUR,
  TERMS_AND_PRIVACY_URL,
  TERMS_VERSION,
  generarSubdominio,
} from "./alta-config";
import { resolvePowerUpCustomerForFlow } from "./powerup-customer";

export type AltaContactSubmit = {
  contact_name: string;
  whatsapp: string;
  consent_user_agent?: string;
};

export function buildAltaPayload(alta: AltaState, contact: AltaContactSubmit) {
  const concept = alta.has_existing_website
    ? ("gestion" as const)
    : alta.domain_is_custom
      ? ("dominio" as const)
      : null;
  const amount = alta.has_existing_website
    ? FEE_GESTION_WEB_PROPIA_EUR
    : alta.domain_is_custom
      ? (alta.domain_price ?? 0)
      : null;

  return {
    restaurant_name: alta.restaurant_name,
    restaurant_address: alta.restaurant_address || null,
    gmb_place_id: alta.gmb_place_id,
    has_existing_website: !!alta.has_existing_website,
    existing_website_url: alta.has_existing_website ? alta.existing_website_url : null,
    wants_custom_domain: !!alta.wants_custom_domain,
    domain: alta.domain || generarSubdominio(alta.restaurant_name),
    domain_is_custom: alta.domain_is_custom,
    powerup_customer: resolvePowerUpCustomerForFlow(alta.powerup_customer, alta.place_profile),
    onetime_fee_concept: concept,
    onetime_fee_amount: amount,
    contact_name: contact.contact_name,
    whatsapp: contact.whatsapp,
    terms_version: TERMS_VERSION,
    terms_document_url: TERMS_AND_PRIVACY_URL,
    consent_user_agent: contact.consent_user_agent ?? null,
  };
}
