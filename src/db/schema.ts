import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { PlaceProfile } from "@/lib/place-profile.types";

export const altaStatusEnum = pgEnum("alta_status", ["pending_payment", "paid"]);
export const altaFeeConceptEnum = pgEnum("alta_fee_concept", ["gestion", "dominio"]);
export const powerupCustomerEnum = pgEnum("powerup_customer_status", ["unknown", "yes", "no"]);

export const altas = pgTable("altas", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  restaurantName: text("restaurant_name").notNull(),
  restaurantAddress: text("restaurant_address"),
  gmbPlaceId: text("gmb_place_id"),
  hasExistingWebsite: boolean("has_existing_website").notNull().default(false),
  existingWebsiteUrl: text("existing_website_url"),
  wantsCustomDomain: boolean("wants_custom_domain").notNull().default(false),
  domain: text("domain"),
  domainIsCustom: boolean("domain_is_custom").notNull().default(false),
  powerupCustomer: powerupCustomerEnum("powerup_customer").notNull().default("unknown"),
  onetimeFeeConcept: altaFeeConceptEnum("onetime_fee_concept"),
  onetimeFeeAmount: numeric("onetime_fee_amount", { precision: 10, scale: 2 }),
  contactName: text("contact_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
  termsVersion: text("terms_version").notNull(),
  termsDocumentUrl: text("terms_document_url").notNull(),
  consentUserAgent: text("consent_user_agent"),
  consentIp: text("consent_ip"),
  status: altaStatusEnum("status").notNull().default("pending_payment"),
  /** Momento de pago confirmado. Filas pre-migración: backfill con created_at (aproximado). */
  paidAt: timestamp("paid_at", { withTimezone: true }),
  stripeSessionId: text("stripe_session_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  /** Momento en que se creó la sesión Stripe Checkout (pending). */
  checkoutStartedAt: timestamp("checkout_started_at", { withTimezone: true }),
  /** Email capturado en Stripe Checkout al pagar. */
  customerEmail: text("customer_email"),
  /** Solo valores manuales; null = estado derivado en lectura. */
  opsStatus: text("ops_status"),
  domainRegisteredAt: timestamp("domain_registered_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  opsNotes: text("ops_notes"),
});

export const placeEnrichments = pgTable("place_enrichments", {
  placeId: text("place_id").primaryKey(),
  payload: jsonb("payload").$type<PlaceProfile>().notNull(),
  schemaVersion: integer("schema_version").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
