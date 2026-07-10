import type { AnalyticsDashboardPayload } from "@/lib/analytics-dashboard.functions";
import { ENV_COMPARISON_NOT_COMPARABLE_NOTE } from "@/lib/analytics-env-comparison";
import { cn } from "@/lib/utils";
import { TileShell, renderTile } from "./analytics-ui";

function FunnelBarsTechnical({
  steps,
  rangeDays,
}: {
  steps: Array<{ event: string; count: number }>;
  rangeDays: number;
}) {
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  }
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.event}>
          <div className="mb-1 flex justify-between gap-2 font-mono text-xs">
            <span className="truncate">{step.event}</span>
            <span className="tabular-nums">{step.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground/50"
              style={{ width: `${(step.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Rango: {rangeDays} días</p>
    </div>
  );
}

export function TechnicalModePanel({
  technical,
  rangeDays,
}: {
  technical: AnalyticsDashboardPayload["technical"];
  rangeDays: number;
}) {
  return (
    <div className="space-y-8 rounded-2xl border border-dashed bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Modo técnico
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <TileShell title="Funnel servidor (crudo)" subtitle="Eventos PostHog · 48h">
          {renderTile(technical.funnelServer, (d) => (
            <FunnelBarsTechnical steps={d.steps} rangeDays={rangeDays} />
          ))}
        </TileShell>
        <TileShell title="Funnel wizard (crudo)" subtitle="Eventos PostHog · 24h">
          {renderTile(technical.funnelWizard, (d) => (
            <FunnelBarsTechnical steps={d.steps} rangeDays={rangeDays} />
          ))}
        </TileShell>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Reconciliación Neon vs PostHog</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {[technical.reconciliation.days7, technical.reconciliation.days30].map((tile, i) => (
            <TileShell
              key={i}
              title={i === 0 ? "Últimos 7 días" : "Últimos 30 días"}
              subtitle="Neon paid_at vs alta_fulfilled"
            >
              {renderTile(tile, (d) => (
                <div>
                  {!d.comparable ? (
                    <p className="mb-3 text-xs text-muted-foreground">
                      {ENV_COMPARISON_NOT_COMPARABLE_NOTE}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Neon</div>
                      <div className="text-xl font-semibold tabular-nums">{d.neon}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">PostHog</div>
                      <div className="text-xl font-semibold tabular-nums">{d.posthog}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Δ</div>
                      <div
                        className={cn(
                          "text-xl font-semibold tabular-nums",
                          d.comparable && d.delta !== 0 && "text-amber-700",
                        )}
                      >
                        {d.delta > 0 ? `+${d.delta}` : d.delta}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </TileShell>
          ))}
        </div>
      </div>
    </div>
  );
}
