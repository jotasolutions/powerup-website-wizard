import type { WhenTheyStartData } from "@/lib/analytics-dashboard.functions";
import { formatEsNumber } from "@/lib/analytics-narrative";
import { cn } from "@/lib/utils";
import { TileShell } from "./analytics-ui";

const WHEN_SAMPLE_THRESHOLD = 30;

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 7];
const DOW_LABELS: Record<number, string> = {
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
  7: "D",
};

const SLOT_ORDER = ["morning", "afternoon", "night"];

function MiniBars({
  items,
  lowSample,
}: {
  items: Array<{ key: string; label: string; count: number }>;
  lowSample: boolean;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="flex items-end gap-2">
      {items.map((item) => {
        const h = (item.count / max) * 100;
        return (
          <div key={item.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {item.count > 0 ? formatEsNumber(item.count) : ""}
            </span>
            <div
              className={cn(
                "w-full max-w-8 rounded-t",
                lowSample ? "bg-muted" : "bg-brand-gradient",
              )}
              style={{ height: `${Math.max(h, item.count > 0 ? 12 : 4)}%`, minHeight: 16 }}
            />
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function WhenTheyStartTile({ data }: { data: WhenTheyStartData }) {
  const lowSample = data.total < WHEN_SAMPLE_THRESHOLD;

  const dowItems = DOW_ORDER.map((d) => {
    const row = data.byDayOfWeek.find((x) => x.day === d);
    return { key: String(d), label: DOW_LABELS[d] ?? "?", count: row?.count ?? 0 };
  });

  const slotItems = SLOT_ORDER.map((slot) => {
    const row = data.byTimeSlot.find((x) => x.slot === slot);
    return {
      key: slot,
      label: row?.label.split(" ")[0] ?? slot,
      count: row?.count ?? 0,
    };
  });

  return (
    <TileShell
      title="¿Cuándo empiezan el alta?"
      subtitle="Hora local Europe/Madrid · wizard_started"
      className="lg:col-span-2"
    >
      {lowSample ? (
        <p className="text-sm text-muted-foreground">Aún poca muestra para ver patrones (n={data.total}).</p>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Por día de semana</p>
            <MiniBars items={dowItems} lowSample={false} />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Por franja horaria</p>
            <MiniBars
              items={slotItems.map((s, i) => ({
                ...s,
                label: ["Mañana", "Tarde", "Noche"][i] ?? s.label,
              }))}
              lowSample={false}
            />
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Útil para decidir cuándo enviar recordatorios.
      </p>
    </TileShell>
  );
}
