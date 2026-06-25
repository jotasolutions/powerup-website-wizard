export type GmbResult = {
  name: string;
  address: string;
  place_id: string;
};

export type AltaState = {
  // Paso 1
  restaurant_name: string;
  restaurant_address: string;
  gmb_place_id: string | null;

  // Paso 2
  has_existing_website: boolean | null;
  existing_website_url: string;

  // Paso 3 / 4
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
  | { id: string; role: "user"; kind: "text"; text: string };
