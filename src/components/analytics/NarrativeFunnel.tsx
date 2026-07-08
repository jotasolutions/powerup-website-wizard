import { ExternalLink } from "lucide-react";
import type { NarrativeFunnelData } from "@/lib/analytics-dashboard.functions";
import {
  formatEsNumber,
  LOW_SAMPLE_THRESHOLD,
  NARRATIVE_FUNNEL_STEPS,
} from "@/lib/analytics-narrative";
import { cn } from "@/lib/utils";
import { LowSampleNote, TileShell } from "./analytics-ui";

export function NarrativeFunnel({
  data,
  replayUrl,
}: {
  data: NarrativeFunnelData;
  replayUrl: string | null;
}) {
  const { steps, worstDropoff, placeOrigin, fulfilledBreakdown, reconciliation, topCount } = data;
  const placeTotal = placeOrigin.google + placeOrigin.manual;
  const manualPct =
    placeTotal > 0 ? Math.round((placeOrigin.manual / placeTotal) * 100) : 0;

  if (topCount === 0 && steps.every((s) => s.count === 0)) {
    return (
      <TileShell title="Recorrido del asistente" subtitle="De cada 100 personas · ventana única 48 h">
        <p className="text-sm text-emerald-700">0 entradas en el rango — sin actividad ✓</p>
      </TileShell>
    );
  }

  if (topCount < LOW_SAMPLE_THRESHOLD) {
    return (
      <TileShell title="Recorrido del asistente" subtitle="De cada 100 personas · ventana única 48 h">
        <p className="text-sm text-muted-foreground">
          Sin actividad suficiente en PostHog para dibujar el recorrido.
        </p>
        <LowSampleNote n={topCount} />
      </TileShell>
    );
  }

  return (
    <TileShell title="Recorrido del asistente" subtitle="De cada 100 personas que entran">
      <LowSampleNote n={topCount} />
      <div className="mt-3 space-y-4">
        {steps.map((step, index) => {
          const isWorst = worstDropoff?.stepIndex === index;
          const techLabel = NARRATIVE_FUNNEL_STEPS.find((s) => s.event === step.event)?.event;
          return (
            <div key={step.event}>
              <div
                className={cn(
                  "rounded-xl border p-3",
                  isWorst && "border-amber-300 bg-amber-50/50",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium" title={techLabel}>
                    {step.label}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {formatEsNumber(step.per100)} de 100
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isWorst ? "bg-amber-500" : "bg-brand-gradient",
                    )}
                    style={{ width: `${step.per100}%` }}
                  />
                </div>
                {isWorst && worstDropoff ? (
                  <p className="mt-2 text-xs text-amber-800">
                    Mayor fuga: {worstDropoff.droppedPer100} de cada 100 abandonan aquí.
                    {replayUrl ? (
                      <>
                        {" "}
                        <a
                          href={replayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                        >
                          Ver replays de ese paso
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>

              {step.event === "wizard_place_confirmed" && placeTotal > 0 ? (
                <p className="ml-4 mt-2 text-xs text-muted-foreground">
                  {formatEsNumber(placeOrigin.google)} encontrados en Google ·{" "}
                  {formatEsNumber(placeOrigin.manual)} a mano ({manualPct}%) — si esta cifra crece,
                  la búsqueda está fallando
                </p>
              ) : null}

              {step.event === "alta_fulfilled" &&
              (fulfilledBreakdown.domainPaid > 0 || fulfilledBreakdown.subdomainFree > 0) ? (
                <p className="ml-4 mt-2 text-xs text-muted-foreground">
                  {formatEsNumber(fulfilledBreakdown.domainPaid)} con dominio de pago ·{" "}
                  {formatEsNumber(fulfilledBreakdown.subdomainFree)} con subdominio gratis
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <footer className="mt-4 space-y-1 border-t pt-3 text-xs text-muted-foreground">
        {reconciliation.delta === 0 ? (
          <p>
            Verificado: las activaciones coinciden con la base de datos (
            {formatEsNumber(reconciliation.neon)} = {formatEsNumber(reconciliation.posthog)}).
          </p>
        ) : (
          <p className="text-amber-800">
            PostHog cuenta {formatEsNumber(reconciliation.posthog)} pero la base de datos{" "}
            {formatEsNumber(reconciliation.neon)} — investigar.
          </p>
        )}
        <p>Los pasos de navegación son orientativos.</p>
        <p>
          Ventana única de 48 h por simplicidad. Para análisis fino de ventanas (24 h wizard / 48 h
          servidor), usa modo técnico.
        </p>
      </footer>
    </TileShell>
  );
}
