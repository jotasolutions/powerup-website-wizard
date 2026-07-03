import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowLeft, Check, MessageCircle } from "lucide-react";
import { ChatBubble, TypingBubble } from "./ChatBubble";
import { ChoiceRow } from "./ChoiceRow";
import { PlaceFoundPanel } from "./PlaceFoundPanel";
import { PlaceLinksPanel } from "./PlaceLinksPanel";
import { ResumenPedido } from "./ResumenPedido";
import { ContactoCheckoutFooter } from "./ContactoCheckoutFooter";
import { CheckoutLayout } from "./CheckoutLayout";
import { TrustStrip } from "./TrustStrip";
import { ResumenCtaButton } from "./ResumenCtaButton";
import { StepElegirDominio } from "./StepElegirDominio";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { SuggestionChips } from "./SuggestionChips";
import { formatBotText } from "./formatBotText";
import { type AltaState, type ChatMessage, type GmbResult, initialAlta } from "./types";
import { generarSubdominio, formatEUR } from "@/lib/alta-config";
import { buildAltaPayload } from "@/lib/alta-payload";
import {
  buildFallbackPlaceProfileFromApiError,
  buildFallbackPlaceProfileManual,
} from "@/lib/alta-enrichment-fallback";
import { resolvePlaceGapMessage } from "@/lib/place-gap";
import { resolvePowerUpUpgradeMessage } from "@/lib/place-gap.messages";
import { detectPowerUpFromProfile, resolvePowerUpCustomerForFlow } from "@/lib/powerup-customer";
import {
  clearAltaDraft,
  getCheckoutScenario,
  getContactoCta,
  getResumenCta,
  loadAltaDraft,
  saveAltaDraft,
} from "@/lib/checkout-scenario";
import {
  gmbSearch,
  enrichPlace,
  saveAlta,
  createCheckout,
  validateWhatsapp,
  checkDomain,
} from "@/lib/alta.functions";
import {
  ALTA_MANUAL_NAME_LABEL,
  ALTA_MANUAL_NAME_PLACEHOLDER,
  ALTA_NOT_IN_LIST_LINK,
  ALTA_REVIEW_PLACE_LABEL,
  ALTA_WRONG_PLACE_LABEL,
  ALTA_SEARCH_BOT_PROMPT,
  ALTA_SEARCH_PLACEHOLDER,
  ALTA_WELCOME,
  ALTA_DOMAIN_BOT_PROMPT,
  ALTA_CONTACT_REASSURANCE_CHIPS,
  formatConfirmInfoPrompt,
  formatEncontradoBotPrompt,
  formatEncontradoLoadingLabel,
} from "@/lib/alta-copy";
import { redirectToCheckout } from "@/lib/checkout-redirect";
import { inputStepConfig } from "@/lib/input-step-config";
import { scrollInputIntoView, useElementHeight, useVisualViewport } from "@/hooks/useKeyboardInset";
import { useRestaurantSearch } from "@/hooks/useRestaurantSearch";
import { usePlaceEnrichment } from "@/hooks/usePlaceEnrichment";
import { useDomainPrefetch } from "@/hooks/useDomainPrefetch";
import { KeyboardAwareField } from "./KeyboardAwareField";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StepId =
  | "restaurante"
  | "encontrado"
  | "confirmarInfo"
  | "brecha"
  | "elegirDominio"
  | "resumen"
  | "contacto"
  | "enviando";

type CheckoutPhase = "lead" | "checkout";

const TOTAL_STEPS = 5; // restaurante, enrichment, resumen, contacto, pago

const assistantInputClass = "text-base md:text-base";

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function checkoutErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : "Error desconocido";
  return `Ha habido un problema al continuar al pago: ${detail}`;
}

/** Clave fija: 1 wizard_started por pestaña. Si el usuario reinicia el wizard en la misma pestaña sin cerrarla, no se vuelve a emitir. */
const WIZARD_STARTED_SESSION_KEY = "ph_wizard_started";

type PostHogClient = ReturnType<typeof usePostHog>;

