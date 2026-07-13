import { ExternalLink } from "lucide-react";
import type { NarrativeFunnelData } from "@/lib/analytics-dashboard.functions";
import {
  formatEsNumber,
  looseVolumeForFunnelStep,
  LOW_SAMPLE_THRESHOLD,
  NARRATIVE_FUNNEL_STEPS,
} from "@/lib/analytics-narrative";
import { ENV_COMPARISON_NOT_COMPARABLE_NOTE } from "@/lib/analytics-env-comparison";
import { cn } from "@/lib/utils";
import { LowSampleNote, PanelCard } from "./analytics-ui";

function shortLabel(label: string): string {
  const map: Record<string, string> = {
    "Entró al asistente": "Entró",
    "Buscó su restaurante": "Buscó",
    "Localizó su restaurante": "Localizó",
    "Confirmó su restaurante": "Confirmó",
    "Eligió dominio": "Dominio",
    "Vio la oferta de upgrade": "Upgrade",
    "Dejó su contacto": "Contacto",
    "Llegó al pago": "Pago",
    "Comenzó la prueba": "Prueba",
  };
  return map[label] ?? label;
}

function barClass(lowSample: boolean, isWorst: boolean, isLast: boolean): string {
  if (lowSample) return "bg-panel-sunken";
  if (isWorst) return "bg-panel-amber-bg";
  if (isLast) return "bg-panel-green-bg";
  return "bg-panel-blue-bg";
}

export function NarrativeFunnel({
  data,
  replayUrl,
}: {
  data: NarrativeFunnelData;
  replayUrl: string | null;
}) {
  const { steps, worstDropoff, reconciliation, topCount, placeOrigin, fulfilledBreakdown, looseVolumes } =
    data;
  const maxCount = Math.max(...steps.map((s) => s.count), 1);
  const lowSample = topCount < LOW_SAMPLE_THRESHOLD;

  const confirmedIndex = steps.findIndex((s) => s.event === "wizard_place_confirmed");
  const activatedIndex = steps.findIndex((s) => s.event === "alta_fulfilled");

  if (topCount === 0 && steps.every((s) => s.count === 0)) {
    return (
      <PanelCard>
        <p className="text-sm text-panel-green-text">0 entradas en el rango — sin actividad</p>
      </PanelCard>
    );
  }

  const manualPct =
    placeOrigin.google + placeOrigin.manual > 0
      ? Math.round((placeOrigin.manual / (placeOrigin.google + placeOrigin.manual)) * 100)
      : 0;

  return (
    <PanelCard className="px-5 py-4">
      {lowSample ? <LowSampleNote n={topCount} /> : null}

      <div className={cn("flex h-[88px] items-end gap-1", lowSample && "mt-2")}>
        {steps.map((step, index) => {
          const isWorst = !lowSample && worstDropoff?.stepIndex === index;
          const isLast = !lowSample && index === steps.length - 1;
          const heightPct = (step.count / maxCount) * 100;

          return (
            <div
              key={step.event}
              className={cn("flex-1 rounded-t", barClass(lowSample, isWorst, isLast))}
              style={{
                height: `${Math.max(heightPct, step.count > 0 ? 12 : 4)}%`,
                minHeight: step.count > 0 ? 8 : 4,
              }}
              title={NARRATIVE_FUNNEL_STEPS.find((s) => s.event === step.event)?.event}
            />
          );
        })}
      </div>

      <div className="mt-1 flex gap-1 text-center text-[11px] text-panel-muted">
        {steps.map((step, index) => {
          const isWorst = !lowSample && worstDropoff?.stepIndex === index;
          const isLast = !lowSample && index === steps.length - 1;
          const prev = index > 0 ? steps[index - 1] : null;
          const dropPct =
            !lowSample && prev && prev.count > 0
              ? Math.round(((prev.count - step.count) / prev.count) * 100)
              : null;
          const looseCount = looseVolumeForFunnelStep(step.event, looseVolumes);
          const showLooseHint = step.count === 0 && looseCount > 0;

          return (
            <div key={step.event} className="min-w-0 flex-1">
              <div
                className={cn(
                  isWorst && "text-panel-amber-text",
                  isLast && "text-panel-green-text",
                  lowSample && "text-panel-muted",
                )}
              >
                {shortLabel(step.label)}
              </div>
              <div
                className={cn(
                  "tabular-nums",
                  isWorst && "font-medium text-panel-amber-text",
                  isLast && "font-medium text-panel-green-text",
                  !isWorst && !isLast && "text-panel-secondary",
                  lowSample && "text-panel-secondary",
                )}
              >
                {isWorst && dropPct != null && dropPct > 0
                  ? `${formatEsNumber(step.count)} −${dropPct}%`
                  : formatEsNumber(step.count)}
              </div>
              {showLooseHint ? (
                <div className="text-[10px] leading-tight text-panel-muted">
                  ({formatEsNumber(looseCount)} sueltos)
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {confirmedIndex >= 0 ? (
        <p className="mt-2.5 text-xs text-panel-secondary">
          ↳ En «Confirmó»: {formatEsNumber(placeOrigin.google)} desde Google ·{" "}
          {formatEsNumber(placeOrigin.manual)} a mano
          {lowSample ? null : (
            <>
              {" "}
              ({manualPct}%) — si esta cifra crece, la búsqueda está fallando
            </>
          )}
        </p>
      ) : null}

      {activatedIndex >= 0 ? (
        <p className="mt-1 text-xs text-panel-secondary">
          ↳ En «Prueba»: {formatEsNumber(fulfilledBreakdown.domainPaid)} con dominio de pago ·{" "}
          {formatEsNumber(fulfilledBreakdown.subdomainFree)} con subdominio gratis
        </p>
      ) : null}

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-[0.5px] border-panel-border pt-2.5 text-xs">
        {!lowSample && worstDropoff ? (
          <span className="text-panel-secondary">
            <span className="text-panel-amber-text">▾</span> Mayor fuga en{" "}
            {worstDropoff.stepLabel.toLowerCase()}:{" "}
            {formatEsNumber(worstDropoff.droppedPer100)} de cada {formatEsNumber(topCount)} no
            llegan a completar el paso.
            {replayUrl ? (
              <>
                {" "}
                <a
                  href={replayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-panel-blue-text hover:underline"
                >
                  Ver replays de ese paso
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            ) : null}
          </span>
        ) : (
          <span />
        )}
        <span className="text-panel-muted tabular-nums">
          {!reconciliation.comparable ? (
            ENV_COMPARISON_NOT_COMPARABLE_NOTE
          ) : reconciliation.delta === 0 ? (
            <>
              <span className={lowSample ? "" : "text-panel-green-text"}>✓</span> Verificado{" "}
              {formatEsNumber(reconciliation.neon)} = {formatEsNumber(reconciliation.posthog)} ·
              ventana 48 h
            </>
          ) : lowSample ? (
            <>
              Neon {formatEsNumber(reconciliation.neon)} · PostHog{" "}
              {formatEsNumber(reconciliation.posthog)}
            </>
          ) : (
            <span className="text-panel-amber-text">
              PostHog {formatEsNumber(reconciliation.posthog)} · Neon{" "}
              {formatEsNumber(reconciliation.neon)} — investigar
            </span>
          )}
        </span>
      </footer>
    </PanelCard>
  );
}
