import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEUR } from "@/lib/alta-config";
import type { DomainCheckResult } from "@/lib/domain-check.types";
import {
  ALTA_DOMAIN_CHECK_CTA,
  ALTA_DOMAIN_DEGRADED_BANNER,
  ALTA_DOMAIN_OTHER_ALTERNATIVES_LABEL,
  ALTA_DOMAIN_SEARCH_PLACEHOLDER,
  ALTA_DOMAIN_USE_SUGGESTION_CTA,
  formatDomainAvailableLine,
  formatDomainPrefetchLoading,
  formatDomainSkipLabel,
  formatDomainSuggestionLine,
} from "@/lib/alta-copy";
import { inputStepConfig } from "@/lib/input-step-config";
import type { DomainPrefetchView } from "@/hooks/useDomainPrefetch";
import { cn } from "@/lib/utils";
import { KeyboardAwareField } from "./KeyboardAwareField";

const assistantInputClass = "text-base md:text-base";

function NamecheapBadge() {
  return (
    <img
      src="/images/namecheaplogo.svg"
      alt="Namecheap"
      className="h-4 w-auto shrink-0 opacity-90"
    />
  );
}

type ManualResult =
  | { kind: "available"; domain: string; price: number }
  | { kind: "unavailable"; domain: string; alternatives: Array<{ domain: string; price: number }> };

type Props = {
  prefetch: DomainPrefetchView;
  onAvailable: (domain: string, price: number) => void;
  onSkip: () => void;
  checkDomainFn: (args: { data: { domain: string } }) => Promise<DomainCheckResult>;
};

export function StepElegirDominio({ prefetch, onAvailable, onSkip, checkDomainFn }: Props) {
  const posthog = usePostHog();
  const [domain, setDomain] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);

  const { status, candidate, freeSubdomain, outcome } = prefetch;
  const prefetchPrimary = status === "ready" && !manualResult ? outcome?.primary : null;
  const prefetchMore = status === "ready" && !manualResult ? (outcome?.moreAlternatives ?? []) : [];

  useEffect(() => {
    if (manualResult) return;
    if (prefetchPrimary) {
      setDomain(prefetchPrimary.domain);
    } else if (status === "ready" || status === "loading") {
      setDomain(candidate);
    }
  }, [candidate, manualResult, prefetchPrimary, status]);

  const norm = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const valid = /^[a-z0-9-]+(\.[a-z]{2,})+$/.test(norm);

  const manualAvailable =
    manualResult?.kind === "available"
      ? { domain: manualResult.domain, price: manualResult.price }
      : null;
  const prefetchAvailable =
    prefetchPrimary && norm === prefetchPrimary.domain ? prefetchPrimary : null;
  const availablePrimary = manualAvailable ?? prefetchAvailable;
  const showPrimaryAsSuggestion = Boolean(
    !manualAvailable &&
      prefetchAvailable &&
      outcome?.unavailableCandidate &&
      outcome.unavailableCandidate !== prefetchAvailable.domain,
  );
  const showCheckButton = valid && availablePrimary == null;

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setManualLoading(true);
    setManualError(null);
    setManualResult(null);
    try {
      const r = await checkDomainFn({ data: { domain: norm } });
      if (r.available) {
        setManualResult({ kind: "available", domain: norm, price: r.price });
        posthog.capture("wizard_domain_checked_manually", {
          domain: norm,
          result: "available",
          price: r.price,
        });
      } else {
        setManualResult({
          kind: "unavailable",
          domain: norm,
          alternatives: r.alternatives.slice(0, 3),
        });
        posthog.capture("wizard_domain_checked_manually", {
          domain: norm,
          result: "unavailable",
          alternatives_count: r.alternatives.length,
        });
        if (r.alternatives.length === 0) {
          setManualError(
            `"${norm}" no está disponible y no hemos encontrado alternativas ahora mismo.`,
          );
        }
      }
    } catch (err) {
      console.error(err);
      setManualError("No se pudo comprobar la disponibilidad. Inténtalo de nuevo.");
    } finally {
      setManualLoading(false);
    }
  }

  function renderAlternativeButton(alt: { domain: string; price: number }) {
    return (
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
    );
  }

  function renderPrimaryCard(primary: { domain: string; price: number }, suggested: boolean) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-xs text-emerald-900">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words">
              {suggested
                ? formatDomainSuggestionLine(primary.domain, primary.price)
                : formatDomainAvailableLine(primary.domain, primary.price)}
            </span>
          </div>
          <NamecheapBadge />
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() => onAvailable(primary.domain, primary.price)}
        >
          {ALTA_DOMAIN_USE_SUGGESTION_CTA}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "loading" && !manualResult && (
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          {formatDomainPrefetchLoading(candidate)}
        </div>
      )}

      {status === "degraded" && !manualResult && (
        <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950">
          {ALTA_DOMAIN_DEGRADED_BANNER}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onSkip}>
            {formatDomainSkipLabel(freeSubdomain)}
          </Button>
        </div>
      )}

      {prefetchMore.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="text-xs font-medium text-foreground">
            {ALTA_DOMAIN_OTHER_ALTERNATIVES_LABEL}
          </div>
          <div className="space-y-2">{prefetchMore.map(renderAlternativeButton)}</div>
        </div>
      )}

      {status === "ready" && !prefetchPrimary && !manualResult && (
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          No hemos encontrado un dominio sugerido para "{candidate}". Prueba otro nombre abajo.
        </div>
      )}

      <form
        onSubmit={submitManual}
        className={cn(
          "flex flex-col gap-2",
          showCheckButton && "sm:flex-row sm:items-center",
        )}
      >
        <KeyboardAwareField className="min-w-0 flex-1">
          <Input
            placeholder={ALTA_DOMAIN_SEARCH_PLACEHOLDER}
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setManualResult(null);
              setManualError(null);
            }}
            className={assistantInputClass}
            {...inputStepConfig.domain}
          />
        </KeyboardAwareField>
        {showCheckButton ? (
          <Button
            type="submit"
            disabled={manualLoading}
            className="h-11 w-full shrink-0 sm:w-auto"
          >
            {manualLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              ALTA_DOMAIN_CHECK_CTA
            )}
          </Button>
        ) : null}
      </form>

      {availablePrimary &&
        renderPrimaryCard(availablePrimary, showPrimaryAsSuggestion)}

      {manualError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <X className="h-3.5 w-3.5" /> {manualError}
        </div>
      )}

      {manualResult?.kind === "unavailable" && !manualError && (
        <>
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <X className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                "{manualResult.domain}" no está disponible.
              </span>
            </div>
            <NamecheapBadge />
          </div>
          {manualResult.alternatives.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="text-xs font-medium text-foreground">
                {ALTA_DOMAIN_OTHER_ALTERNATIVES_LABEL}
              </div>
              <div className="space-y-2">
                {manualResult.alternatives.map(renderAlternativeButton)}
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onSkip}
        className="text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
      >
        {formatDomainSkipLabel(freeSubdomain)}
      </button>
    </div>
  );
}
