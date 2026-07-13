import type { DailyRegistrationPoint } from "@/lib/analytics-hero.types";
import { formatEsNumber } from "@/lib/analytics-narrative";
import { cn } from "@/lib/utils";
import { PanelCard } from "./analytics-ui";

export function DailyRegistrationsChart({
  points,
  embedded = false,
}: {
  points: DailyRegistrationPoint[];
  embedded?: boolean;
}) {
  const chart = (
    <>
      <p className="text-[13px] text-panel-secondary">Por día</p>
      {points.length === 0 ? (
        <p className="mt-2 text-xs text-panel-muted">Sin registros diarios en el rango.</p>
      ) : (
        <div className="mt-3 flex items-end gap-1" style={{ minHeight: 80 }}>
          {points.map((p) => {
            const heightPct = (p.count / Math.max(...points.map((x) => x.count), 1)) * 100;
            const label = p.day.slice(5);
            return (
              <div
                key={p.day}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
                title={`${p.day}: ${p.count}`}
              >
                <span className="text-[10px] tabular-nums text-panel-muted">
                  {p.count > 0 ? formatEsNumber(p.count) : ""}
                </span>
                <div
                  className={cn(
                    "w-full max-w-[28px] rounded-t bg-panel-blue-bg",
                    p.count === 0 && "bg-panel-sunken",
                  )}
                  style={{
                    height: `${Math.max(heightPct, p.count > 0 ? 8 : 2)}%`,
                    minHeight: p.count > 0 ? 4 : 2,
                  }}
                />
                <span className="text-[9px] tabular-nums text-panel-muted">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) return chart;
  return <PanelCard>{chart}</PanelCard>;
}
