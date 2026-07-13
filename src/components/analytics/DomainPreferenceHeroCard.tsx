import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import type { DomainPreferenceHeroData } from "@/lib/analytics-hero.types";
import { formatEsNumber, LOW_SAMPLE_THRESHOLD } from "@/lib/analytics-narrative";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PanelCard } from "./analytics-ui";

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function TransitionRow({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-panel-secondary">{label}</span>
      <span className="font-medium text-panel-fg tabular-nums">{formatEsNumber(count)}</span>
    </div>
  );
}

export function DomainPreferenceHeroCard({
  data,
  rangeDays,
}: {
  data: DomainPreferenceHeroData;
  rangeDays: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = data.breakdown.paid + data.breakdown.free;
  const paidPct = pct(data.breakdown.paid, total);
  const freePct = pct(data.breakdown.free, total);

  const paidActivationPct =
    data.activation.paid.rate != null ? Math.round(data.activation.paid.rate * 100) : null;
  const freeActivationPct =
    data.activation.free.rate != null ? Math.round(data.activation.free.rate * 100) : null;

  const neon = data.neonIntent;
  const neonSampleOk = neon.withIntent >= LOW_SAMPLE_THRESHOLD;
  const hasNeonTransitions =
    neon.transitions.paidToPaid > 0 ||
    neon.transitions.paidToFree > 0 ||
    neon.transitions.freeToFree > 0 ||
    neon.transitions.freeToPaid > 0;

  return (
    <PanelCard>
      <div className="text-[13px] text-panel-secondary">¿Qué eligen: gratis o pago?</div>
      <div className="mt-0.5 text-xs text-panel-muted">
        {total === 0
          ? "Sin elecciones de dominio en el rango."
          : `${formatEsNumber(total)} personas eligieron dominio en ${rangeDays} días`}
      </div>

      {total > 0 ? (
        <>
          <div className="mt-3 space-y-2">
            <div className="flex h-2 overflow-hidden rounded-full">
              {data.breakdown.paid > 0 ? (
                <div
                  className="min-w-1 bg-panel-green-solid"
                  style={{ width: `${paidPct}%` }}
                  title={`Dominio de pago · ${formatEsNumber(data.breakdown.paid)} (${paidPct}%)`}
                />
              ) : null}
              {data.breakdown.free > 0 ? (
                <div
                  className={cn(
                    "min-w-1 bg-panel-border",
                    data.breakdown.paid > 0 ? "" : "w-full",
                  )}
                  style={
                    data.breakdown.paid > 0
                      ? { width: `${freePct}%` }
                      : undefined
                  }
                  title={`Gratis · ${formatEsNumber(data.breakdown.free)} (${freePct}%)`}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium tabular-nums">
              {data.breakdown.paid > 0 ? (
                <span className="text-panel-green-text">
                  Dominio de pago · {formatEsNumber(data.breakdown.paid)} ({paidPct}%)
                </span>
              ) : null}
              {data.breakdown.free > 0 ? (
                <span className="text-panel-secondary">
                  Gratis · {formatEsNumber(data.breakdown.free)} ({freePct}%)
                </span>
              ) : null}
            </div>
          </div>

          {data.downgrades.total > 0 ? (
            <p className="mt-2 text-xs text-panel-secondary">
              {formatEsNumber(data.downgrades.total)} bajaron de pago a gratis (PostHog)
              {data.downgrades.namecheapDegraded > 0
                ? ` · ${formatEsNumber(data.downgrades.namecheapDegraded)} por fallo Namecheap`
                : null}
              {data.downgrades.skipLink > 0
                ? ` · ${formatEsNumber(data.downgrades.skipLink)} skip voluntario`
                : null}
            </p>
          ) : null}

          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg bg-panel-sunken px-3 py-2.5">
              <div className="text-xs text-panel-secondary">
                Eligen pago y acaban empezando la prueba
              </div>
              <div className="mt-0.5 text-xl font-medium text-panel-fg tabular-nums">
                {data.sampleN < LOW_SAMPLE_THRESHOLD || paidActivationPct == null ? (
                  "—"
                ) : (
                  <>
                    {paidActivationPct}%{" "}
                    <span className="text-xs font-normal text-panel-muted">
                      {formatEsNumber(data.activation.paid.activated)} de{" "}
                      {formatEsNumber(data.activation.paid.chosen)}
                    </span>
                  </>
                )}
              </div>
              {data.sampleN < LOW_SAMPLE_THRESHOLD && data.activation.paid.chosen > 0 ? (
                <p className="mt-1 text-[11px] text-panel-muted">
                  {formatEsNumber(data.activation.paid.chosen)} eligieron pago ·{" "}
                  {formatEsNumber(data.activation.paid.activated)} empezaron la prueba
                </p>
              ) : null}
            </div>
            <div className="rounded-lg bg-panel-sunken px-3 py-2.5">
              <div className="text-xs text-panel-secondary">
                Eligen gratis y acaban empezando la prueba
              </div>
              <div className="mt-0.5 text-xl font-medium text-panel-fg tabular-nums">
                {data.sampleN < LOW_SAMPLE_THRESHOLD || freeActivationPct == null ? (
                  "—"
                ) : (
                  <>
                    {freeActivationPct}%{" "}
                    <span className="text-xs font-normal text-panel-muted">
                      {formatEsNumber(data.activation.free.activated)} de{" "}
                      {formatEsNumber(data.activation.free.chosen)}
                    </span>
                  </>
                )}
              </div>
              {data.sampleN < LOW_SAMPLE_THRESHOLD && data.activation.free.chosen > 0 ? (
                <p className="mt-1 text-[11px] text-panel-muted">
                  {formatEsNumber(data.activation.free.chosen)} eligieron gratis ·{" "}
                  {formatEsNumber(data.activation.free.activated)} empezaron la prueba
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <Collapsible open={expanded} onOpenChange={setExpanded} className="mt-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border-[0.5px] border-panel-border px-3 py-2 text-left text-xs font-medium text-panel-secondary transition hover:bg-panel-sunken">
          <span>Ver intención vs resultado (Neon)</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2 rounded-lg bg-panel-sunken px-3 py-2.5">
          {!neonSampleOk ? (
            <p className="text-xs text-panel-muted">
              Muestra insuficiente ({formatEsNumber(neon.withIntent)} leads con intención registrada;
              mínimo {LOW_SAMPLE_THRESHOLD}).
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-panel-secondary">
                <span>
                  Intención pago: {formatEsNumber(neon.intention.paid)}
                </span>
                <span>
                  Intención gratis: {formatEsNumber(neon.intention.free)}
                </span>
              </div>
              {hasNeonTransitions ? (
                <div className="flex flex-col gap-1 border-t-[0.5px] border-panel-border pt-2">
                  <TransitionRow label="Pago → pago" count={neon.transitions.paidToPaid} />
                  <TransitionRow label="Pago → gratis" count={neon.transitions.paidToFree} />
                  <TransitionRow label="Gratis → gratis" count={neon.transitions.freeToFree} />
                  <TransitionRow label="Gratis → pago" count={neon.transitions.freeToPaid} />
                </div>
              ) : (
                <p className="text-xs text-panel-muted">Sin transiciones en el rango.</p>
              )}
            </>
          )}
          <p className="text-[11px] leading-relaxed text-panel-muted">
            Intención inicial al primer clic en brecha; resultado al guardar contacto. Motivos de
            downgrade (Namecheap / skip) solo en PostHog arriba.
          </p>
        </CollapsibleContent>
      </Collapsible>

      <div
        className={cn(
          "mt-3 flex gap-2 text-xs leading-relaxed",
          data.insight.tone === "green" && "text-panel-green-text",
          data.insight.tone === "amber" && "text-panel-amber-text",
          (data.insight.tone === "gray" || data.insight.tone === "neutral") &&
            "text-panel-secondary",
        )}
      >
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>{data.insight.message}</span>
      </div>
    </PanelCard>
  );
}
