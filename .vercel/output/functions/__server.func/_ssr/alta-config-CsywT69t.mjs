import { i as __toESM } from "../_runtime.mjs";
import { O as isRedirect, v as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as TSS_SERVER_FUNCTION, l as createServerFn } from "./esm-Dova13aH.mjs";
import { a as stringType, i as objectType, n as enumType, r as numberType, t as booleanType } from "../_libs/zod.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-DXboTy0P.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/alta.functions-BVIgg-vC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var validateWhatsapp = createServerFn({ method: "POST" }).validator((input) => objectType({ phone: stringType().min(3) }).parse(input)).handler(createSsrRpc("7f310514281442c9df2c706cdbbf2bf7acb0586625bde15801958940e27fa116"));
var gmbSearch = createServerFn({ method: "POST" }).validator((input) => objectType({ query: stringType().min(1) }).parse(input)).handler(createSsrRpc("36abb3efca09c2571234e96d44adddb3ffb369a84faab4f425b96117620ef42b"));
var checkDomain = createServerFn({ method: "POST" }).validator((input) => objectType({ domain: stringType().min(3) }).parse(input)).handler(createSsrRpc("7c9df230948fa17b7a56625859a98d770eba9eb5dd9f219319e62401ed8d7bbb"));
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
	whatsapp: stringType().min(3),
	/** Origen del navegador (p. ej. http://localhost:8081) para URLs de vuelta de Stripe. */
	origin: stringType().url().optional()
});
var startCheckout = createServerFn({ method: "POST" }).validator((input) => AltaInput.parse(input)).handler(createSsrRpc("0fa8b354816f19edeb6279c5eaaf8861bf6428ed083fefff2e29b1770bc5ba0b"));
createServerFn({ method: "POST" }).validator((input) => AltaInput.omit({ origin: true }).parse(input)).handler(createSsrRpc("2682a01a241440f0efc0d656fbe1540a3550d700215c154e59a561ba8fda8f16"));
createServerFn({ method: "POST" }).validator((input) => objectType({
	alta_id: stringType().uuid(),
	origin: stringType().url().optional()
}).parse(input)).handler(createSsrRpc("cb1ed746c881f0a1ac4a5398ac39153fc72154bf77147b8c4b9772c624307c5d"));
var finalizeCheckout = createServerFn({ method: "POST" }).validator((input) => objectType({
	alta_id: stringType().uuid(),
	session_id: stringType().min(1)
}).parse(input)).handler(createSsrRpc("788e643c341bbe718cdcf27389b009b78afcc5f0f1d6090db6f89ebb1efe85cf"));
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/alta-config-CsywT69t.js
function formatEUR(amount) {
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2
	}).format(amount);
}
function generarSubdominio(nombre) {
	return `${nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 40) || "tu-restaurante"}.powerup.menu`;
}
//#endregion
export { gmbSearch as a, validateWhatsapp as c, finalizeCheckout as i, generarSubdominio as n, startCheckout as o, checkDomain as r, useServerFn as s, formatEUR as t };
