import type { DailyRegistrationPoint } from "@/lib/analytics-hero.types";
import { formatEsNumber } from "@/lib/analytics-narrative";
import { cn } from "@/lib/utils";

export function DailyRegistrationsChart({ points }: { points: DailyRegistrationPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sin registros diarios en el rango.</p>
    );
  }

  const max = Math.max(...points.map((p) => p.count), 1);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <p className="text-sm font-medium">Por día</p>
      <div className="mt-4 flex items-end gap-1" style={{ minHeight: 80 }}>
        {points.map((p) => {
          const heightPct = (p.count / max) * 100;
          const label = p.day.slice(5);
          return (
            <div
              key={p.day}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${p.day}: ${p.count}`}
            >
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {p.count > 0 ? formatEsNumber(p.count) : ""}
              </span>
              <div
                className={cn(
                  "w-full max-w-[28px] rounded-t bg-brand-gradient transition-all",
                  p.count === 0 && "bg-muted",
                )}
                style={{ height: `${Math.max(heightPct, p.count > 0 ? 8 : 2)}%`, minHeight: p.count > 0 ? 4 : 2 }}
              />
              <span className="text-[9px] tabular-nums text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
