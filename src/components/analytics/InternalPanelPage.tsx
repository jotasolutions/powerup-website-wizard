import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { DEFAULT_ANALYTICS_PANEL_SLUG } from "@/lib/analytics-panel.constants";
import { defaultAppEnvForPanel } from "@/lib/analytics-panel-env";
import type { DashboardAppEnvFilter } from "@/lib/analytics-posthog.server";
import { cn } from "@/lib/utils";
import { InternalAnalyticsDashboard } from "./InternalAnalyticsDashboard";
import { OperationsBoard } from "./OperationsBoard";

type PanelTab = "diagnostico" | "operaciones";

export function InternalPanelPage({ tab }: { tab: PanelTab }) {
  const [appEnv, setAppEnv] = useState<DashboardAppEnvFilter>(() =>
    defaultAppEnvForPanel(import.meta.env.DEV),
  );
  const { slug } = useParams({ from: "/panel/$slug" });
  const panelSlug = slug ?? DEFAULT_ANALYTICS_PANEL_SLUG;

  return (
    <div className="panel-shell min-h-screen">
      <div className="panel-container pt-8">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-[0.5px] border-panel-border pb-3">
          <div className="flex gap-1">
            <Link
              from="/panel/$slug"
              to="/panel/$slug"
              params={{ slug: panelSlug }}
              search={{ tab: "diagnostico" }}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === "diagnostico"
                  ? "border-panel-fg text-panel-fg"
                  : "border-transparent text-panel-muted hover:text-panel-fg",
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
                  ? "border-panel-fg text-panel-fg"
                  : "border-transparent text-panel-muted hover:text-panel-fg",
              )}
            >
              Operaciones
            </Link>
          </div>
          <label className="flex items-center gap-2 text-sm text-panel-secondary">
            Entorno
            <select
              className="rounded-lg border-[0.5px] border-panel-border bg-white px-2 py-1 text-panel-fg"
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
        <main className="panel-container safe-area-bottom pb-8">
          <header className="mb-6">
            <h1 className="text-lg font-medium tracking-tight text-panel-fg">Operaciones</h1>
            <p className="mt-1 text-xs text-panel-muted">
              Registro del proceso de alta y entrega
            </p>
          </header>
          <OperationsBoard appEnv={appEnv} />
        </main>
      )}
    </div>
  );
}
