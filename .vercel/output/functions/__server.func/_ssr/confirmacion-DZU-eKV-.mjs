import { f as lazyRouteComponent, p as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as stringType, i as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/confirmacion-DZU-eKV-.js
var $$splitComponentImporter = () => import("./confirmacion-D7CKfa78.mjs");
var searchSchema = objectType({
	alta_id: stringType().optional(),
	session_id: stringType().optional()
});
var Route = createFileRoute("/confirmacion")({
	validateSearch: (search) => searchSchema.parse(search),
	head: () => ({ meta: [
		{ title: "¡Alta recibida! · PowerUp Menu" },
		{
			name: "description",
			content: "Hemos recibido tu alta. Te contactaremos por WhatsApp."
		},
		{
			name: "robots",
			content: "noindex"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