function identifyAltaLead(
  posthog: PostHogClient,
  altaId: string,
  props: { whatsapp?: string; contact_name?: string } | undefined,
  personPropertiesSetForAltaId: { current: string | null },
) {
  posthog.identify(altaId);
  if (!props?.whatsapp && !props?.contact_name) return;
  if (personPropertiesSetForAltaId.current === altaId) return;
  personPropertiesSetForAltaId.current = altaId;
  posthog.setPersonProperties({
    ...(props.whatsapp && { whatsapp: props.whatsapp }),
    ...(props.contact_name && { contact_name: props.contact_name }),
  });
}

export function AsistenteAlta({ recoverFromCancel = false }: { recoverFromCancel?: boolean }) {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const [alta, setAlta] = useState<AltaState>(initialAlta);
  const [step, setStep] = useState<StepId>("restaurante");
  const [history, setHistory] = useState<StepId[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "bot",
      kind: "text",
      text: ALTA_WELCOME,
    },
  ]);
  const [botTyping, setBotTyping] = useState(false);
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>("lead");
  const [pendingAltaId, setPendingAltaId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const footerChromeRef = useRef<HTMLDivElement>(null);
  const restaurantSearchInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const promptedStepsRef = useRef<Set<StepId>>(new Set());
  const personPropertiesSetForAltaIdRef = useRef<string | null>(null);
  const enrichmentErrorToastedRef = useRef(false);
  const lastCapturedSearchErrorRef = useRef<string | null>(null);
  const restaurantListId = useId();
  const [restaurantManual, setRestaurantManual] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior, block: "end" });
      });
    });
  }, []);

  const gmbSearchFn = useServerFn(gmbSearch);
  const {
    query: restaurantQuery,
    setQuery: setRestaurantQuery,
    results: restaurantResults,
    isFetching: restaurantSearchFetching,
    searchError: restaurantSearchError,
    showSuggestions: showRestaurantSuggestions,
    reset: resetRestaurantSearch,
  } = useRestaurantSearch(gmbSearchFn);
  const enrichPlaceFn = useServerFn(enrichPlace);
  const checkDomainFn = useServerFn(checkDomain);
  const saveAltaFn = useServerFn(saveAlta);
  const createCheckoutFn = useServerFn(createCheckout);
  const validateWhatsappFn = useServerFn(validateWhatsapp);
  const enrichmentQuery = usePlaceEnrichment(
    alta.gmb_place_id,
    alta.restaurant_name,
    enrichPlaceFn,
  );
  // Prefetch en paralelo al enrichment; resultado vive en React Query (queryKey por nombre).
  const domainPrefetch = useDomainPrefetch(alta.restaurant_name, checkDomainFn);
  const checkoutScenario = getCheckoutScenario(alta);
  const { keyboardInset, viewportHeight } = useVisualViewport();
  const headerHeight = useElementHeight(headerRef);
  const footerChromeHeight = useElementHeight(footerChromeRef);
  const isCheckoutMode = step === "resumen" || step === "contacto";

  const suggestionsMaxHeight = useMemo(() => {
    if (viewportHeight <= 0) return 240;
    const available = viewportHeight - headerHeight - footerChromeHeight - 24;
    return Math.max(120, Math.min(available, 360));
  }, [viewportHeight, headerHeight, footerChromeHeight]);

  const headerSubtitle =
    step === "resumen" ? "Revisa tu pedido" : step === "contacto" ? "Último paso" : "Alta guiada";

  async function handleContactSubmit(
    contact_name: string,
    whatsapp: string,
    meta?: { consent_user_agent: string },
  ) {
    void validateWhatsappFn({ data: { phone: whatsapp } }).catch(() => {
      toast.warning("No pudimos verificar el WhatsApp ahora. Lo revisaremos al contactarte.");
    });

    posthog.capture("wizard_contact_submitted", {
      restaurant_name: alta.restaurant_name,
      domain: alta.domain,
      domain_is_custom: alta.domain_is_custom,
      powerup_customer: alta.powerup_customer,
      checkout_scenario: getCheckoutScenario(alta),
    });

    pushUser(`${contact_name} · ${whatsapp}`);
    const altaActualizada = { ...alta, contact_name, whatsapp };
    setAlta(altaActualizada);
    setCheckoutPhase("lead");
    setStep("enviando");

    let altaId = pendingAltaId;

    try {
      const altaPayload = buildAltaPayload(alta, {
        contact_name,
        whatsapp,
        consent_user_agent: meta?.consent_user_agent,
      });

      if (!altaId) {
        const saved = await saveAltaFn({ data: altaPayload });
        altaId = saved.alta_id;
        setPendingAltaId(altaId);
      }

      identifyAltaLead(
        posthog,
        altaId,
        { whatsapp, contact_name },
        personPropertiesSetForAltaIdRef,
      );

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
        posthog.capture("wizard_checkout_started", {
          alta_id: altaId,
          restaurant_name: alta.restaurant_name,
          domain: alta.domain,
          domain_is_custom: alta.domain_is_custom,
          powerup_customer: alta.powerup_customer,
          checkout_scenario: getCheckoutScenario(alta),
        });
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
      posthog.captureException(e instanceof Error ? e : new Error(String(e)));
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
      posthog.capture("wizard_checkout_cancelled_recovered", {
        restaurant_name: draft.alta.restaurant_name,
        alta_id: draft.alta_id,
        has_draft: true,
      });
      setAlta(draft.alta);
      if (draft.alta_id) {
        setPendingAltaId(draft.alta_id);
        identifyAltaLead(
          posthog,
          draft.alta_id,
          {
            whatsapp: draft.alta.whatsapp,
            contact_name: draft.alta.contact_name,
          },
          personPropertiesSetForAltaIdRef,
        );
      }
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
      posthog.capture("wizard_checkout_cancelled_recovered", { has_draft: false });
      toast.message("Pago cancelado", {
        description: "Si quieres retomar el alta, vuelve a completar los pasos.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverFromCancel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(WIZARD_STARTED_SESSION_KEY)) return;
    sessionStorage.setItem(WIZARD_STARTED_SESSION_KEY, "1");

    const params = new URLSearchParams(window.location.search);
    posthog.capture("wizard_started", {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
    });
  }, [posthog]);

  // Sincronizar enrichPlace → AltaState (snapshot para pasos y draft; no gate del enabled).
  useEffect(() => {
    if (!alta.gmb_place_id) return;

    if (enrichmentQuery.isPending) {
      setAlta((a) =>
        a.enrichment_status === "loading" ? a : { ...a, enrichment_status: "loading" },
      );
      return;
    }

    if (enrichmentQuery.isSuccess && enrichmentQuery.data) {
      const profile = enrichmentQuery.data.profile;
      const nextStatus = profile.enrichment_partial ? "degraded" : "ready";
      const powerUp = detectPowerUpFromProfile(profile);
      setAlta((a) => {
        const nextPowerUp = powerUp.status === "yes" ? "yes" : "no";
        if (
          a.place_profile?.place_id === profile.place_id &&
          a.enrichment_status === nextStatus &&
          a.place_profile.enrichment_partial === profile.enrichment_partial &&
          a.powerup_customer === nextPowerUp
        ) {
          return a;
        }
        return {
          ...a,
          place_profile: profile,
          enrichment_status: nextStatus,
          powerup_customer: nextPowerUp,
          domain: powerUp.domain ?? a.domain,
        };
      });
      return;
    }

    if (enrichmentQuery.isError) {
      setAlta((a) => {
        if (
          a.enrichment_status === "degraded" &&
          a.place_profile?.missing_fields.includes("fetch_failed")
        ) {
          return a;
        }
        return {
          ...a,
          place_profile: buildFallbackPlaceProfileFromApiError(a),
          enrichment_status: "degraded",
        };
      });
      if (!enrichmentErrorToastedRef.current) {
        enrichmentErrorToastedRef.current = true;
        toast.warning("No pudimos cargar toda la ficha de Google. Puedes continuar igualmente.");
      }
    }
  }, [
    alta.gmb_place_id,
    enrichmentQuery.isPending,
    enrichmentQuery.isSuccess,
    enrichmentQuery.isError,
    enrichmentQuery.data,
  ]);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, botTyping, step, scrollToBottom]);

  useEffect(() => {
    if (step !== "restaurante") {
      resetRestaurantSearch();
      setRestaurantManual(false);
    }
  }, [step, resetRestaurantSearch]);

  useEffect(() => {
    if (!restaurantSearchError) return;
    if (restaurantSearchError === lastCapturedSearchErrorRef.current) return;
    lastCapturedSearchErrorRef.current = restaurantSearchError;
    posthog.capture("wizard_restaurant_search_error", {
      error: restaurantSearchError,
      query: restaurantQuery,
    });
  }, [restaurantSearchError, restaurantQuery, posthog]);

  function handleRestaurantPick(picked: GmbResult) {
    setAlta((a) => ({
      ...a,
      restaurant_name: picked.name,
      restaurant_address: picked.address,
      gmb_place_id: picked.place_id,
      domain: a.domain || generarSubdominio(picked.name),
      place_profile: null,
      enrichment_status: "idle",
      powerup_customer: "unknown",
    }));
    enrichmentErrorToastedRef.current = false;
    posthog.capture("wizard_restaurant_selected", {
      restaurant_name: picked.name,
      restaurant_address: picked.address,
      gmb_place_id: picked.place_id,
    });
    pushUser(picked.name);
    go("encontrado");
  }

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

  function returnToRestaurantSearch(userLabel: string) {
    pushUser(userLabel);
    resetRestaurantSearch();
    setRestaurantManual(false);
    enrichmentErrorToastedRef.current = false;
    promptedStepsRef.current.delete("encontrado");
    promptedStepsRef.current.delete("confirmarInfo");
    promptedStepsRef.current.delete("brecha");
    // Limpieza de memoria; la corrección ante cambio de nombre viene de la queryKey.
    void queryClient.removeQueries({ queryKey: ["domain-prefetch"] });
    setAlta((a) => ({
      ...a,
      restaurant_name: "",
      restaurant_address: "",
      gmb_place_id: null,
      place_profile: null,
      enrichment_status: "idle",
      powerup_customer: "unknown",
    }));
    setHistory([]);
    setStep("restaurante");
  }

  const stepIndex = stepIndexFor(step);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <header
        ref={headerRef}
        className="safe-area-top z-20 shrink-0 border-b border-border/60 bg-white/70 backdrop-blur"
      >
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CheckoutLayout
            alta={alta}
            step={step}
            keyboardInset={keyboardInset}
            mainFooter={
              step === "resumen" ? (
                <ResumenCtaButton
                  alta={alta}
                  onClick={() => {
                    posthog.capture("wizard_order_reviewed", {
                      restaurant_name: alta.restaurant_name,
                      domain: alta.domain,
                      domain_is_custom: alta.domain_is_custom,
                      powerup_customer: alta.powerup_customer,
                      checkout_scenario: checkoutScenario,
                    });
                    go("contacto");
                  }}
                >
                  {getResumenCta(checkoutScenario, alta)}
                </ResumenCtaButton>
              ) : undefined
            }
            footerRibbon={step === "resumen" ? <TrustStrip /> : undefined}
          />
          {step === "contacto" ? (
            <ContactoCheckoutFooter
              alta={alta}
              formId="contacto-form"
              submitCta={getContactoCta(checkoutScenario)}
              onSubmit={handleContactSubmit}
              onFocusInput={scrollInputIntoView}
              keyboardInset={keyboardInset}
            />
          ) : null}
        </div>
      ) : (
        <>
          <main
            ref={scrollRef}
            className={cn(
              "container-narrow min-h-0 flex-1 space-y-4 overflow-y-auto py-6",
              step === "restaurante" && "pb-2",
            )}
          >
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {botTyping && <TypingBubble />}
            {alta.enrichment_status === "loading" && step === "confirmarInfo" && <TypingBubble />}
            {step === "encontrado" && (
              <PlaceFoundPanel
                profile={alta.place_profile}
                loading={alta.enrichment_status === "loading"}
              />
            )}
            {step === "confirmarInfo" && alta.place_profile && (
              <PlaceLinksPanel profile={alta.place_profile} />
            )}
            {step === "brecha" && alta.powerup_customer === "yes" && (
              <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
                Usaremos tu carta en{" "}
                <span className="font-medium text-foreground">
                  {alta.domain || generarSubdominio(alta.restaurant_name)}
                </span>{" "}
                y la conectamos con tu página web.
              </div>
            )}
            {step === "brecha" && alta.powerup_customer !== "yes" && (
              <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
                Por defecto te creamos una dirección gratis tipo{" "}
                <span className="font-medium text-foreground">
                  {generarSubdominio(alta.restaurant_name)}
                </span>
                .
              </div>
            )}
            <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
          </main>

          <footer
            ref={footerRef}
            className={cn(
              "safe-area-bottom shrink-0",
              step === "restaurante"
                ? "bg-transparent"
                : "border-t border-border/60 bg-white/95 backdrop-blur",
            )}
            style={{
              transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : undefined,
            }}
          >
            <div className={cn("container-narrow", step === "restaurante" ? "pb-4 pt-2" : "py-4")}>
              {step === "restaurante" && (
                <StepRestaurante
                  query={restaurantQuery}
                  setQuery={setRestaurantQuery}
                  listId={restaurantListId}
                  results={restaurantResults}
                  isFetching={restaurantSearchFetching}
                  searchError={restaurantSearchError}
                  showSuggestions={showRestaurantSuggestions}
                  suggestionsMaxHeight={suggestionsMaxHeight}
                  searchInputRef={restaurantSearchInputRef}
                  footerChromeRef={footerChromeRef}
                  onPick={handleRestaurantPick}
                  manual={restaurantManual}
                  setManual={setRestaurantManual}
                  onManual={(name, address) => {
                    posthog.capture("wizard_restaurant_entered_manually", {
                      restaurant_name: name,
                      restaurant_address: address,
                    });
                    const base = {
                      restaurant_name: name,
                      restaurant_address: address,
                      gmb_place_id: null as string | null,
                      domain: generarSubdominio(name),
                    };
                    setAlta((a) => ({
                      ...a,
                      ...base,
                      place_profile: buildFallbackPlaceProfileManual({ ...a, ...base }),
                      enrichment_status: "degraded",
                      powerup_customer: "unknown",
                    }));
                    pushUser(name);
                    go("encontrado");
                  }}
                />
              )}

              {step === "encontrado" && (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={alta.enrichment_status === "loading"}
                    onClick={() => {
                      pushUser("Sí, es este");
                      go("confirmarInfo");
                    }}
                  >
                    {alta.enrichment_status === "loading" ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        {formatEncontradoLoadingLabel()}
                      </>
                    ) : (
                      "Sí, es este"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => returnToRestaurantSearch(ALTA_WRONG_PLACE_LABEL)}
                    className="w-full py-1 text-center text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
                  >
                    {ALTA_WRONG_PLACE_LABEL}
                  </button>
                </div>
              )}

              {step === "confirmarInfo" && alta.place_profile && (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      pushUser("Sí, es correcto");
                      posthog.capture("wizard_place_confirmed", {
                        restaurant_name: alta.restaurant_name,
                        gmb_place_id: alta.gmb_place_id,
                        enrichment_status: alta.enrichment_status,
                      });
                      setAlta((a) => ({
                        ...a,
                        powerup_customer: resolvePowerUpCustomerForFlow(
                          a.powerup_customer,
                          a.place_profile,
                        ),
                      }));
                      go("brecha");
                    }}
                  >
                    Confirmar
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      pushUser(ALTA_REVIEW_PLACE_LABEL);
                      back();
                    }}
                    className="w-full py-1 text-center text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
                  >
                    {ALTA_REVIEW_PLACE_LABEL}
                  </button>
                </div>
              )}

              {step === "brecha" && alta.powerup_customer === "yes" && (
                <ChoiceRow
                  options={[
                    {
                      label: "Activar página web con mi carta",
                      onClick: () => {
                        pushUser("Activar página web con mi carta");
                        posthog.capture("wizard_domain_type_chosen", {
                          domain_type: "free_subdomain",
                          powerup_customer: true,
                          restaurant_name: alta.restaurant_name,
                        });
                        setAlta((a) => ({
                          ...a,
                          wants_custom_domain: false,
                          domain: a.domain || generarSubdominio(a.restaurant_name),
                          domain_is_custom: false,
                          domain_price: null,
                        }));
                        go("resumen");
                      },
                    },
                    {
                      label: "Quiero dominio personalizado",
                      onClick: () => {
                        pushUser("Quiero dominio personalizado");
                        posthog.capture("wizard_domain_type_chosen", {
                          domain_type: "custom_domain",
                          powerup_customer: true,
                          restaurant_name: alta.restaurant_name,
                        });
                        setAlta((a) => ({
                          ...a,
                          wants_custom_domain: true,
                          domain_is_custom: false,
                          domain_price: null,
                        }));
                        go("elegirDominio");
                      },
                    },
                  ]}
                />
              )}

              {step === "brecha" && alta.powerup_customer !== "yes" && (
                <ChoiceRow
                  options={[
                    {
                      label: "Usar dirección gratis",
                      onClick: () => {
                        pushUser("Usar dirección gratis");
                        posthog.capture("wizard_domain_type_chosen", {
                          domain_type: "free_subdomain",
                          powerup_customer: false,
                          restaurant_name: alta.restaurant_name,
                        });
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
                    {
                      label: "Quiero dominio personalizado",
                      onClick: () => {
                        pushUser("Quiero dominio personalizado");
                        posthog.capture("wizard_domain_type_chosen", {
                          domain_type: "custom_domain",
                          powerup_customer: false,
                          restaurant_name: alta.restaurant_name,
                        });
                        setAlta((a) => ({
                          ...a,
                          wants_custom_domain: true,
                          domain_is_custom: false,
                          domain_price: null,
                        }));
                        go("elegirDominio");
                      },
                    },
                  ]}
                />
              )}

              {step === "elegirDominio" && (
                <StepElegirDominio
                  prefetch={domainPrefetch}
                  onAvailable={(domain, price) => {
                    pushUser(domain);
                    posthog.capture("wizard_custom_domain_selected", {
                      domain,
                      domain_price: price,
                      restaurant_name: alta.restaurant_name,
                    });
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
                    const sub = domainPrefetch.freeSubdomain;
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
    case "encontrado":
    case "confirmarInfo":
    case "brecha":
    case "elegirDominio":
      return 2;
    case "resumen":
      return 3;
    case "contacto":
      return 4;
    case "enviando":
      return 5;
  }
}

function botPromptForStep(s: StepId, a: AltaState): string | null {
  switch (s) {
    case "restaurante":
      return ALTA_SEARCH_BOT_PROMPT;
    case "encontrado":
      return formatEncontradoBotPrompt();
    case "confirmarInfo":
      return formatConfirmInfoPrompt();
    case "brecha":
      if (a.powerup_customer === "yes") {
        return resolvePowerUpUpgradeMessage();
      }
      return a.place_profile
        ? resolvePlaceGapMessage(a.place_profile)
        : "Te ayudamos a tener una web conectada con tu Google y tu carta.";
    case "elegirDominio":
      return ALTA_DOMAIN_BOT_PROMPT;
    case "resumen":
    case "contacto":
    case "enviando":
      return null;
  }
}

// ─── Paso 1: Buscar restaurante (GMB) ───────────────────────────────────────

function StepRestaurante({
  query,
  setQuery,
  listId,
  results,
  isFetching,
  searchError,
  showSuggestions,
  suggestionsMaxHeight,
  searchInputRef,
  footerChromeRef,
  onPick,
  manual,
  setManual,
  onManual,
}: {
  query: string;
  setQuery: (q: string) => void;
  listId: string;
  results: GmbResult[];
  isFetching: boolean;
  searchError: string | null;
  showSuggestions: boolean;
  suggestionsMaxHeight: number;
  searchInputRef: RefObject<HTMLInputElement | null>;
  footerChromeRef: RefObject<HTMLDivElement | null>;
  onPick: (r: GmbResult) => void;
  manual: boolean;
  setManual: (manual: boolean) => void;
  onManual: (name: string, address: string) => void;
}) {
  const [mName, setMName] = useState("");
  const [mAddress, setMAddress] = useState("");

  if (manual) {
    return (
      <div className="space-y-3">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="manual-restaurant-name" className="text-xs font-medium">
              {ALTA_MANUAL_NAME_LABEL}
            </label>
            <Input
              id="manual-restaurant-name"
              placeholder={ALTA_MANUAL_NAME_PLACEHOLDER}
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              className={assistantInputClass}
              {...inputStepConfig.restaurantNameManual}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="manual-restaurant-address" className="text-xs font-medium">
              Ubicación aproximada
            </label>
            <AddressAutocomplete value={mAddress} onChange={setMAddress} />
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
    <div className="mx-auto w-full max-w-md space-y-2">
      {showSuggestions && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-bubble-bot shadow-bubble">
          <SuggestionChips
            listId={listId}
            variant="anchored"
            attached
            maxHeight={suggestionsMaxHeight}
            onDismissKeyboard={() => searchInputRef.current?.blur()}
            items={results.map((r) => ({
              id: r.place_id,
              primary: r.name,
              secondary: r.address,
            }))}
            loading={isFetching}
            error={searchError}
            onSelect={(placeId) => {
              const picked = results.find((r) => r.place_id === placeId);
              if (picked) onPick(picked);
            }}
          />
        </div>
      )}

      <div ref={footerChromeRef} className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder={ALTA_SEARCH_PLACEHOLDER}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "h-12 rounded-2xl border-input bg-background pl-10 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20",
            assistantInputClass,
          )}
          aria-autocomplete="list"
          aria-controls={results.length > 0 ? listId : undefined}
          {...searchAttrs}
        />
      </div>

      <button
        type="button"
        onClick={() => setManual(true)}
        className="block w-full text-center text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
      >
        {ALTA_NOT_IN_LIST_LINK}
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

  const reassuranceBlock = checkout ? (
    <div className="rounded-xl border border-border/70 bg-muted/25 p-2.5">
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
        </div>
        <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
          Te avisamos cuando tu web de{" "}
          <span className="font-medium text-foreground">{alta.restaurant_name}</span> esté lista.
          Sin llamadas ni spam.
        </p>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {ALTA_CONTACT_REASSURANCE_CHIPS.map((label) => (
          <span
            key={label}
            className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border/60"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  ) : (
    <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
          <MessageCircle className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-snug">¿Para qué pedimos tu móvil?</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Te avisamos por WhatsApp cuando tu web de{" "}
            <span className="font-medium text-foreground">{alta.restaurant_name}</span> esté lista y
            si necesitas ayuda con el dominio o el pago. No hacemos llamadas ni enviamos spam.
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {ALTA_CONTACT_REASSURANCE_CHIPS.map((label) => (
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
            placeholder="Ej. María"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => {
              onFocusInput?.(e.currentTarget);
              scrollInputIntoView(e.currentTarget);
            }}
            disabled={submitting}
            className={assistantInputClass}
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
            className={assistantInputClass}
            {...inputStepConfig.contactWhatsapp}
          />
          <p className="text-xs text-muted-foreground">
            {checkout
              ? "Lo guardamos por si quieres retomarlo más tarde."
              : "Lo guardamos aunque no completes el pago — por si quieres retomarlo más tarde."}
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
