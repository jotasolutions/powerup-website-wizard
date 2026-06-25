import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowLeft, Check, X } from "lucide-react";
import { ChatBubble, TypingBubble } from "./ChatBubble";
import { type AltaState, type ChatMessage, type GmbResult, initialAlta } from "./types";
import {
  formatEUR,
  generarSubdominio,
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  PLAN_PRO_ANUAL_DIAS_PRUEBA,
  FEE_GESTION_WEB_PROPIA_EUR,
} from "@/lib/alta-config";
import { gmbSearch, checkDomain, saveAlta, createCheckout } from "@/lib/alta.functions";

type StepId =
  | "restaurante"
  | "tieneWeb"
  | "tieneWebUrl"
  | "dominioCustom"
  | "elegirDominio"
  | "resumen"
  | "contacto"
  | "enviando";

type CheckoutPhase = "saving" | "checkout";

const TOTAL_STEPS = 6; // restaurante, web, dominio, resumen, contacto, pago

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

export function AsistenteAlta() {
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
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>("saving");
  const scrollRef = useRef<HTMLDivElement>(null);

  const gmbSearchFn = useServerFn(gmbSearch);
  const checkDomainFn = useServerFn(checkDomain);
  const saveAltaFn = useServerFn(saveAlta);
  const createCheckoutFn = useServerFn(createCheckout);

  // Cuando entras en un paso, el bot añade su mensaje al chat.
  useEffect(() => {
    const text = botPromptForStep(step, alta);
    if (!text) return;
    setBotTyping(true);
    const t = setTimeout(() => {
      setMessages((m) => [...m, { id: uid(), role: "bot", kind: "text", text }]);
      setBotTyping(false);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Auto-scroll al final
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, botTyping, step]);

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
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container-narrow flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            {history.length > 0 && step !== "enviando" ? (
              <button
                onClick={back}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="h-9 w-9" />
            )}
            <div className="leading-tight">
              <div className="font-display text-sm font-medium">Página Web</div>
              <div className="text-xs text-muted-foreground">Alta guiada</div>
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

      {/* Chat scrollable */}
      <main
        ref={scrollRef}
        className="container-narrow flex-1 space-y-4 overflow-y-auto py-6 pb-8"
        style={{ minHeight: 0 }}
      >
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role}>
            {m.text}
          </ChatBubble>
        ))}
        {botTyping && <TypingBubble />}
      </main>

      {/* Zona de input según el paso */}
      <footer className="sticky bottom-0 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="container-narrow py-4">
          {step === "restaurante" && (
            <StepRestaurante
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
                <span className="font-medium text-foreground">{generarSubdominio(alta.restaurant_name)}</span>. Un
                dominio personalizado sería algo como{" "}
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

          {step === "resumen" && (
            <ResumenCard
              alta={alta}
              onContinue={() => go("contacto")}
            />
          )}

          {step === "contacto" && (
            <StepContacto
              alta={alta}
              onSubmit={async (contact_name, whatsapp) => {
                pushUser(`${contact_name} · ${whatsapp}`);
                setAlta((a) => ({ ...a, contact_name, whatsapp }));
                setCheckoutPhase("saving");
                setStep("enviando");
                try {
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

                  const altaPayload = {
                    restaurant_name: alta.restaurant_name,
                    restaurant_address: alta.restaurant_address || null,
                    gmb_place_id: alta.gmb_place_id,
                    has_existing_website: !!alta.has_existing_website,
                    existing_website_url: alta.has_existing_website
                      ? alta.existing_website_url
                      : null,
                    wants_custom_domain: !!alta.wants_custom_domain,
                    domain: alta.domain,
                    domain_is_custom: alta.domain_is_custom,
                    onetime_fee_concept: concept,
                    onetime_fee_amount: amount,
                    contact_name,
                    whatsapp,
                  };

                  const { alta_id } = await saveAltaFn({ data: altaPayload });

                  setCheckoutPhase("checkout");
                  const result = await createCheckoutFn({ data: { alta_id } });

                  if (result.checkout_url) {
                    window.location.href = result.checkout_url;
                  } else {
                    navigate({ to: "/confirmacion", search: { alta_id: result.alta_id } });
                  }
                } catch (e) {
                  console.error(e);
                  setBotTyping(false);
                  setMessages((m) => [
                    ...m,
                    {
                      id: uid(),
                      role: "bot",
                      kind: "text",
                      text: "Ha habido un problema al continuar al pago. Vuelve a intentarlo en un momento.",
                    },
                  ]);
                  setStep("contacto");
                }
              }}
            />
          )}

          {step === "enviando" && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {checkoutPhase === "saving"
                ? "Guardando tus datos…"
                : "Preparando tu pago seguro…"}
            </div>
          )}
        </div>
      </footer>
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

function botPromptForStep(s: StepId, a: AltaState): string | null {
  switch (s) {
    case "restaurante":
      return "Para empezar, dime cómo se llama tu restaurante. Busca en Google y selecciónalo de la lista.";
    case "tieneWeb":
      return "¿Ya tienes una página web propia para tu restaurante?";
    case "tieneWebUrl":
      return "Genial. ¿Cuál es la dirección de tu web actual?";
    case "dominioCustom":
      return "¿Quieres un dominio personalizado para tu nueva web?";
    case "elegirDominio":
      return "Perfecto. ¿Qué dominio te gustaría usar? Escríbelo sin “www” (por ejemplo: turestaurante.es).";
    case "resumen":
      return `Esto es lo que vamos a hacer para ${a.restaurant_name}. Revísalo antes de seguir.`;
    case "contacto":
      return "Último paso antes del pago: déjame tu nombre y tu WhatsApp para contactarte.";
    case "enviando":
      return null;
  }
}

// ─── Paso 1: Buscar restaurante (GMB) ───────────────────────────────────────

function StepRestaurante({
  onPick,
  onManual,
  search,
}: {
  onPick: (r: GmbResult) => void;
  onManual: (name: string, address: string) => void;
  search: (args: { data: { query: string } }) => Promise<{ results: GmbResult[] }>;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GmbResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [mName, setMName] = useState("");
  const [mAddress, setMAddress] = useState("");

  useEffect(() => {
    if (manual) return;
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await search({ data: { query: q.trim() } });
        setResults(r.results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, manual, search]);

  if (manual) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Input
            placeholder="Nombre del restaurante"
            value={mName}
            onChange={(e) => setMName(e.target.value)}
          />
          <Input
            placeholder="Dirección"
            value={mAddress}
            onChange={(e) => setMAddress(e.target.value)}
          />
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

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Busca tu restaurante"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Buscando…
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="max-h-56 overflow-y-auto rounded-xl border bg-card shadow-card">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2.5 text-left transition last:border-0 hover:bg-muted"
              >
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.address}</span>
              </button>
            </li>
          ))}
        </ul>
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
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          onClick={o.onClick}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-card transition hover:border-primary/30 hover:bg-accent active:scale-[0.98]"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Paso URL web propia ────────────────────────────────────────────────────

