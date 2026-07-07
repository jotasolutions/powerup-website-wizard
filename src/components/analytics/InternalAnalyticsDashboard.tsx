import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ExternalLink } from "lucide-react";
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardPayload,
  type TileResult,
} from "@/lib/analytics-dashboard.functions";
import type { DashboardAppEnvFilter } from "@/lib/analytics-posthog.server";
import { cn } from "@/lib/utils";

type RangeDays = 7 | 30 | 90;

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? "+∞" : null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

function TileShell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-card",
        className,
      )}
    >
      <h2 className="text-sm font-medium">{title}</h2>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TileError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

function MetricCard({
  title,
  current,
  previous,
  footer,
}: {
  title: string;
  current: number;
  previous: number;
  footer?: string;
}) {
  const delta = pctChange(current, previous);
  return (
    <TileShell title={title} subtitle="Semana actual vs anterior">
      <div className="text-3xl font-semibold tabular-nums">{current}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        Semana anterior: {previous}
        {delta ? <span className="ml-2 font-medium text-foreground">({delta})</span> : null}
      </div>
      {footer ? <p className="mt-2 text-xs text-muted-foreground">{footer}</p> : null}
    </TileShell>
  );
}

function FunnelBars({
  steps,
}: {
  steps: Array<{ event: string; count: number }>;
}) {
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const prev = index > 0 ? steps[index - 1]!.count : null;
        const drop =
          prev != null && prev > 0 ? ((prev - step.count) / prev) * 100 : null;
        return (
          <div key={step.event}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-mono text-muted-foreground">{step.event}</span>
              <span className="shrink-0 tabular-nums">
                {step.count.toLocaleString("es-ES")}
                {drop != null && drop > 0 ? (
                  <span className="ml-1 text-destructive">−{drop.toFixed(0)}%</span>
                ) : null}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand-gradient"
                style={{ width: `${(step.count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderTile<T>(result: TileResult<T>, render: (data: T) => ReactNode) {
  if (!result.ok) return <TileError message={result.error} />;
  return render(result.data);
}

export function InternalAnalyticsDashboard() {
  const fetchDashboard = useServerFn(getAnalyticsDashboard);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [appEnv, setAppEnv] = useState<DashboardAppEnvFilter>("production");
  const [data, setData] = useState<AnalyticsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchDashboard({ data: { rangeDays, appEnv } });
      setData(payload);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, rangeDays, appEnv]);

  useEffect(() => {
    void load();
  }, [load]);

  const rangeStartsBeforeInstrumentation =
    data &&
    new Date(data.meta.checkoutScenarioSince) >
      new Date(Date.now() - data.meta.rangeDays * 24 * 60 * 60 * 1000);

  return (
    <main className="container-narrow safe-area-bottom mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">Diagnóstico Alta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panel interno — funnel de alta (Neon + PostHog EU 212884)
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            Rango
            <select
              className="rounded-lg border bg-background px-2 py-1"
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value) as RangeDays)}
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            app_env
            <select
              className="rounded-lg border bg-background px-2 py-1"
              value={appEnv}
              onChange={(e) => setAppEnv(e.target.value as DashboardAppEnvFilter)}
            >
              <option value="production">production</option>
              <option value="all">todos</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-muted"
          >
            Actualizar
          </button>
        </div>
      </header>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando métricas…
        </div>
      ) : null}

      {data ? (
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ¿Funciona?
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {renderTile(data.row1.weeklyRevenue, (d) => (
                <MetricCard
                  title="Revenue confirmado / semana"
                  current={d.current}
                  previous={d.previous}
                  footer="Neon: paid_at + onetime_fee_amount &gt; 0"
                />
              ))}
              {renderTile(data.row1.weeklyTrials, (d) => (
                <MetricCard
                  title="Trials iniciados / semana"
                  current={d.current}
                  previous={d.previous}
                  footer="Neon: paid_at + fee 0"
                />
              ))}
              {renderTile(data.row1.cvrLeadPaid, (d) => (
                <TileShell title="CVR lead → paid (14d)" subtitle="Fuente: Neon">
                  <div className="text-3xl font-semibold tabular-nums">
                    {(d.rate * 100).toFixed(1)}%
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {d.converted} / {d.leads} leads en {data.meta.rangeDays}d
                  </p>
                </TileShell>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ¿Dónde se caen?
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <TileShell title="Funnel servidor (autoritativo)" subtitle="Ventana 48h · PostHog">
                {renderTile(data.row2.funnelServer, (d) => (
                  <FunnelBars steps={d.steps} />
                ))}
              </TileShell>
              <TileShell
                title="Funnel wizard (diagnóstico)"
                subtitle="Ventana 24h · PostHog"
              >
                {renderTile(data.row2.funnelWizard, (d) => (
                  <>
                    <FunnelBars steps={d.steps} />
                    <p className="mt-4 text-xs text-muted-foreground">
                      Solo diagnóstico de pasos — CVR total no oficial: wizard_started es
                      1×/pestaña y el merge de identidad no está validado. El CVR oficial es el
                      del funnel servidor.
                    </p>
                  </>
                ))}
              </TileShell>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ¿Por qué?
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <TileShell title="Errores GMB" subtitle="wizard_restaurant_search_error">
                {renderTile(data.row3.gmbErrors, (d) => (
                  <ul className="space-y-2 text-sm">
                    {d.series.slice(0, 8).map((s) => (
                      <li key={s.label} className="flex justify-between gap-2">
                        <span className="truncate font-mono text-xs">{s.label}</span>
                        <span className="tabular-nums">
                          {s.points.reduce((a, p) => a + p.count, 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
              </TileShell>
              <TileShell
                title="CVR por escenario de checkout"
                subtitle="checkout_session_created → alta_fulfilled · 48h"
              >
                {rangeStartsBeforeInstrumentation ? (
                  <p className="mb-3 text-xs text-amber-700">
                    Datos de checkout_scenario fiables desde {data.meta.checkoutScenarioSince}{" "}
                    (deploy 2346dc3).
                  </p>
                ) : null}
                {renderTile(data.row3.scenarioCvr, (d) => (
                  <ul className="space-y-2 text-sm">
                    {d.scenarios.map((s) => (
                      <li key={s.scenario} className="flex justify-between gap-2">
                        <span>{s.scenario}</span>
                        <span className="tabular-nums">
                          {(s.rate * 100).toFixed(0)}% ({s.fulfilled}/{s.started})
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
              </TileShell>
              <TileShell title="Atribución UTM" subtitle="wizard_started por utm_source">
                {renderTile(data.row3.utmAttribution, (d) => (
                  <>
                    <ul className="space-y-2 text-sm">
                      {d.series.slice(0, 10).map((s) => (
                        <li key={s.label} className="flex justify-between gap-2">
                          <span className="truncate">{s.label}</span>
                          <span className="tabular-nums">
                            {s.points.reduce((a, p) => a + p.count, 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Volumen inflable por multi-pestaña — comparar canales entre sí, no leer
                      como personas únicas.
                    </p>
                  </>
                ))}
              </TileShell>
              <TileShell title="Replays de abandono en checkout">
                {data.meta.replayUrl ? (
                  <a
                    href={data.meta.replayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Abrir playlist en PostHog
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Configura INTERNAL_ANALYTICS_REPLAY_URL con la playlist de Session Replay.
                  </p>
                )}
              </TileShell>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reconciliación Neon vs PostHog
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[data.reconciliation.days7, data.reconciliation.days30].map((tile, i) => (
                <TileShell
                  key={i}
                  title={i === 0 ? "Últimos 7 días" : "Últimos 30 días"}
                  subtitle="Neon paid_at vs alta_fulfilled"
                >
                  {renderTile(tile, (d) => (
                    <>
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
                              d.delta !== 0 && "text-amber-700",
                            )}
                          >
                            {d.delta > 0 ? `+${d.delta}` : d.delta}
                          </div>
                        </div>
                      </div>
                      {d.delta !== 0 ? (
                        <p className="mt-3 text-xs text-amber-800">
                          PostHog está subcontando respecto al ground truth — investigar capture
                          fallido en webhook (addendum §5).
                        </p>
                      ) : null}
                    </>
                  ))}
                </TileShell>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
