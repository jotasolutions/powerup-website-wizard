import { r as __toESM } from "../_runtime.mjs";
import { D as isRedirect, _ as useRouter, g as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as TSS_SERVER_FUNCTION, l as createServerFn } from "./esm-Dova13aH.mjs";
import { a as stringType, i as objectType, n as enumType, r as numberType, t as booleanType } from "../_libs/zod.mjs";
import { n as generarSubdominio, t as formatEUR } from "./alta-config-CsywT69t.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as cn, t as Button } from "./button-BginaAqG.mjs";
import { a as LoaderCircle, i as ArrowLeft, n as Search, r as Check, t as X } from "../_libs/lucide-react.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-C10nHyX_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Aluh2JK6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
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
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
function ChatBubble({ role, children }) {
	if (role === "user") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "max-w-[85%] rounded-2xl rounded-br-md bg-brand-gradient px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-brand",
			children
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-primary-foreground shadow-brand",
			"aria-hidden": "true",
			children: "P"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "max-w-[85%] rounded-2xl rounded-tl-md bg-bubble-bot px-4 py-3 text-sm text-bubble-bot-foreground shadow-card",
			children
		})]
	});
}
function TypingBubble() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-primary-foreground shadow-brand",
			"aria-hidden": "true",
			children: "P"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rounded-2xl rounded-tl-md bg-bubble-bot px-4 py-3 shadow-card",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2 w-2 animate-bounce rounded-full bg-muted-foreground" })
				]
			})
		})]
	});
}
var initialAlta = {
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
	whatsapp: "+34 "
};
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
var gmbSearch = createServerFn({ method: "POST" }).inputValidator((input) => objectType({ query: stringType().min(1) }).parse(input)).handler(createSsrRpc("36abb3efca09c2571234e96d44adddb3ffb369a84faab4f425b96117620ef42b"));
var checkDomain = createServerFn({ method: "POST" }).inputValidator((input) => objectType({ domain: stringType().min(3) }).parse(input)).handler(createSsrRpc("7c9df230948fa17b7a56625859a98d770eba9eb5dd9f219319e62401ed8d7bbb"));
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
var createCheckout = createServerFn({ method: "POST" }).inputValidator((input) => AltaInput.parse(input)).handler(createSsrRpc("cb1ed746c881f0a1ac4a5398ac39153fc72154bf77147b8c4b9772c624307c5d"));
var TOTAL_STEPS = 6;
function uid() {
	return Math.random().toString(36).slice(2, 11);
}
function AsistenteAlta() {
	const navigate = useNavigate();
	const [alta, setAlta] = (0, import_react.useState)(initialAlta);
	const [step, setStep] = (0, import_react.useState)("restaurante");
	const [history, setHistory] = (0, import_react.useState)([]);
	const [messages, setMessages] = (0, import_react.useState)([{
		id: uid(),
		role: "bot",
		kind: "text",
		text: "Hola, soy el asistente de PowerUp Menu. Vamos a montar la página web de tu restaurante en unos pasos. ¿Empezamos?"
	}]);
	const [botTyping, setBotTyping] = (0, import_react.useState)(false);
	const scrollRef = (0, import_react.useRef)(null);
	const gmbSearchFn = useServerFn(gmbSearch);
	const checkDomainFn = useServerFn(checkDomain);
	const createCheckoutFn = useServerFn(createCheckout);
	(0, import_react.useEffect)(() => {
		const text = botPromptForStep(step, alta);
		if (!text) return;
		setBotTyping(true);
		const t = setTimeout(() => {
			setMessages((m) => [...m, {
				id: uid(),
				role: "bot",
				kind: "text",
				text
			}]);
			setBotTyping(false);
		}, 450);
		return () => clearTimeout(t);
	}, [step]);
	(0, import_react.useEffect)(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [
		messages,
		botTyping,
		step
	]);
	function pushUser(text) {
		setMessages((m) => [...m, {
			id: uid(),
			role: "user",
			kind: "text",
			text
		}]);
	}
	function go(next) {
		setHistory((h) => [...h, step]);
		setStep(next);
	}
	function back() {
		setHistory((h) => {
			if (h.length === 0) return h;
			const prev = h[h.length - 1];
			setStep(prev);
			return h.slice(0, -1);
		});
	}
	const stepIndex = stepIndexFor(step);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "container-narrow flex items-center justify-between py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [history.length > 0 && step !== "enviando" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: back,
							className: "inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground",
							"aria-label": "Volver",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" })
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-9 w-9" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "leading-tight",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display text-sm font-medium",
								children: "Página Web"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground",
								children: "Alta guiada"
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-muted-foreground",
						children: [
							"Paso ",
							Math.min(stepIndex, TOTAL_STEPS),
							" de ",
							TOTAL_STEPS
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1 w-full bg-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-brand-gradient transition-all duration-500 ease-out",
						style: { width: `${Math.min(stepIndex, TOTAL_STEPS) / TOTAL_STEPS * 100}%` }
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				ref: scrollRef,
				className: "container-narrow flex-1 space-y-4 overflow-y-auto py-6 pb-8",
				style: { minHeight: 0 },
				children: [messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBubble, {
					role: m.role,
					children: m.text
				}, m.id)), botTyping && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TypingBubble, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "sticky bottom-0 border-t border-border/60 bg-background/95 backdrop-blur",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "container-narrow py-4",
					children: [
						step === "restaurante" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepRestaurante, {
							onPick: (r) => {
								setAlta((a) => ({
									...a,
									restaurant_name: r.name,
									restaurant_address: r.address,
									gmb_place_id: r.place_id,
									domain: a.domain || generarSubdominio(r.name)
								}));
								pushUser(r.name);
								go("tieneWeb");
							},
							onManual: (name, address) => {
								setAlta((a) => ({
									...a,
									restaurant_name: name,
									restaurant_address: address,
									gmb_place_id: null,
									domain: a.domain || generarSubdominio(name)
								}));
								pushUser(name);
								go("tieneWeb");
							},
							search: gmbSearchFn
						}),
						step === "tieneWeb" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChoiceRow, { options: [{
							label: "Sí, ya tengo web",
							onClick: () => {
								pushUser("Sí, ya tengo web");
								setAlta((a) => ({
									...a,
									has_existing_website: true
								}));
								go("tieneWebUrl");
							}
						}, {
							label: "No, todavía no",
							onClick: () => {
								pushUser("No, todavía no");
								setAlta((a) => ({
									...a,
									has_existing_website: false
								}));
								go("dominioCustom");
							}
						}] }),
						step === "tieneWebUrl" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepUrl, { onSubmit: (url) => {
							pushUser(url);
							setAlta((a) => ({
								...a,
								existing_website_url: url
							}));
							go("resumen");
						} }),
						step === "dominioCustom" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mb-3 text-xs text-muted-foreground",
							children: [
								"Por defecto te creamos una dirección gratis tipo",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: generarSubdominio(alta.restaurant_name)
								}),
								". Un dominio personalizado sería algo como",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: "turestaurante.es"
								}),
								"."
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChoiceRow, { options: [{
							label: "Sí, dominio personalizado",
							onClick: () => {
								pushUser("Sí, quiero un dominio personalizado");
								setAlta((a) => ({
									...a,
									wants_custom_domain: true
								}));
								go("elegirDominio");
							}
						}, {
							label: "No, usa el gratis",
							onClick: () => {
								pushUser("No, usa el gratis");
								const sub = generarSubdominio(alta.restaurant_name);
								setAlta((a) => ({
									...a,
									wants_custom_domain: false,
									domain: sub,
									domain_is_custom: false,
									domain_price: null
								}));
								go("resumen");
							}
						}] })] }),
						step === "elegirDominio" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepElegirDominio, {
							onAvailable: (domain, price) => {
								pushUser(domain);
								setAlta((a) => ({
									...a,
									domain,
									domain_is_custom: true,
									domain_price: price
								}));
								go("resumen");
							},
							onSkip: () => {
								pushUser("Continuar sin dominio personalizado");
								const sub = generarSubdominio(alta.restaurant_name);
								setAlta((a) => ({
									...a,
									wants_custom_domain: false,
									domain: sub,
									domain_is_custom: false,
									domain_price: null
								}));
								go("resumen");
							},
							checkDomainFn
						}),
						step === "resumen" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResumenCard, {
							alta,
							onContinue: () => go("contacto")
						}),
						step === "contacto" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepContacto, {
							alta,
							onSubmit: async (contact_name, whatsapp) => {
								pushUser(`${contact_name} · ${whatsapp}`);
								setAlta((a) => ({
									...a,
									contact_name,
									whatsapp
								}));
								setStep("enviando");
								try {
									const concept = alta.has_existing_website ? "gestion" : alta.domain_is_custom ? "dominio" : null;
									const amount = alta.has_existing_website ? 49 : alta.domain_is_custom ? alta.domain_price ?? 0 : null;
									const result = await createCheckoutFn({ data: {
										restaurant_name: alta.restaurant_name,
										restaurant_address: alta.restaurant_address || null,
										gmb_place_id: alta.gmb_place_id,
										has_existing_website: !!alta.has_existing_website,
										existing_website_url: alta.has_existing_website ? alta.existing_website_url : null,
										wants_custom_domain: !!alta.wants_custom_domain,
										domain: alta.domain,
										domain_is_custom: alta.domain_is_custom,
										onetime_fee_concept: concept,
										onetime_fee_amount: amount,
										contact_name,
										whatsapp
									} });
									if (result.checkout_url) window.location.href = result.checkout_url;
									else navigate({
										to: "/confirmacion",
										search: { alta_id: result.alta_id }
									});
								} catch (e) {
									console.error(e);
									setBotTyping(false);
									setMessages((m) => [...m, {
										id: uid(),
										role: "bot",
										kind: "text",
										text: "Ha habido un problema al continuar al pago. Vuelve a intentarlo en un momento."
									}]);
									setStep("contacto");
								}
							}
						}),
						step === "enviando" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), "Preparando tu pago seguro…"]
						})
					]
				})
			})
		]
	});
}
function stepIndexFor(s) {
	switch (s) {
		case "restaurante": return 1;
		case "tieneWeb":
		case "tieneWebUrl": return 2;
		case "dominioCustom":
		case "elegirDominio": return 3;
		case "resumen": return 4;
		case "contacto": return 5;
		case "enviando": return 6;
	}
}
function botPromptForStep(s, a) {
	switch (s) {
		case "restaurante": return "Para empezar, dime cómo se llama tu restaurante. Busca en Google y selecciónalo de la lista.";
		case "tieneWeb": return "¿Ya tienes una página web propia para tu restaurante?";
		case "tieneWebUrl": return "Genial. ¿Cuál es la dirección de tu web actual?";
		case "dominioCustom": return "¿Quieres un dominio personalizado para tu nueva web?";
		case "elegirDominio": return "Perfecto. ¿Qué dominio te gustaría usar? Escríbelo sin “www” (por ejemplo: turestaurante.es).";
		case "resumen": return `Esto es lo que vamos a hacer para ${a.restaurant_name}. Revísalo antes de seguir.`;
		case "contacto": return "Último paso antes del pago: déjame tu nombre y tu WhatsApp para contactarte.";
		case "enviando": return null;
	}
}
function StepRestaurante({ onPick, onManual, search }) {
	const [q, setQ] = (0, import_react.useState)("");
	const [results, setResults] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [manual, setManual] = (0, import_react.useState)(false);
	const [mName, setMName] = (0, import_react.useState)("");
	const [mAddress, setMAddress] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (manual) return;
		if (q.trim().length < 2) {
			setResults([]);
			return;
		}
		setLoading(true);
		const t = setTimeout(async () => {
			try {
				setResults((await search({ data: { query: q.trim() } })).results);
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		}, 300);
		return () => clearTimeout(t);
	}, [
		q,
		manual,
		search
	]);
	if (manual) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				placeholder: "Nombre del restaurante",
				value: mName,
				onChange: (e) => setMName(e.target.value)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				placeholder: "Dirección",
				value: mAddress,
				onChange: (e) => setMAddress(e.target.value)
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setManual(false),
				className: "text-xs text-muted-foreground underline-offset-4 hover:underline",
				children: "Volver a buscar"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => mName.trim() && onManual(mName.trim(), mAddress.trim()),
				disabled: !mName.trim(),
				children: "Continuar"
			})]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					autoFocus: true,
					placeholder: "Busca tu restaurante",
					value: q,
					onChange: (e) => setQ(e.target.value),
					className: "pl-9"
				})]
			}),
			loading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }), "Buscando…"]
			}),
			!loading && results.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "max-h-56 overflow-y-auto rounded-xl border bg-card shadow-card",
				children: results.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onPick(r),
					className: "flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2.5 text-left transition last:border-0 hover:bg-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-medium",
						children: r.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs text-muted-foreground",
						children: r.address
					})]
				}) }, r.place_id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setManual(true),
				className: "text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground",
				children: "No aparece mi restaurante"
			})
		]
	});
}
function ChoiceRow({ options }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-2",
		children: options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: o.onClick,
			className: "rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-card transition hover:border-primary/30 hover:bg-accent active:scale-[0.98]",
			children: o.label
		}, o.label))
	});
}
function StepUrl({ onSubmit }) {
	const [url, setUrl] = (0, import_react.useState)("");
	const valid = /^https?:\/\/.+\..+/.test(url.trim()) || /^[\w-]+\.[\w.-]+/.test(url.trim());
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => {
			e.preventDefault();
			if (!valid) return;
			let v = url.trim();
			if (!/^https?:\/\//.test(v)) v = `https://${v}`;
			onSubmit(v);
		},
		className: "flex gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			autoFocus: true,
			placeholder: "https://turestaurante.com",
			value: url,
			onChange: (e) => setUrl(e.target.value)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "submit",
			disabled: !valid,
			children: "Enviar"
		})]
	});
}
function StepElegirDominio({ onAvailable, onSkip, checkDomainFn }) {
	const [domain, setDomain] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const norm = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
	const valid = /^[a-z0-9-]+(\.[a-z]{2,})+$/.test(norm);
	async function submit(e) {
		e.preventDefault();
		if (!valid) return;
		setLoading(true);
		setError(null);
		try {
			const r = await checkDomainFn({ data: { domain: norm } });
			if (r.available) onAvailable(norm, r.price);
			else setError(`“${norm}” no está disponible. Prueba con otro.`);
		} catch (err) {
			console.error(err);
			setError("No se pudo comprobar la disponibilidad. Inténtalo de nuevo.");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					autoFocus: true,
					placeholder: "turestaurante.es",
					value: domain,
					onChange: (e) => setDomain(e.target.value)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: !valid || loading,
					children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Comprobar"
				})]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" }),
					" ",
					error
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onSkip,
				className: "text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground",
				children: "Continuar sin dominio personalizado"
			})
		]
	});
}
function ResumenCard({ alta, onContinue }) {
	const hoy = alta.has_existing_website ? {
		label: "Fee de gestión",
		amount: 49
	} : alta.domain_is_custom ? {
		label: `Dominio ${alta.domain}`,
		amount: alta.domain_price ?? 0
	} : {
		label: "Hoy no pagas nada",
		amount: 0
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border bg-card p-4 shadow-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2.5 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Restaurante",
							value: alta.restaurant_name
						}),
						alta.restaurant_address && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Dirección",
							value: alta.restaurant_address,
							muted: true
						}),
						alta.has_existing_website ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Web actual",
							value: alta.existing_website_url,
							link: true
						}) : alta.domain_is_custom ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Dominio",
							value: `${alta.domain} · ${formatEUR(alta.domain_price ?? 0)}`
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Dirección web",
							value: alta.domain
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border bg-card p-4 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
						children: "Desglose"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex items-baseline justify-between text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Hoy · ", hoy.label] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold",
							children: formatEUR(hoy.amount)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex items-baseline justify-between text-sm text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"Tras ",
							30,
							" días de prueba · Plan Pro Anual"
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [formatEUR(300), "/año"] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted-foreground",
						children: "El plan Pro Anual incluye tu página web. Capturamos el método de pago hoy y se cobra automáticamente al terminar el mes de prueba."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "w-full",
				size: "lg",
				onClick: onContinue,
				children: "Continuar"
			})
		]
	});
}
function Row({ label, value, muted, link }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-baseline justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `text-right ${muted ? "text-muted-foreground" : "font-medium"} ${link ? "underline underline-offset-2" : ""}`,
			children: value
		})]
	});
}
function StepContacto({ alta, onSubmit }) {
	const [name, setName] = (0, import_react.useState)(alta.contact_name);
	const [wa, setWa] = (0, import_react.useState)(alta.whatsapp);
	const validName = name.trim().length >= 2;
	const validWa = /[+\d][\d\s-]{7,}/.test(wa.trim());
	const valid = validName && validWa;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => {
			e.preventDefault();
			if (!valid) return;
			onSubmit(name.trim(), wa.trim());
		},
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					autoFocus: true,
					placeholder: "Tu nombre",
					value: name,
					onChange: (e) => setName(e.target.value)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "+34 600 000 000",
					inputMode: "tel",
					value: wa,
					onChange: (e) => setWa(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				type: "submit",
				disabled: !valid,
				className: "w-full",
				size: "lg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "mr-1.5 h-4 w-4" }), " Continuar al pago"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-[11px] text-muted-foreground",
				children: "Te contactaremos por WhatsApp para terminar la configuración."
			})
		]
	});
}
function Index() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AsistenteAlta, {});
}
//#endregion
export { Index as component };
