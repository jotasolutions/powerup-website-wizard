import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardPayload,
} from "@/lib/analytics-dashboard.functions";
import type { DashboardAppEnvFilter } from "@/lib/analytics-posthog.server";
import { cn } from "@/lib/utils";
import {
  PanelPill,
  PanelPillGroup,
  PanelPillSeparator,
  SectionHeading,
  TileError,
  DevProductionEnvBanner,
  renderTile,
} from "./analytics-ui";
import { shouldShowDevProductionEnvBanner } from "@/lib/analytics-panel-env";
import { DomainPreferenceHeroCard } from "./DomainPreferenceHeroCard";
import { Day30Strip, MetricCardsRow } from "./MetricCardsRow";
import { NarrativeFunnel } from "./NarrativeFunnel";
import { RegistrationsHeroCard } from "./RegistrationsHeroCard";
import { TechnicalModePanel } from "./TechnicalModePanel";
import { WhyTiles } from "./WhyTiles";

type RangeDays = 7 | 30 | 90;

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90];

function sectionLightToHeading(
  light: "green" | "amber" | "gray",
): "green" | "amber" | "gray" {
  return light;
}

export function InternalAnalyticsDashboard({ appEnv }: { appEnv: DashboardAppEnvFilter }) {
  const fetchDashboard = useServerFn(getAnalyticsDashboard);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [technicalMode, setTechnicalMode] = useState(false);
  const [data, setData] = useState<AnalyticsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const fetchDashboardRef = useRef(fetchDashboard);
  const technicalPanelRef = useRef<HTMLDivElement>(null);
  fetchDashboardRef.current = fetchDashboard;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchDashboardRef
      .current({ data: { rangeDays, appEnv } })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setRefreshedAt(new Date());
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setData(null);
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeDays, appEnv]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await fetchDashboard({ data: { rangeDays, appEnv } });
      setData(payload);
      setRefreshedAt(new Date());
    } catch (error) {
      console.error(error);
      setData(null);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, rangeDays, appEnv]);

  useEffect(() => {
    if (!technicalMode) return;
    technicalPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [technicalMode]);

  const refreshing = loading && data != null;

  const worstStepLabel =
    data?.narrativeFunnel.ok && data.narrativeFunnel.data.worstDropoff
      ? data.narrativeFunnel.data.worstDropoff.stepLabel
      : null;

  const showDailyChart = rangeDays === 7 || rangeDays === 30;

  return (
    <main className="panel-container safe-area-bottom pb-8 tabular-nums">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b-[0.5px] border-panel-border pb-3">
        <div>
          <h1 className="text-lg font-medium text-panel-fg">Diagnóstico de alta</h1>
          <p className="mt-0.5 text-xs text-panel-muted">Página Web · PowerUp Menu</p>
        </div>
        <PanelPillGroup>
          {RANGE_OPTIONS.map((days) => (
            <PanelPill
              key={days}
              active={rangeDays === days}
              onClick={() => setRangeDays(days)}
              disabled={refreshing}
            >
              {days} días
            </PanelPill>
          ))}
          <PanelPillSeparator />
          <PanelPill
            active={technicalMode}
            className={cn(technicalMode && "ring-1 ring-panel-muted")}
            onClick={() => setTechnicalMode((v) => !v)}
          >
            ⌥ Técnico
          </PanelPill>
          <PanelPill
            className="inline-flex items-center gap-1.5"
            disabled={refreshing}
            onClick={() => void load()}
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
            Actualizar
          </PanelPill>
        </PanelPillGroup>
        {refreshedAt && !loading ? (
          <p className="mt-2 w-full text-right text-[11px] text-panel-muted">
            Actualizado{" "}
            {refreshedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
        ) : null}
      </header>

      {shouldShowDevProductionEnvBanner(import.meta.env.DEV, appEnv) ? (
        <div className="mb-6">
          <DevProductionEnvBanner />
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-panel-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando métricas…
        </div>
      ) : null}

      {data ? (
        <div
          className={cn(
            "space-y-7 transition-opacity",
            refreshing && "pointer-events-none opacity-60",
          )}
        >
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[5fr_7fr]">
            {data.hero.registrations.ok ? (
              <RegistrationsHeroCard
                data={data.hero.registrations.data}
                dailyPoints={
                  data.hero.dailyRegistrations.ok ? data.hero.dailyRegistrations.data : null
                }
                showDailyChart={showDailyChart}
                rangeDays={rangeDays}
              />
            ) : (
              <TileError message={data.hero.registrations.error} />
            )}
            {data.hero.domainPreference.ok ? (
              <DomainPreferenceHeroCard
                data={data.hero.domainPreference.data}
                rangeDays={rangeDays}
              />
            ) : (
              <TileError message={data.hero.domainPreference.error} />
            )}
          </section>

          <Day30Strip day30={data.row1.day30} />

          <section>
            <SectionHeading
              title="¿Funciona?"
              subtitle={data.sectionLights.funciona.subtitle}
              light={sectionLightToHeading(data.sectionLights.funciona.light)}
            />
            <MetricCardsRow contactToSignup={data.row1.contactToSignup} />
          </section>

          <section>
            <SectionHeading
              title="¿Dónde se caen antes de registrarse?"
              subtitle={data.sectionLights.donde.subtitle}
              light={sectionLightToHeading(data.sectionLights.donde.light)}
            />
            {renderTile(data.narrativeFunnel, (d) => (
              <NarrativeFunnel data={d} replayUrl={data.meta.replayUrl} />
            ))}
          </section>

          <section>
            <SectionHeading
              title="¿Por qué?"
              subtitle="causas, en frases"
              light={sectionLightToHeading(data.sectionLights.porque.light)}
            />
            <WhyTiles
              why={data.why}
              replayUrl={data.meta.replayUrl}
              replayIsPlaylist={data.meta.replayIsPlaylist}
              worstStepLabel={worstStepLabel}
            />
          </section>

          {technicalMode ? (
            <div ref={technicalPanelRef} className="scroll-mt-6">
              <TechnicalModePanel technical={data.technical} rangeDays={data.meta.rangeDays} />
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && !data ? (
        <p className={cn("text-center text-sm text-panel-muted")}>
          No se pudieron cargar las métricas.
          {loadError ? (
            <span className="mt-2 block text-xs">{loadError}</span>
          ) : (
            " Revisa la configuración local."
          )}
        </p>
      ) : null}
    </main>
  );
}
