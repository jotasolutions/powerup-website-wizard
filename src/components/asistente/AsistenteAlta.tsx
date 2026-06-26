import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowLeft, Check, X, MessageCircle } from "lucide-react";
import { ChatBubble, TypingBubble } from "./ChatBubble";
import { ResumenPedido } from "./ResumenPedido";
import { CheckoutLayout } from "./CheckoutLayout";
import { TrustStrip } from "./TrustStrip";
import { ResumenCtaButton } from "./ResumenCtaButton";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { formatBotText } from "./formatBotText";
import { type AltaState, type ChatMessage, type GmbResult, initialAlta } from "./types";
import {
  formatEUR,
  generarSubdominio,
  FEE_GESTION_WEB_PROPIA_EUR,
} from "@/lib/alta-config";
import {
  clearAltaDraft,
  getCheckoutScenario,
  getContactoCta,
  getResumenCta,
  loadAltaDraft,
  saveAltaDraft,
} from "@/lib/checkout-scenario";
import { gmbSearch, checkDomain, saveAlta, createCheckout, validateWhatsapp } from "@/lib/alta.functions";
import { redirectToCheckout } from "@/lib/checkout-redirect";
import { inputStepConfig } from "@/lib/input-step-config";
import { scrollInputIntoView, useVisualViewport } from "@/hooks/useKeyboardInset";
import { KeyboardAwareField } from "./KeyboardAwareField";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StepId =
  | "restaurante"
  | "tieneWeb"
  | "tieneWebUrl"
  | "dominioCustom"
  | "elegirDominio"
  | "resumen"
  | "contacto"
  | "enviando";

type CheckoutPhase = "lead" | "checkout";

const TOTAL_STEPS = 6; // restaurante, web, dominio, resumen, contacto, pago

const INPUT_FOOTER_STEPS = new Set<StepId>(["restaurante", "tieneWebUrl", "elegirDominio"]);

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function checkoutErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : "Error desconocido";
  return `Ha habido un problema al continuar al pago: ${detail}`;
}

function buildAltaPayload(alta: AltaState, contact_name: string, whatsapp: string) {
  const concept = alta.has_existing_website
    ? ("gestion" as const)
    : alta.domain_is_custom
      ? ("dominio" as const)
      : null;
  const amount = alta.has_existing_website
    ? FEE_GESTION_WEB_PROPIA_EUR
    : alta.domain_is_custom
      ? (alta.domain_price ?? 0)
      : null;

  return {
    restaurant_name: alta.restaurant_name,
    restaurant_address: alta.restaurant_address || null,
    gmb_place_id: alta.gmb_place_id,
    has_existing_website: !!alta.has_existing_website,
    existing_website_url: alta.has_existing_website ? alta.existing_website_url : null,
    wants_custom_domain: !!alta.wants_custom_domain,
    domain: alta.domain || generarSubdominio(alta.restaurant_name),
    domain_is_custom: alta.domain_is_custom,
    onetime_fee_concept: concept,
    onetime_fee_amount: amount,
    contact_name,
    whatsapp,
  };
}

