import type { BusinessTerm } from "./business-type";

export type WebsiteType = "own" | "aggregator" | "social" | "builder" | "none";

export type PlaceProfile = {
  place_id: string;
  display_name: string;
  formatted_address?: string;
  zone_label?: string;
  cuisine_label?: string;
  /** Término corto para copy (bar, cafetería, restaurante, local). */
  business_term?: BusinessTerm;
  /** types[] crudos de Google Places (enrichment). */
  google_types?: string[];
  rating?: number;
  review_count?: number;
  website_uri?: string;
  website_type: WebsiteType;
  google_maps_uri?: string;
  enrichment_partial: boolean;
  missing_fields: string[];
};
