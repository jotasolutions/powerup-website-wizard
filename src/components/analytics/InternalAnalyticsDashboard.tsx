import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardPayload,
} from "@/lib/analytics-dashboard.functions";
import type { DashboardAppEnvFilter } from "@/lib/analytics-posthog.server";
import { cn } from "@/lib/utils";
import { DomainPreferenceHeroCard } from "./DomainPreferenceHeroCard";
import { MetricCardsRow } from "./MetricCardsRow";
import { NarrativeFunnel } from "./NarrativeFunnel";
import { RegistrationsHeroCard } from "./RegistrationsHeroCard";
import { SectionTrafficLight } from "./SectionTrafficLight";
import { TechnicalModePanel } from "./TechnicalModePanel";
import { WhyTiles } from "./WhyTiles";
import { renderTile, TileError } from "./analytics-ui";

type RangeDays = 7 | 30 | 90;

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90];

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

  const showDailyChart = rangeDays === 7 || rangeDays === 30;

  return (
    <main className="container-narrow safe-area-bottom mx-auto max-w-5xl px-4 py-8 tabular-nums">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Diagnóstico Alta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Panel interno — decisiones de producto en lenguaje claro
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTechnicalMode((v) => !v)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted",
              technicalMode && "border-foreground/30 bg-muted text-foreground",
            )}
          >
            Técnico
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border p-0.5">
            {RANGE_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm transition-colors",
                  rangeDays === days
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {days}d
              </button>
            ))}
          </div>
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
          <section className="grid gap-4 lg:grid-cols-2">
            {data.hero.registrations.ok ? (
              <RegistrationsHeroCard
                data={data.hero.registrations.data}
                dailyPoints={
                  data.hero.dailyRegistrations.ok ? data.hero.dailyRegistrations.data : null
                }
                showDailyChart={showDailyChart}
              />
            ) : (
              <TileError message={data.hero.registrations.error} />
            )}
            {data.hero.domainPreference.ok ? (
              <DomainPreferenceHeroCard data={data.hero.domainPreference.data} />
            ) : (
              <TileError message={data.hero.domainPreference.error} />
            )}
          </section>

          <section>
            <SectionTrafficLight
              title="¿Funciona?"
              light={data.sectionLights.funciona.light}
              subtitle={data.sectionLights.funciona.subtitle}
            />
            <MetricCardsRow contactToSignup={data.row1.contactToSignup} />
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
              day30={data.row1.day30}
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