export function AsistenteAlta({ recoverFromCancel = false }: { recoverFromCancel?: boolean }) {
  const navigate = useNavigate();
  const [alta, setAlta] = useState<AltaState>(initialAlta);
  const [step, setStep] = useState<StepId>("restaurante");
  const [history, setHistory] = useState<StepId[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "bot",
      kind: "text",
      text: "Hola, soy el asistente de PowerUp Menu. Vamos a montar la página web de tu restaurante en unos pasos. ¿Empezamos?",
    },
  ]);
  const [botTyping, setBotTyping] = useState(false);
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>("lead");
  const [pendingAltaId, setPendingAltaId] = useState<string | null>(null);
  const [contactFormState, setContactFormState] = useState({ valid: false, submitting: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const promptedStepsRef = useRef<Set<StepId>>(new Set());

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior, block: "end" });
      });
    });
  }, []);

  const gmbSearchFn = useServerFn(gmbSearch);
  const checkDomainFn = useServerFn(checkDomain);
  const saveAltaFn = useServerFn(saveAlta);
  const createCheckoutFn = useServerFn(createCheckout);
  const validateWhatsappFn = useServerFn(validateWhatsapp);
  const checkoutScenario = getCheckoutScenario(alta);
  const { keyboardInset, viewportHeight, viewportOffsetTop } = useVisualViewport();
  const isCheckoutMode = step === "resumen" || step === "contacto";
  const collapseChatForKeyboard = keyboardInset > 0 && INPUT_FOOTER_STEPS.has(step);

  const shellStyle =
    keyboardInset > 0
      ? {
          height: viewportHeight,
          transform:
            viewportOffsetTop > 0 ? `translateY(${viewportOffsetTop}px)` : undefined,
        }
      : undefined;

  const headerSubtitle =
    step === "resumen"
      ? "Revisa tu pedido"
      : step === "contacto"
        ? "Último paso"
        : "Alta guiada";

  async function handleContactSubmit(contact_name: string, whatsapp: string) {
    void validateWhatsappFn({ data: { phone: whatsapp } }).catch(() => {
      toast.warning("No pudimos verificar el WhatsApp ahora. Lo revisaremos al contactarte.");
    });

    pushUser(`${contact_name} · ${whatsapp}`);
    const altaActualizada = { ...alta, contact_name, whatsapp };
    setAlta(altaActualizada);
    setCheckoutPhase("lead");
    setStep("enviando");

    let altaId = pendingAltaId;

    try {
      const altaPayload = buildAltaPayload(alta, contact_name, whatsapp);

      if (!altaId) {
        const saved = await saveAltaFn({ data: altaPayload });
        altaId = saved.alta_id;
        setPendingAltaId(altaId);
      }

      saveAltaDraft({
        alta: altaActualizada,
        step: "contacto",
        alta_id: altaId,
      });

      setCheckoutPhase("checkout");

      const result = await createCheckoutFn({
        data: { alta_id: altaId, origin: window.location.origin },
      });

      if (result.checkout_url) {
        const mode = redirectToCheckout(result.checkout_url);
        if (mode === "popup") {
          setBotTyping(false);
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "bot",
              kind: "text",
              text: "Te hemos abierto el pago de Stripe en una nueva pestaña. Si no aparece, permite ventanas emergentes en el navegador.",
            },
          ]);
          setStep("contacto");
        }
      } else {
        clearAltaDraft();
        navigate({ to: "/confirmacion", search: { alta_id: result.alta_id } });
      }
    } catch (e) {
      console.error(e);
      setBotTyping(false);
      const leadSaved = altaId != null;
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "bot",
          kind: "text",
          text: leadSaved
            ? `Tu contacto ya está guardado. ${checkoutErrorMessage(e)}`
            : checkoutErrorMessage(e),
        },
      ]);
      setStep("contacto");
    }
  }

  useEffect(() => {
    if (!recoverFromCancel) return;

    navigate({ to: "/", search: {}, replace: true });

    const draft = loadAltaDraft();
    if (draft?.alta.restaurant_name) {
      setAlta(draft.alta);
      if (draft.alta_id) setPendingAltaId(draft.alta_id);
      promptedStepsRef.current.add("resumen");
      promptedStepsRef.current.add("contacto");
      setStep("contacto");
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "bot",
          kind: "text",
          text: "Has cerrado el pago sin terminar. Ya tenemos tu WhatsApp guardado — puedes continuar con el pago cuando quieras.",
        },
      ]);
    } else {
      toast.message("Pago cancelado", {
        description: "Si quieres retomar el alta, vuelve a completar los pasos.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverFromCancel]);

  // Cuando entras en un paso por primera vez, el bot añade su mensaje al chat.
  useEffect(() => {
    if (promptedStepsRef.current.has(step)) return;

    if (step === "resumen" || step === "contacto") {
      promptedStepsRef.current.add(step);
      return;
    }

    const text = botPromptForStep(step, alta);
    if (!text) return;

    promptedStepsRef.current.add(step);
    setBotTyping(true);
    const t = setTimeout(() => {
      setMessages((m) => [...m, { id: uid(), role: "bot", kind: "text", text }]);
      setBotTyping(false);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Auto-scroll al final cuando cambian mensajes, paso o altura del footer
  useEffect(() => {
    scrollToBottom();
  }, [messages, botTyping, step, scrollToBottom]);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const ro = new ResizeObserver(() => scrollToBottom("instant"));
    ro.observe(footer);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  function pushUser(text: string) {
    setMessages((m) => [...m, { id: uid(), role: "user", kind: "text", text }]);
  }

  function go(next: StepId) {
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

  return (
    <div
      className={cn("flex flex-col overflow-hidden", keyboardInset === 0 && "h-dvh")}
      style={shellStyle}
    >
      {/* Header */}
      <header className="safe-area-top z-20 shrink-0 border-b border-border/60 bg-white/70 backdrop-blur">
        <div className="container-narrow flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            {history.length > 0 && step !== "enviando" ? (
              <button
                onClick={back}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="h-11 w-11" />
            )}
            <div className="leading-tight">
              <div className="font-display text-sm font-medium">Página Web</div>
              <div className="text-xs text-muted-foreground">{headerSubtitle}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Paso {Math.min(stepIndex, TOTAL_STEPS)} de {TOTAL_STEPS}
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-brand-gradient transition-all duration-500 ease-out"
            style={{
              width: `${(Math.min(stepIndex, TOTAL_STEPS) / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </header>

      {step === "enviando" ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          {checkoutPhase === "lead" ? "Guardando tu contacto…" : "Preparando tu pago seguro…"}
        </div>
      ) : isCheckoutMode ? (
        <CheckoutLayout
          alta={alta}
          step={step}
          keyboardInset={keyboardInset}
          mainFooter={
            step === "resumen" ? (
              <ResumenCtaButton onClick={() => go("contacto")}>
                {getResumenCta(checkoutScenario)}
              </ResumenCtaButton>
            ) : undefined
          }
          footer={
            step === "contacto" ? (
              <>
                <Button
                  form="contacto-form"
                  type="submit"
                  disabled={!contactFormState.valid || contactFormState.submitting}
                  className="w-full"
                  size="lg"
                >
                  {contactFormState.submitting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-4 w-4" />
                  )}
                  {contactFormState.submitting
                    ? "Guardando tu contacto…"
                    : getContactoCta(checkoutScenario)}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">
                  Después solo guardas tu tarjeta de forma segura (Stripe) para activar la prueba
                  gratis.
                </p>
              </>
            ) : undefined
          }
          footerRibbon={step === "resumen" ? <TrustStrip /> : undefined}
        >
          {step === "contacto" ? (
            <StepContacto
              alta={alta}
              layout="checkout"
              formId="contacto-form"
              submitCta={getContactoCta(checkoutScenario)}
              onSubmit={handleContactSubmit}
              onFocusInput={scrollInputIntoView}
              onFormStateChange={setContactFormState}
            />
          ) : null}
        </CheckoutLayout>
      ) : (
        <>
          <main
            ref={scrollRef}
            className={cn(
              "container-narrow min-h-0 flex-1 space-y-4 overflow-y-auto py-6",
              collapseChatForKeyboard && "max-h-0 min-h-0 overflow-hidden py-0",
            )}
            style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
            aria-hidden={collapseChatForKeyboard}
          >
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {botTyping && <TypingBubble />}
            <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
          </main>

          <footer
            ref={footerRef}
            className="safe-area-bottom shrink-0 border-t border-border/60 bg-white/80 backdrop-blur"
            style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
          >
            <div className="container-narrow py-4">
              {step === "restaurante" && (
                <StepRestaurante
                  onFocusInput={scrollInputIntoView}
                  onPick={(r) => {
                    setAlta((a) => ({
                      ...a,
                      restaurant_name: r.name,
                      restaurant_address: r.address,
                      gmb_place_id: r.place_id,
                      domain: a.domain || generarSubdominio(r.name),
                    }));
                    pushUser(r.name);
                    go("tieneWeb");
                  }}
                  onManual={(name, address) => {
                    setAlta((a) => ({
                      ...a,
                      restaurant_name: name,
                      restaurant_address: address,
                      gmb_place_id: null,
                      domain: a.domain || generarSubdominio(name),
                    }));
                    pushUser(name);
                    go("tieneWeb");
                  }}
                  search={gmbSearchFn}
                />
              )}

              {step === "tieneWeb" && (
                <ChoiceRow
                  options={[
                    {
                      label: "Sí, ya tengo web",
                      onClick: () => {
                        pushUser("Sí, ya tengo web");
                        setAlta((a) => ({ ...a, has_existing_website: true }));
                        go("tieneWebUrl");
                      },
                    },
                    {
                      label: "No, todavía no",
                      onClick: () => {
                        pushUser("No, todavía no");
                        setAlta((a) => ({ ...a, has_existing_website: false }));
                        go("dominioCustom");
                      },
                    },
                  ]}
                />
              )}

              {step === "tieneWebUrl" && (
                <StepUrl
                  onFocusInput={scrollInputIntoView}
                  onSubmit={(url) => {
                    pushUser(url);
                    setAlta((a) => ({ ...a, existing_website_url: url }));
                    go("resumen");
                  }}
                />
              )}

              {step === "dominioCustom" && (
                <>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Por defecto te creamos una dirección gratis tipo{" "}
                    <span className="font-medium text-foreground">
                      {generarSubdominio(alta.restaurant_name)}
                    </span>
                    . Un dominio personalizado sería algo como{" "}
                    <span className="font-medium text-foreground">turestaurante.es</span>.
                  </p>
                  <ChoiceRow
                    options={[
                      {
                        label: "Sí, dominio personalizado",
                        onClick: () => {
                          pushUser("Sí, quiero un dominio personalizado");
                          setAlta((a) => ({ ...a, wants_custom_domain: true }));
                          go("elegirDominio");
                        },
                      },
                      {
                        label: "No, usa el gratis",
                        onClick: () => {
                          pushUser("No, usa el gratis");
                          const sub = generarSubdominio(alta.restaurant_name);
                          setAlta((a) => ({
                            ...a,
                            wants_custom_domain: false,
                            domain: sub,
                            domain_is_custom: false,
                            domain_price: null,
                          }));
                          go("resumen");
                        },
                      },
                    ]}
                  />
                </>
              )}

              {step === "elegirDominio" && (
                <StepElegirDominio
                  onFocusInput={scrollInputIntoView}
                  onAvailable={(domain, price) => {
                    pushUser(domain);
                    setAlta((a) => ({
                      ...a,
                      domain,
                      domain_is_custom: true,
                      domain_price: price,
                    }));
                    go("resumen");
                  }}
                  onSkip={() => {
                    pushUser("Continuar sin dominio personalizado");
                    const sub = generarSubdominio(alta.restaurant_name);
                    setAlta((a) => ({
                      ...a,
                      wants_custom_domain: false,
                      domain: sub,
                      domain_is_custom: false,
                      domain_price: null,
                    }));
                    go("resumen");
                  }}
                  checkDomainFn={checkDomainFn}
                />
              )}

            </div>
          </footer>
        </>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stepIndexFor(s: StepId): number {
  switch (s) {
    case "restaurante":
      return 1;
    case "tieneWeb":
    case "tieneWebUrl":
      return 2;
    case "dominioCustom":
    case "elegirDominio":
      return 3;
    case "resumen":
      return 4;
    case "contacto":
      return 5;
    case "enviando":
      return 6;
  }
}

function botPromptForStep(s: StepId, _a: AltaState): string | null {
  switch (s) {
    case "restaurante":
      return "Busca tu restaurante en Google y selecciónalo de la lista.";
    case "tieneWeb":
      return "¿Ya tienes página web propia?";
    case "tieneWebUrl":
      return "¿Cuál es la URL de tu web actual?";
    case "dominioCustom":
      return "¿Quieres un dominio personalizado para tu nueva web?";
    case "elegirDominio":
      return "Escribe el dominio que te gustaría, sin «www» (ej. turestaurante.es).";
    case "resumen":
    case "contacto":
    case "enviando":
      return null;
  }
}

// ─── Paso 1: Buscar restaurante (GMB) ───────────────────────────────────────

function StepRestaurante({
  onPick,
  onManual,
  search,
  onFocusInput,
}: {
  onPick: (r: GmbResult) => void;
  onManual: (name: string, address: string) => void;
  search: (args: { data: { query: string } }) => Promise<{ results: GmbResult[] }>;
  onFocusInput?: (el: HTMLElement) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GmbResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [mName, setMName] = useState("");
  const [mAddress, setMAddress] = useState("");

  useEffect(() => {
    if (manual) return;
    if (q.trim().length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setLoading(true);
    setSearchError(null);
    const t = setTimeout(async () => {
      try {
        const r = await search({ data: { query: q.trim() } });
        setResults(r.results);
      } catch (e) {
        console.error(e);
        setResults([]);
        setSearchError(
          e instanceof Error ? e.message : "No se pudo buscar el restaurante. Inténtalo de nuevo.",
        );
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, manual, search]);

  if (manual) {
    return (
      <div className="space-y-3">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="manual-restaurant-name" className="text-xs font-medium">
              Nombre del restaurante
            </label>
            <Input
              id="manual-restaurant-name"
              placeholder="Ej. Bar La Plaza"
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              onFocus={(e) => {
                onFocusInput?.(e.currentTarget);
                scrollInputIntoView(e.currentTarget);
              }}
              {...inputStepConfig.restaurantNameManual}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="manual-restaurant-address" className="text-xs font-medium">
              Ubicación aproximada
            </label>
            <AddressAutocomplete
              value={mAddress}
              onChange={setMAddress}
              onFocusInput={onFocusInput}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setManual(false)}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Volver a buscar
          </button>
          <Button
            onClick={() => mName.trim() && onManual(mName.trim(), mAddress.trim())}
            disabled={!mName.trim()}
          >
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  const searchAttrs = inputStepConfig.restaurantSearch;

  return (
    <div className="space-y-2">
      <KeyboardAwareField
        suggestionsOpen={!loading && results.length > 0}
        suggestions={
          <ul>
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-3 text-left transition last:border-0 hover:bg-muted"
                >
                  <span className="text-sm font-medium">{r.name}</span>
                  <span className="min-w-0 break-words text-xs text-muted-foreground">{r.address}</span>
                </button>
              </li>
            ))}
          </ul>
        }
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Busca tu restaurante"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSearchError(null);
            }}
            onFocus={(e) => {
              onFocusInput?.(e.currentTarget);
              scrollInputIntoView(e.currentTarget);
            }}
            className="pl-9"
            {...searchAttrs}
          />
        </div>
      </KeyboardAwareField>

      {loading && (
        <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Buscando…
        </div>
      )}

      {searchError && (
        <p className="px-2 text-xs text-destructive">{searchError}</p>
      )}

      <button
        type="button"
        onClick={() => setManual(true)}
        className="text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
      >
        No aparece mi restaurante
      </button>
    </div>
  );
}

// ─── Opciones rápidas (Sí/No) ───────────────────────────────────────────────

function ChoiceRow({ options }: { options: { label: string; onClick: () => void }[] }) {
  return (
    <div className="flex w-full flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          onClick={o.onClick}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium shadow-card transition hover:border-primary/30 hover:bg-accent active:scale-[0.98]"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Paso URL web propia ────────────────────────────────────────────────────

function StepUrl({
  onSubmit,
  onFocusInput,
}: {
  onSubmit: (url: string) => void;
  onFocusInput?: (el: HTMLElement) => void;
}) {
  const [url, setUrl] = useState("");
  const trimmed = url.trim();
  const valid =
    /^https?:\/\/.+\..+/.test(trimmed) || /^[\w-]+\.[\w.-]+/.test(trimmed);
  const showHint = trimmed.length > 0 && !valid;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        let v = trimmed;
        if (!/^https?:\/\//.test(v)) v = `https://${v}`;
        onSubmit(v);
      }}
      className="flex flex-col gap-2"
    >
      <KeyboardAwareField>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            autoFocus
            placeholder="https://turestaurante.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={(e) => {
              onFocusInput?.(e.currentTarget);
              scrollInputIntoView(e.currentTarget);
            }}
            className="min-w-0 flex-1"
            aria-invalid={showHint}
            aria-describedby={showHint ? "website-url-hint" : undefined}
            {...inputStepConfig.websiteUrl}
          />
          <Button type="submit" disabled={!valid} className="h-11 w-full shrink-0 sm:w-auto">
            Enviar
          </Button>
        </div>
      </KeyboardAwareField>
      {showHint ? (
        <p id="website-url-hint" className="text-xs text-destructive">
          Escribe una URL válida, por ejemplo turestaurante.com o https://turestaurante.com
        </p>
      ) : null}
    </form>
  );
}

// ─── Paso elegir dominio ────────────────────────────────────────────────────

function NamecheapBadge() {
  return (
    <img
      src="/images/namecheaplogo.svg"
      alt="Namecheap"
      className="h-4 w-auto shrink-0 opacity-90"
    />
  );
}

function StepElegirDominio({
  onAvailable,
  onSkip,
  checkDomainFn,
  onFocusInput,
}: {
  onAvailable: (domain: string, price: number) => void;
  onSkip: () => void;
  checkDomainFn: (args: { data: { domain: string } }) => Promise<
    | { available: true; price: number }
    | { available: false; alternatives: Array<{ domain: string; price: number }> }
  >;
  onFocusInput?: (el: HTMLElement) => void;
}) {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailableDomain, setUnavailableDomain] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<Array<{ domain: string; price: number }>>([]);
  const [availableResult, setAvailableResult] = useState<{ domain: string; price: number } | null>(
    null,
  );

  const norm = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const valid = /^[a-z0-9-]+(\.[a-z]{2,})+$/.test(norm);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    setUnavailableDomain(null);
    setAlternatives([]);
    setAvailableResult(null);
    try {
      const r = await checkDomainFn({ data: { domain: norm } });
      if (r.available) {
        setAvailableResult({ domain: norm, price: r.price });
      } else {
        setUnavailableDomain(norm);
        setAlternatives(r.alternatives.slice(0, 3));
        if (r.alternatives.length === 0) {
          setError(`“${norm}” no está disponible y no hemos encontrado alternativas ahora mismo.`);
        }
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo comprobar la disponibilidad. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <KeyboardAwareField className="min-w-0 flex-1">
          <Input
            autoFocus
            placeholder="turestaurante.es"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onFocus={(e) => {
              onFocusInput?.(e.currentTarget);
              scrollInputIntoView(e.currentTarget);
            }}
            {...inputStepConfig.domain}
          />
        </KeyboardAwareField>
        <Button type="submit" disabled={!valid || loading} className="h-11 w-full shrink-0 sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Comprobar"}
        </Button>
      </form>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <X className="h-3.5 w-3.5" /> {error}
        </div>
      )}
      {availableResult && (
        <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-xs text-emerald-900">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                “{availableResult.domain}” está disponible por {formatEUR(availableResult.price)}
              </span>
            </div>
            <NamecheapBadge />
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => onAvailable(availableResult.domain, availableResult.price)}
          >
            Usar este dominio
          </Button>
        </div>
      )}
      {unavailableDomain && !error && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <X className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words">“{unavailableDomain}” no está disponible.</span>
          </div>
          <NamecheapBadge />
        </div>
      )}
      {alternatives.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="text-xs font-medium text-foreground">Alternativas disponibles</div>
          <div className="space-y-2">
            {alternatives.map((alt) => (
              <button
                key={alt.domain}
                type="button"
                onClick={() => onAvailable(alt.domain, alt.price)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-white px-3 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="min-w-0 break-words">{alt.domain}</span>
                <span className="inline-flex items-center gap-1 font-medium">
                  {formatEUR(alt.price)}
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onSkip}
        className="text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
      >
        Continuar sin dominio personalizado
      </button>
    </div>
  );
}

// ─── Mensajes del chat ──────────────────────────────────────────────────────

function ChatMessage({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return <ChatBubble role="user">{message.text}</ChatBubble>;
  }

  switch (message.kind) {
    case "text":
      return <ChatBubble role="bot">{formatBotText(message.text)}</ChatBubble>;
    case "resumen-pedido":
      return (
        <ChatBubble role="bot">
          <ResumenPedido alta={message.alta} />
        </ChatBubble>
      );
  }
}

// ─── Contacto ───────────────────────────────────────────────────────────────

function StepContacto({
  alta,
  submitCta,
  onSubmit,
  onFocusInput,
  layout = "default",
  formId,
  onFormStateChange,
}: {
  alta: AltaState;
  submitCta: string;
  onSubmit: (name: string, whatsapp: string) => void | Promise<void>;
  onFocusInput?: (el: HTMLElement) => void;
  layout?: "default" | "checkout";
  formId?: string;
  onFormStateChange?: (state: { valid: boolean; submitting: boolean }) => void;
}) {
  const [name, setName] = useState(alta.contact_name);
  const [wa, setWa] = useState(alta.whatsapp);
  const [submitting, setSubmitting] = useState(false);
  const validName = name.trim().length >= 2;
  const validWa = /[+\d][\d\s-]{7,}/.test(wa.trim());
  const valid = validName && validWa;
  const checkout = layout === "checkout";

  useEffect(() => {
    onFormStateChange?.({ valid, submitting });
  }, [valid, submitting, onFormStateChange]);

  const reassuranceBlock = (
    <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
          <MessageCircle className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-snug">¿Para qué pedimos tu móvil?</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Te avisamos por WhatsApp cuando tu web de{" "}
            <span className="font-medium text-foreground">{alta.restaurant_name}</span> esté lista y si
            necesitas ayuda con el dominio o el pago. No hacemos llamadas ni enviamos spam.
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {["Solo WhatsApp", "Sin spam", "Sin llamadas"].map((label) => (
          <span
            key={label}
            className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border/60"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );

  const fieldsBlock = (
    <KeyboardAwareField>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="contact-name" className="text-xs font-medium text-foreground">
            Tu nombre
          </label>
          <Input
            id="contact-name"
            autoFocus
            placeholder="Ej. María"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => {
              onFocusInput?.(e.currentTarget);
              scrollInputIntoView(e.currentTarget);
            }}
            disabled={submitting}
            {...inputStepConfig.contactName}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contact-whatsapp" className="text-xs font-medium text-foreground">
            Tu WhatsApp
          </label>
          <Input
            id="contact-whatsapp"
            placeholder="+34 600 000 000"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            onFocus={(e) => {
              onFocusInput?.(e.currentTarget);
              scrollInputIntoView(e.currentTarget);
            }}
            disabled={submitting}
            {...inputStepConfig.contactWhatsapp}
          />
          <p className="text-xs text-muted-foreground">
            Lo guardamos aunque no completes el pago — por si quieres retomarlo más tarde.
          </p>
        </div>
      </div>
    </KeyboardAwareField>
  );

  return (
    <form
      id={formId}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || submitting) return;
        setSubmitting(true);
        try {
          await onSubmit(name.trim(), wa.trim());
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-3"
    >
      {reassuranceBlock}
      {fieldsBlock}
      {!checkout ? (
        <>
          <Button type="submit" disabled={!valid || submitting} className="w-full" size="lg">
            {submitting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-4 w-4" />
            )}
            {submitting ? "Guardando tu contacto…" : submitCta}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Después solo guardas tu tarjeta de forma segura (Stripe) para activar la prueba gratis.
          </p>
        </>
      ) : null}
    </form>
  );
}
