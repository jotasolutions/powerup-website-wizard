import { i as TSS_SERVER_FUNCTION, l as createServerFn } from "./esm-Dova13aH.mjs";
import { a as stringType, i as objectType, n as enumType, r as numberType, t as booleanType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/alta.functions-B3mU_3Pl.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
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
var createCheckout_createServerFn_handler = createServerRpc({
	id: "cb1ed746c881f0a1ac4a5398ac39153fc72154bf77147b8c4b9772c624307c5d",
	name: "createCheckout",
	filename: "src/lib/alta.functions.ts"
}, (opts) => createCheckout.__executeServer(opts));
var createCheckout = createServerFn({ method: "POST" }).inputValidator((input) => AltaInput.parse(input)).handler(createCheckout_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: row, error } = await supabaseAdmin.from("altas").insert({
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
		whatsapp: data.whatsapp,
		status: "pending_payment"
	}).select("id").single();
	if (error || !row) throw new Error(`No se pudo guardar el alta: ${error?.message ?? "desconocido"}`);
	await supabaseAdmin.from("altas").update({
		status: "paid",
		stripe_session_id: `mock_${row.id}`
	}).eq("id", row.id);
	return {
		alta_id: row.id,
		checkout_url: null,
		mock: true
	};
});
function capitalize(s) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
//#endregion
export { checkDomain_createServerFn_handler, createCheckout_createServerFn_handler, gmbSearch_createServerFn_handler };
