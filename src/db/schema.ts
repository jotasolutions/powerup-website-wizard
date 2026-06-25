import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const altaStatusEnum = pgEnum("alta_status", ["pending_payment", "paid"]);
export const altaFeeConceptEnum = pgEnum("alta_fee_concept", ["gestion", "dominio"]);

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
  onetimeFeeConcept: altaFeeConceptEnum("onetime_fee_concept"),
  onetimeFeeAmount: numeric("onetime_fee_amount", { precision: 10, scale: 2 }),
  contactName: text("contact_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  status: altaStatusEnum("status").notNull().default("pending_payment"),
  stripeSessionId: text("stripe_session_id"),
});
