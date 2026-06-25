import { i as TSS_SERVER_FUNCTION, l as createServerFn } from "./esm-Dova13aH.mjs";
import { a as stringType, i as objectType, n as enumType, r as numberType, t as booleanType } from "../_libs/zod.mjs";
import { t as Stripe } from "../_libs/stripe.mjs";
import { a as timestamp, c as boolean, i as uuid, l as pgEnum, n as eq, o as text, r as pgTable, s as numeric, t as drizzle } from "../_libs/drizzle-orm.mjs";
import { t as cs } from "../_libs/neondatabase__serverless.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/alta.functions-B7Qz8yZ9.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function getStripe() {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	if (!secretKey) throw new Error("STRIPE_SECRET_KEY no está configurada.");
	return new Stripe(secretKey);
}
function getProAnnualPriceId() {
	const priceId = process.env.STRIPE_PRICE_PRO_ANUAL ?? process.env.STRIPE_PRICE_PRO_YEARLY;
	if (!priceId) throw new Error("STRIPE_PRICE_PRO_ANUAL o STRIPE_PRICE_PRO_YEARLY no está configurado.");
	return priceId;
}
function hasStripeCheckout() {
	return Boolean(process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_PRICE_PRO_ANUAL ?? process.env.STRIPE_PRICE_PRO_YEARLY));
}
async function createAltaCheckoutSession(params) {
	const stripe = getStripe();
	const lineItems = [{
		price: getProAnnualPriceId(),
		quantity: 1
	}];
	if (params.onetimeFeeConcept && params.onetimeFeeAmount && params.onetimeFeeAmount > 0) lineItems.push({
		price_data: {
			currency: "eur",
			product_data: { name: params.onetimeFeeConcept === "gestion" ? "Fee de gestión web" : "Dominio personalizado" },
			unit_amount: Math.round(params.onetimeFeeAmount * 100)
		},
		quantity: 1
	});
	return stripe.checkout.sessions.create({
		mode: "subscription",
		line_items: lineItems,
		subscription_data: {
			trial_period_days: 30,
			metadata: {
				alta_id: params.altaId,
				restaurant_name: params.restaurantName
			}
		},
		metadata: {
			alta_id: params.altaId,
			restaurant_name: params.restaurantName
		},
		client_reference_id: params.altaId,
		success_url: `${params.origin}/confirmacion?alta_id=${params.altaId}&session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${params.origin}/?cancelado=1`,
		billing_address_collection: "required",
		tax_id_collection: { enabled: true }
	});
}
async function verifyCheckoutSession(altaId, sessionId) {
	const session = await getStripe().checkout.sessions.retrieve(sessionId);
	if (session.metadata?.alta_id !== altaId && session.client_reference_id !== altaId) return false;
	return session.status === "complete" || session.payment_status === "paid";
}
function getAppOrigin() {
	const explicit = process.env.APP_URL ?? process.env.PUBLIC_URL ?? process.env.VITE_APP_URL ?? process.env.LOVABLE_PREVIEW_URL;
	if (explicit) return explicit.replace(/\/$/, "");
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	return "http://localhost:8080";
}
var schema_exports = /* @__PURE__ */ __exportAll({
	altaFeeConceptEnum: () => altaFeeConceptEnum,
	altaStatusEnum: () => altaStatusEnum,
	altas: () => altas
});
var altaStatusEnum = pgEnum("alta_status", ["pending_payment", "paid"]);
var altaFeeConceptEnum = pgEnum("alta_fee_concept", ["gestion", "dominio"]);
var altas = pgTable("altas", {
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
	onetimeFeeAmount: numeric("onetime_fee_amount", {
		precision: 10,
		scale: 2
	}),
	contactName: text("contact_name").notNull(),
	whatsapp: text("whatsapp").notNull(),
	status: altaStatusEnum("status").notNull().default("pending_payment"),
	stripeSessionId: text("stripe_session_id")
});
function getDatabaseUrl() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("Falta DATABASE_URL.");
	return url;
}
var _db;
function getDb() {
	if (!_db) _db = drizzle({
		client: cs(getDatabaseUrl()),
		schema: schema_exports
	});
	return _db;
}
async function insertAlta(payload) {
	const [row] = await getDb().insert(altas).values({
		restaurantName: payload.restaurant_name,
		restaurantAddress: payload.restaurant_address,
		gmbPlaceId: payload.gmb_place_id,
		hasExistingWebsite: payload.has_existing_website,
		existingWebsiteUrl: payload.existing_website_url,
		wantsCustomDomain: payload.wants_custom_domain,
		domain: payload.domain,
		domainIsCustom: payload.domain_is_custom,
		onetimeFeeConcept: payload.onetime_fee_concept,
		onetimeFeeAmount: payload.onetime_fee_amount != null ? String(payload.onetime_fee_amount) : null,
		contactName: payload.contact_name,
		whatsapp: payload.whatsapp,
		status: "pending_payment"
	}).returning({ id: altas.id });
	if (!row) throw new Error("No se pudo guardar el alta.");
	return row.id;
}
async function markAltaPaid(altaId, stripeSessionId) {
	if ((await getDb().update(altas).set({
		status: "paid",
		stripeSessionId
	}).where(eq(altas.id, altaId)).returning({ id: altas.id })).length === 0) throw new Error("No se pudo actualizar el alta.");
}
async function getAltaById(altaId) {
	const [row] = await getDb().select().from(altas).where(eq(altas.id, altaId)).limit(1);
	return row ?? null;
}
var gmbSearch_createServerFn_handler = createServerRpc({
	id: "36abb3efca09c2571234e96d44adddb3ffb369a84faab4f425b96117620ef42b",
	name: "gmbSearch",
	filename: "src/lib/alta.functions.ts"
}, (opts) => gmbSearch.__executeServer(opts));
var gmbSearch = createServerFn({ method: "POST" }).inputValidator((input) => objectType({ query: stringType().min(1) }).parse(input)).handler(gmbSearch_createServerFn_handler, async ({ data }) => {
	{
		const q = data.query.toLowerCase();
		const all = [
			{
				name: `Bar ${capitalize(data.query)}`,
				address: "Calle Mayor 12, 28013 Madrid, España",
				place_id: "mock_place_001"
			},
			{
				name: `Restaurante ${capitalize(data.query)} & Co.`,
				address: "Av. Diagonal 245, 08018 Barcelona, España",
				place_id: "mock_place_002"
			},
			{
				name: `Taberna La ${capitalize(data.query)}`,
				address: "Plaza del Carmen 3, 41004 Sevilla, España",
				place_id: "mock_place_003"
			},
			{
				name: `${capitalize(data.query)} Gastrobar`,
				address: "Calle Botxí 8, 46003 Valencia, España",
				place_id: "mock_place_004"
			}
		];
		await new Promise((r) => setTimeout(r, 350));
		return { results: all.filter((_, i) => i < (q.length < 3 ? 3 : 4)) };
	}
	throw new Error("MOCK_MODE desactivado pero la integración real no está configurada.");
});
var checkDomain_createServerFn_handler = createServerRpc({
	id: "7c9df230948fa17b7a56625859a98d770eba9eb5dd9f219319e62401ed8d7bbb",
	name: "checkDomain",
	filename: "src/lib/alta.functions.ts"
}, (opts) => checkDomain.__executeServer(opts));
var checkDomain = createServerFn({ method: "POST" }).inputValidator((input) => objectType({ domain: stringType().min(3) }).parse(input)).handler(checkDomain_createServerFn_handler, async ({ data }) => {
	await new Promise((r) => setTimeout(r, 500));
	if (data.domain.toLowerCase().trim().includes("test")) return {
		available: false,
		price: 0
	};
	return {
		available: true,
		price: Math.round((12 + Math.random() * 28) * 100) / 100
	};
});
var AltaInput = objectType({
	restaurant_name: stringType().min(1),
	restaurant_address: stringType().nullable(),
	gmb_place_id: stringType().nullable(),
	has_existing_website: booleanType(),
	existing_website_url: stringType().nullable(),
	wants_custom_domain: booleanType(),
	domain: stringType().min(1),
	domain_is_custom: booleanType(),
	onetime_fee_concept: enumType(["gestion", "dominio"]).nullable(),
	onetime_fee_amount: numberType().nullable(),
	contact_name: stringType().min(1),
	whatsapp: stringType().min(3)
});
var saveAlta_createServerFn_handler = createServerRpc({
	id: "2682a01a241440f0efc0d656fbe1540a3550d700215c154e59a561ba8fda8f16",
	name: "saveAlta",
	filename: "src/lib/alta.functions.ts"
}, (opts) => saveAlta.__executeServer(opts));
var saveAlta = createServerFn({ method: "POST" }).inputValidator((input) => AltaInput.parse(input)).handler(saveAlta_createServerFn_handler, async ({ data }) => {
	return {
		alta_id: await insertAlta({
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
			whatsapp: data.whatsapp
		}),
		saved: true
	};
});
var createCheckout_createServerFn_handler = createServerRpc({
	id: "cb1ed746c881f0a1ac4a5398ac39153fc72154bf77147b8c4b9772c624307c5d",
	name: "createCheckout",
	filename: "src/lib/alta.functions.ts"
}, (opts) => createCheckout.__executeServer(opts));
var createCheckout = createServerFn({ method: "POST" }).inputValidator((input) => objectType({ alta_id: stringType().uuid() }).parse(input)).handler(createCheckout_createServerFn_handler, async ({ data }) => {
	const alta = await getAltaById(data.alta_id);
	if (!alta) throw new Error("No encontramos tu solicitud. Vuelve a intentarlo.");
	if (alta.status !== "pending_payment") throw new Error("Esta solicitud ya fue procesada.");
	if (!hasStripeCheckout()) {
		await markAltaPaid(data.alta_id, `mock_${data.alta_id}`);
		return {
			alta_id: data.alta_id,
			checkout_url: null,
			mock: true
		};
	}
	const onetimeFeeAmount = alta.onetimeFeeAmount != null ? Number(alta.onetimeFeeAmount) : null;
	const session = await createAltaCheckoutSession({
		altaId: data.alta_id,
		origin: getAppOrigin(),
		restaurantName: alta.restaurantName,
		onetimeFeeConcept: alta.onetimeFeeConcept,
		onetimeFeeAmount
	});
	if (!session.url) throw new Error("Stripe no devolvió una URL de checkout.");
	return {
		alta_id: data.alta_id,
		checkout_url: session.url,
		mock: false
	};
});
var finalizeCheckout_createServerFn_handler = createServerRpc({
	id: "788e643c341bbe718cdcf27389b009b78afcc5f0f1d6090db6f89ebb1efe85cf",
	name: "finalizeCheckout",
	filename: "src/lib/alta.functions.ts"
}, (opts) => finalizeCheckout.__executeServer(opts));
var finalizeCheckout = createServerFn({ method: "POST" }).inputValidator((input) => objectType({
	alta_id: stringType().uuid(),
	session_id: stringType().min(1)
}).parse(input)).handler(finalizeCheckout_createServerFn_handler, async ({ data }) => {
	if (!hasStripeCheckout()) return {
		ok: true,
		mock: true
	};
	if (!await verifyCheckoutSession(data.alta_id, data.session_id)) throw new Error("El pago no se ha completado todavía.");
	await markAltaPaid(data.alta_id, data.session_id);
	return {
		ok: true,
		mock: false
	};
});
function capitalize(s) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
//#endregion
export { checkDomain_createServerFn_handler, createCheckout_createServerFn_handler, finalizeCheckout_createServerFn_handler, gmbSearch_createServerFn_handler, saveAlta_createServerFn_handler };
