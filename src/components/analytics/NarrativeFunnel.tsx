import { ExternalLink } from "lucide-react";
import type { NarrativeFunnelData } from "@/lib/analytics-dashboard.functions";
import {
  formatEsNumber,
  LOW_SAMPLE_THRESHOLD,
  NARRATIVE_FUNNEL_STEPS,
} from "@/lib/analytics-narrative";
import { cn } from "@/lib/utils";
import { LowSampleNote, TileShell } from "./analytics-ui";

function shortLabel(label: string): string {
  const map: Record<string, string> = {
    "Entró al asistente": "Entró",
    "Buscó su restaurante": "Buscó",
    "Confirmó su restaurante": "Confirmó",
    "Eligió dominio": "Dominio",
    "Vio la oferta de upgrade": "Upgrade",
    "Dejó su contacto": "Contacto",
    "Llegó al pago": "Pago",
    "Activó su página": "Activó",
  };
  return map[label] ?? label;
}

export function NarrativeFunnel({
  data,
  replayUrl,
}: {
  data: NarrativeFunnelData;
  replayUrl: string | null;
}) {
  const { steps, worstDropoff, reconciliation, topCount } = data;
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  if (topCount === 0 && steps.every((s) => s.count === 0)) {
    return (
      <TileShell title="Recorrido del asistente" subtitle="Ventana única 48 h">
        <p className="text-sm text-emerald-700">0 entradas en el rango — sin actividad ✓</p>
      </TileShell>
    );
  }

  if (topCount < LOW_SAMPLE_THRESHOLD) {
    return (
      <TileShell title="Recorrido del asistente" subtitle="Ventana única 48 h">
        <p className="text-sm text-muted-foreground">
          Sin actividad suficiente en PostHog para dibujar el recorrido.
        </p>
        <LowSampleNote n={topCount} />
      </TileShell>
    );
  }

  return (
    <TileShell title="Recorrido del asistente" subtitle="Ventana única 48 h">
      <div className="flex items-end justify-between gap-1 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const isWorst = worstDropoff?.stepIndex === index;
          const heightPct = (step.count / maxCount) * 100;
          const techLabel = NARRATIVE_FUNNEL_STEPS.find((s) => s.event === step.event)?.event;
          const prev = index > 0 ? steps[index - 1] : null;
          const dropPct =
            prev && prev.count > 0
              ? Math.round(((prev.count - step.count) / prev.count) * 100)
              : null;

          return (
            <div
              key={step.event}
              className="flex min-w-[52px] flex-1 flex-col items-center gap-1"
              title={techLabel}
            >
              <div
                className="flex w-full flex-col items-center justify-end"
                style={{ height: 120 }}
              >
                <div
                  className={cn(
                    "w-full max-w-[36px] rounded-t transition-all",
                    isWorst ? "bg-amber-500" : "bg-brand-gradient",
                  )}
                  style={{
                    height: `${Math.max(heightPct, step.count > 0 ? 12 : 4)}%`,
                    minHeight: step.count > 0 ? 8 : 4,
                  }}
                />
              </div>
              <span
                className={cn(
                  "text-center text-[10px] font-medium leading-tight",
                  isWorst && "text-amber-800",
                )}
              >
                {shortLabel(step.label)}
              </span>
              <span className="text-xs font-semibold tabular-nums">{formatEsNumber(step.count)}</span>
              {isWorst && dropPct != null && dropPct > 0 ? (
                <span className="text-[10px] font-medium tabular-nums text-amber-700">−{dropPct}%</span>
              ) : null}
            </div>
          );
        })}
      </div>

      {worstDropoff ? (
        <p className="mt-3 text-sm text-amber-800">
          Mayor fuga en {worstDropoff.stepLabel.toLowerCase()}
          {replayUrl ? (
            <>
              {" "}
              <a
                href={replayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              >
                + ver replays
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <footer className="mt-4 space-y-1 border-t pt-3 text-xs text-muted-foreground tabular-nums">
        {reconciliation.delta === 0 ? (
          <p>
            Verificado N = N: {formatEsNumber(reconciliation.neon)} ={" "}
            {formatEsNumber(reconciliation.posthog)}
          </p>
        ) : (
          <p className="text-amber-800">
            PostHog {formatEsNumber(reconciliation.posthog)} · Neon{" "}
            {formatEsNumber(reconciliation.neon)} — investigar
          </p>
        )}
      </footer>
    </TileShell>
  );
}
