import type { RegistrationsHeroData } from "@/lib/analytics-hero.types";
import { formatEsEur, formatEsNumber, pctChange } from "@/lib/analytics-narrative";
import type { DailyRegistrationPoint } from "@/lib/analytics-hero.types";
import { TileShell } from "./analytics-ui";

function WeeklySparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const width = 120;
  const height = 28;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-[120px] text-muted-foreground"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export function RegistrationsHeroCard({
  data,
  dailyPoints,
  showDailyChart,
}: {
  data: RegistrationsHeroData;
  dailyPoints: DailyRegistrationPoint[] | null;
  showDailyChart: boolean;
}) {
  const delta = pctChange(data.total.current, data.total.previous);
  const useSparkline = data.weeksOfHistory >= 8;
  const trendText = data.weeklyTrend.map((n) => formatEsNumber(n)).join(" · ");

  return (
    <div className="space-y-4">
      <TileShell title="Registros" subtitle="Altas pagadas en el período seleccionado">
        <p className="text-[44px] font-semibold leading-none tabular-nums tracking-tight">
          {formatEsNumber(data.total.current)}
          {delta ? (
            <span className="ml-2 text-base font-medium text-muted-foreground">({delta})</span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          vs período anterior ({formatEsNumber(data.total.previous)})
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center gap-2 tabular-nums">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-emerald-600" />
            Con dominio de pago · {formatEsNumber(data.paidDomain.count)} ·{" "}
            {formatEsEur(data.paidDomain.sumEur)} €
          </p>
          <p className="flex items-center gap-2 tabular-nums text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-muted-foreground/40" />
            Con subdominio gratis · {formatEsNumber(data.freeSubdomain.count)} · 0 €
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">Últimas 4 semanas</p>
          {useSparkline ? (
            <WeeklySparkline values={data.weeklyTrend} />
          ) : (
            <p className="text-xs tabular-nums text-muted-foreground">{trendText}</p>
          )}
        </div>
      </TileShell>

      {showDailyChart && dailyPoints ? (
        <DailyRegistrationsChart points={dailyPoints} />
      ) : null}
    </div>
  );
}
