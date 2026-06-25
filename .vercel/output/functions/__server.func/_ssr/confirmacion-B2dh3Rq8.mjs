import { h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as formatEUR } from "./alta-config-CsywT69t.mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-BginaAqG.mjs";
import { r as Check } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/confirmacion-B2dh3Rq8.js
var import_jsx_runtime = require_jsx_runtime();
function Confirmacion() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "container-narrow flex min-h-screen flex-col items-center justify-center py-10 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-white shadow-brand",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
					className: "h-8 w-8",
					strokeWidth: 3
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 text-2xl font-medium tracking-tight",
				children: "¡Listo! Hemos recibido tu alta"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted-foreground",
				children: "En las próximas horas preparamos tu página web y, si elegiste dominio personalizado, lo registramos por ti. Te escribimos por WhatsApp para terminar la configuración."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 w-full rounded-2xl border bg-card p-4 text-left shadow-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
					children: "Recordatorio"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1.5 text-sm",
					children: [
						"Tu plan ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Pro Anual" }),
						" (incluye tu página web) tiene",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [30, " días de prueba"] }),
						". Después se cobra automáticamente ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [formatEUR(300), "/año"] }),
						" ",
						"con el método de pago que has dejado."
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				className: "mt-8 rounded-full px-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					children: "Volver al inicio"
				})
			})
		]
	});
}
//#endregion
export { Confirmacion as component };
