import type { PlaceProfile } from "@/lib/place-profile.types";
import type { PowerUpCustomerStatus } from "@/lib/powerup-customer";

export type GmbResult = {
  name: string;
  address: string;
  place_id: string;
};

export type EnrichmentStatus = "idle" | "loading" | "ready" | "degraded";

export type AltaState = {
  // Paso 1
  restaurant_name: string;
  restaurant_address: string;
  gmb_place_id: string | null;

  // Enrichment (etapa 4+)
  place_profile: PlaceProfile | null;
  enrichment_status: EnrichmentStatus;

  // Cliente carta PowerUp (upgrade híbrido)
  powerup_customer: PowerUpCustomerStatus;

  // Paso 2 — intencionalmente desacoplado de place_profile (fee de gestión / etapa 7).
  // No cablear desde enrichment; punto de reconexión si ENABLE_MANAGEMENT_FEE se activa.
  has_existing_website: boolean | null;
  existing_website_url: string;

  // Paso 3 / 4 (legacy — dominio etapa 6/7)
  wants_custom_domain: boolean | null;
  domain: string;
  domain_is_custom: boolean;
  domain_price: number | null; // precio final al cliente cuando es personalizado

  // Paso 5
  contact_name: string;
  whatsapp: string;
};

export const initialAlta: AltaState = {
  restaurant_name: "",
  restaurant_address: "",
  gmb_place_id: null,
  place_profile: null,
  enrichment_status: "idle",
  powerup_customer: "unknown",
  has_existing_website: null,
  existing_website_url: "",
  wants_custom_domain: null,
  domain: "",
  domain_is_custom: false,
  domain_price: null,
  contact_name: "",
  whatsapp: "+34 ",
};

export type ChatMessage =
  | { id: string; role: "bot"; kind: "text"; text: string }
  | { id: string; role: "user"; kind: "text"; text: string }
  | { id: string; role: "bot"; kind: "resumen-pedido"; alta: AltaState };
