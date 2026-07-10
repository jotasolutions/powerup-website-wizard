import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { DEFAULT_ANALYTICS_PANEL_SLUG } from "@/lib/analytics-panel.constants";
import { cn } from "@/lib/utils";
import { InternalAnalyticsDashboard } from "./InternalAnalyticsDashboard";
import { OperationsBoard } from "./OperationsBoard";

type PanelTab = "diagnostico" | "operaciones";
type RangeDays = 7 | 30 | 90;

export function InternalPanelPage({ tab }: { tab: PanelTab }) {
  const [opsRangeDays, setOpsRangeDays] = useState<RangeDays>(30);
  const { slug } = useParams({ from: "/panel/$slug" });
  const panelSlug = slug ?? DEFAULT_ANALYTICS_PANEL_SLUG;

  return (
    <div>
      <div className="container-narrow mx-auto max-w-5xl px-4 pt-8">
        <nav className="mb-6 flex gap-1 border-b">
          <Link
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
        </nav>
      </div>

      {tab === "diagnostico" ? (
        <InternalAnalyticsDashboard />
      ) : (
        <main className="container-narrow safe-area-bottom mx-auto max-w-[1400px] px-4 pb-8">
          <header className="mb-6">
            <h1 className="text-2xl font-medium tracking-tight">Operaciones</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ciclo de vida de altas · datos personales visibles
            </p>
          </header>
          <OperationsBoard rangeDays={opsRangeDays} onRangeChange={setOpsRangeDays} />
        </main>
      )}
    </div>
  );
}
