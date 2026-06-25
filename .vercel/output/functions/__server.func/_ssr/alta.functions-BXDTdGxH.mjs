import { i as TSS_SERVER_FUNCTION, l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
import { a as stringType, i as objectType, n as enumType, r as numberType, t as booleanType } from "../_libs/zod.mjs";
import { t as Stripe } from "../_libs/stripe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/alta.functions-BXDTdGxH.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function isNewSupabaseApiKey(value) {
	return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}
function createSupabaseFetch(supabaseKey) {
	return (input, init) => {
		const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : void 0);
		if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
		if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) headers.delete("Authorization");
		headers.set("apikey", supabaseKey);
		return fetch(input, {
			...init,
			headers
		});
	};
}
function createPublishableClient() {
	const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
	const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !publishableKey) throw new Error("Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY.");
	return createClient(url, publishableKey, {
		global: { fetch: createSupabaseFetch(publishableKey) },
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});
}
function isServiceRoleUnavailable(error) {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("SUPABASE_SERVICE_ROLE_KEY") || message.includes("Missing Supabase environment variable");
}
async function withSupabaseAdmin(adminOp, fallbackOp) {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	try {
		return await adminOp(supabaseAdmin);
	} catch (error) {
		if (!isServiceRoleUnavailable(error)) throw error;
		return await fallbackOp(createPublishableClient());
	}
}
async function insertAlta(payload) {
	return withSupabaseAdmin(async (admin) => {
		const { data, error } = await admin.from("altas").insert({
			...payload,
			status: "pending_payment"
		}).select("id").single();
		if (error || !data) throw new Error(`No se pudo guardar el alta: ${error?.message ?? "desconocido"}`);
		return data.id;
	}, async (client) => {
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
			p_whatsapp: payload.whatsapp
		});
		if (error || !data) throw new Error(`No se pudo guardar el alta en local: ${error?.message ?? "desconocido"}. En Lovable Cloud el backend usa supabaseAdmin automáticamente.`);
		return data;
	});
}
async function markAltaPaid(altaId, stripeSessionId) {
	await withSupabaseAdmin(async (admin) => {
		const { error } = await admin.from("altas").update({
			status: "paid",
			stripe_session_id: stripeSessionId
		}).eq("id", altaId);
		if (error) throw new Error(`No se pudo actualizar el alta: ${error.message}`);
	}, async (client) => {
		const { error } = await client.rpc("mark_alta_paid", {
			p_alta_id: altaId,
			p_stripe_session_id: stripeSessionId
		});
		if (error) throw new Error(`No se pudo actualizar el alta: ${error.message}`);
	});
}
function getStripe() {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	if (!secretKey) throw new Error("STRIPE_SECRET_KEY no está configurada.");
	return new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
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
function getRequestOrigin() {
	return process.env.APP_URL ?? process.env.PUBLIC_URL ?? process.env.VITE_APP_URL ?? "http://localhost:8081";
}
var createCheckout_createServerFn_handler = createServerRpc({
	id: "cb1ed746c881f0a1ac4a5398ac39153fc72154bf77147b8c4b9772c624307c5d",
	name: "createCheckout",
	filename: "src/lib/alta.functions.ts"
}, (opts) => createCheckout.__executeServer(opts));
var createCheckout = createServerFn({ method: "POST" }).inputValidator((input) => AltaInput.parse(input)).handler(createCheckout_createServerFn_handler, async ({ data }) => {
	const altaId = await insertAlta({
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
	});
	if (!hasStripeCheckout()) {
		await markAltaPaid(altaId, `mock_${altaId}`);
		return {
			alta_id: altaId,
			checkout_url: null,
			mock: true
		};
	}
	const session = await createAltaCheckoutSession({
		altaId,
		origin: getRequestOrigin(),
		restaurantName: data.restaurant_name,
		onetimeFeeConcept: data.onetime_fee_concept,
		onetimeFeeAmount: data.onetime_fee_amount
	});
	if (!session.url) throw new Error("Stripe no devolvió una URL de checkout.");
	return {
		alta_id: altaId,
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
export { checkDomain_createServerFn_handler, createCheckout_createServerFn_handler, finalizeCheckout_createServerFn_handler, gmbSearch_createServerFn_handler };