function StepUrl({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const valid = /^https?:\/\/.+\..+/.test(url.trim()) || /^[\w-]+\.[\w.-]+/.test(url.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        let v = url.trim();
        if (!/^https?:\/\//.test(v)) v = `https://${v}`;
        onSubmit(v);
      }}
      className="flex gap-2"
    >
      <Input
        autoFocus
        placeholder="https://turestaurante.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button type="submit" disabled={!valid}>
        Enviar
      </Button>
    </form>
  );
}

// ─── Paso elegir dominio ────────────────────────────────────────────────────

function StepElegirDominio({
  onAvailable,
  onSkip,
  checkDomainFn,
}: {
  onAvailable: (domain: string, price: number) => void;
  onSkip: () => void;
  checkDomainFn: (args: { data: { domain: string } }) => Promise<{ available: boolean; price: number }>;
}) {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const norm = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const valid = /^[a-z0-9-]+(\.[a-z]{2,})+$/.test(norm);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const r = await checkDomainFn({ data: { domain: norm } });
      if (r.available) {
        onAvailable(norm, r.price);
      } else {
        setError(`“${norm}” no está disponible. Prueba con otro.`);
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
      <form onSubmit={submit} className="flex gap-2">
        <Input
          autoFocus
          placeholder="turestaurante.es"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <Button type="submit" disabled={!valid || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Comprobar"}
        </Button>
      </form>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <X className="h-3.5 w-3.5" /> {error}
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

// ─── Resumen ────────────────────────────────────────────────────────────────

function ResumenCard({ alta, onContinue }: { alta: AltaState; onContinue: () => void }) {
  const hoy = alta.has_existing_website
    ? { label: "Fee de gestión", amount: FEE_GESTION_WEB_PROPIA_EUR }
    : alta.domain_is_custom
      ? { label: `Dominio ${alta.domain}`, amount: alta.domain_price ?? 0 }
      : { label: "Hoy no pagas nada", amount: 0 };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="space-y-2.5 text-sm">
          <Row label="Restaurante" value={alta.restaurant_name} />
          {alta.restaurant_address && (
            <Row label="Dirección" value={alta.restaurant_address} muted />
          )}
          {alta.has_existing_website ? (
            <Row label="Web actual" value={alta.existing_website_url} link />
          ) : alta.domain_is_custom ? (
            <Row
              label="Dominio"
              value={`${alta.domain} · ${formatEUR(alta.domain_price ?? 0)}`}
            />
          ) : (
            <Row label="Dirección web" value={alta.domain} />
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Desglose
        </div>
        <div className="mt-2 flex items-baseline justify-between text-sm">
          <span>Hoy · {hoy.label}</span>
          <span className="font-semibold">{formatEUR(hoy.amount)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-sm text-muted-foreground">
          <span>Tras {PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba · Plan Pro Anual</span>
          <span>{formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          El plan Pro Anual incluye tu página web. Capturamos el método de pago hoy y se cobra
          automáticamente al terminar el mes de prueba.
        </p>
      </div>

      <Button className="w-full" size="lg" onClick={onContinue}>
        Continuar
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  link,
}: {
  label: string;
  value: string;
  muted?: boolean;
  link?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-right ${muted ? "text-muted-foreground" : "font-medium"} ${link ? "underline underline-offset-2" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Contacto ───────────────────────────────────────────────────────────────

function StepContacto({
  alta,
  onSubmit,
}: {
  alta: AltaState;
  onSubmit: (name: string, whatsapp: string) => void;
}) {
  const [name, setName] = useState(alta.contact_name);
  const [wa, setWa] = useState(alta.whatsapp);
  const validName = name.trim().length >= 2;
  const validWa = /[+\d][\d\s-]{7,}/.test(wa.trim());
  const valid = validName && validWa;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit(name.trim(), wa.trim());
      }}
      className="space-y-3"
    >
      <div className="space-y-2">
        <Input
          autoFocus
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="+34 600 000 000"
          inputMode="tel"
          value={wa}
          onChange={(e) => setWa(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={!valid} className="w-full" size="lg">
        <Check className="mr-1.5 h-4 w-4" /> Continuar al pago
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Te contactaremos por WhatsApp para terminar la configuración.
      </p>
    </form>
  );
}
