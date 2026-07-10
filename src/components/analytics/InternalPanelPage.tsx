import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { DEFAULT_ANALYTICS_PANEL_SLUG } from "@/lib/analytics-panel.constants";
import type { DashboardAppEnvFilter } from "@/lib/analytics-posthog.server";
import { cn } from "@/lib/utils";
import { InternalAnalyticsDashboard } from "./InternalAnalyticsDashboard";
import { OperationsBoard } from "./OperationsBoard";

type PanelTab = "diagnostico" | "operaciones";
type RangeDays = 7 | 30 | 90;

export function InternalPanelPage({ tab }: { tab: PanelTab }) {
  const [opsRangeDays, setOpsRangeDays] = useState<RangeDays>(30);
  const [appEnv, setAppEnv] = useState<DashboardAppEnvFilter>("production");
  const { slug } = useParams({ from: "/panel/$slug" });
  const panelSlug = slug ?? DEFAULT_ANALYTICS_PANEL_SLUG;

  return (
    <div>
      <div className="container-narrow mx-auto max-w-5xl px-4 pt-8">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b">
          <div className="flex gap-1">
            <Link
              from="/panel/$slug"
              to="/panel/$slug"
              params={{ slug: panelSlug }}
              search={{ tab: "diagnostico" }}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === "diagnostico"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Diagnóstico
            </Link>
            <Link
              from="/panel/$slug"
              to="/panel/$slug"
              params={{ slug: panelSlug }}
              search={{ tab: "operaciones" }}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === "operaciones"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Operaciones
            </Link>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
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
        </nav>
      </div>

      {tab === "diagnostico" ? (
        <InternalAnalyticsDashboard appEnv={appEnv} />
      ) : (
        <main className="container-narrow safe-area-bottom mx-auto max-w-[1400px] px-4 pb-8">
          <header className="mb-6">
            <h1 className="text-2xl font-medium tracking-tight">Operaciones</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ciclo de vida de altas · datos personales visibles
            </p>
          </header>
          <OperationsBoard
            rangeDays={opsRangeDays}
            onRangeChange={setOpsRangeDays}
            appEnv={appEnv}
          />
        </main>
      )}
    </div>
  );
}
