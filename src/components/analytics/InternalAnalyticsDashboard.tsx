import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardPayload,
} from "@/lib/analytics-dashboard.functions";
import type { DashboardAppEnvFilter } from "@/lib/analytics-posthog.server";
import { cn } from "@/lib/utils";
import { DecisionSummaryCard } from "./DecisionSummaryCard";
import { MetricCardsRow } from "./MetricCardsRow";
import { NarrativeFunnel } from "./NarrativeFunnel";
import { SectionTrafficLight } from "./SectionTrafficLight";
import { TechnicalModePanel } from "./TechnicalModePanel";
import { WhyTiles } from "./WhyTiles";
import { renderTile } from "./analytics-ui";

type RangeDays = 7 | 30 | 90;

export function InternalAnalyticsDashboard() {
  const fetchDashboard = useServerFn(getAnalyticsDashboard);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [appEnv, setAppEnv] = useState<DashboardAppEnvFilter>("production");
  const [technicalMode, setTechnicalMode] = useState(false);
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

  const worstStepLabel =
    data?.narrativeFunnel.ok && data.narrativeFunnel.data.worstDropoff
      ? data.narrativeFunnel.data.worstDropoff.stepLabel
      : null;

  return (
    <main className="container-narrow safe-area-bottom mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Diagnóstico Alta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Panel interno — decisiones de producto en lenguaje claro
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={technicalMode}
              onChange={(e) => setTechnicalMode(e.target.checked)}
              className="rounded border"
            />
            Modo técnico
          </label>
        </div>

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
            Entorno
            <select
              className="rounded-lg border bg-background px-2 py-1"
              value={appEnv}
              onChange={(e) => setAppEnv(e.target.value as DashboardAppEnvFilter)}
            >
              <option value="production">Producción</option>
              <option value="all">Todos</option>
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
          <DecisionSummaryCard
            summary={data.summary.ok ? data.summary.data : null}
            loading={loading}
          />

          <section>
            <SectionTrafficLight
              title="¿Funciona?"
              light={data.sectionLights.funciona.light}
              subtitle={data.sectionLights.funciona.subtitle}
            />
            <MetricCardsRow
              domainPayments={data.row1.domainPayments}
              subdomainSignups={data.row1.subdomainSignups}
              contactToSignup={data.row1.contactToSignup}
              day30={data.row1.day30}
            />
          </section>

          <section>
            <SectionTrafficLight
              title="¿Dónde se caen?"
              light={data.sectionLights.donde.light}
              subtitle={data.sectionLights.donde.subtitle}
            />
            {renderTile(data.narrativeFunnel, (d) => (
              <NarrativeFunnel data={d} replayUrl={data.meta.replayUrl} />
            ))}
          </section>

          <section>
            <SectionTrafficLight
              title="¿Por qué?"
              light={data.sectionLights.porque.light}
              subtitle={data.sectionLights.porque.subtitle}
            />
            <WhyTiles
              why={data.why}
              replayUrl={data.meta.replayUrl}
              worstStepLabel={worstStepLabel}
            />
          </section>

          {technicalMode ? (
            <TechnicalModePanel technical={data.technical} rangeDays={data.meta.rangeDays} />
          ) : null}
        </div>
      ) : null}

      {!loading && !data ? (
        <p className={cn("text-center text-sm text-destructive")}>
          No se pudieron cargar las métricas. Revisa la configuración local.
        </p>
      ) : null}
    </main>
  );
}
