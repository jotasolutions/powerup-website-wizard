import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { RegistrationsHeroData, DailyRegistrationPoint } from "@/lib/analytics-hero.types";
import { formatEsEur, formatEsNumber } from "@/lib/analytics-narrative";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DailyRegistrationsChart } from "./DailyRegistrationsChart";
import { PanelCard } from "./analytics-ui";

function formatWeeklyDelta(current: number, previous: number): string | null {
  const diff = current - previous;
  if (diff === 0) return null;
  const sign = diff > 0 ? "↑" : "↓";
  return `${sign} ${diff > 0 ? "+" : ""}${formatEsNumber(diff)} vs periodo anterior`;
}

function periodLabel(rangeDays: number): string {
  if (rangeDays === 7) return "Registros esta semana";
  return `Registros · últimos ${rangeDays} días`;
}

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
      className="h-7 w-[120px] text-panel-green-text"
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

function ScenarioRow({
  label,
  count,
  sumEur,
  dotClass,
}: {
  label: string;
  count: number;
  sumEur?: number;
  dotClass: string;
}) {
  if (count === 0) return null;
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-panel-secondary">
        <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-sm", dotClass)} aria-hidden />
        {label}
      </span>
      <span className="font-medium text-panel-fg tabular-nums">
        {formatEsNumber(count)}
        {sumEur != null && sumEur > 0 ? ` · ${formatEsEur(sumEur)} €` : ""}
      </span>
    </div>
  );
}

export function RegistrationsHeroCard({
  data,
  dailyPoints,
  showDailyChart,
  rangeDays,
}: {
  data: RegistrationsHeroData;
  dailyPoints: DailyRegistrationPoint[] | null;
  showDailyChart: boolean;
  rangeDays: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const delta = formatWeeklyDelta(data.total.current, data.total.previous);
  const trendText = data.weeklyTrend.map((n) => formatEsNumber(n)).join(" · ");
  const showSparkline = data.weeksOfHistory >= 2;

  return (
    <PanelCard>
      <div className="text-[13px] text-panel-secondary">{periodLabel(rangeDays)}</div>
      <div className="mt-1 flex items-baseline gap-2.5">
        <span className="text-[44px] font-medium leading-none text-panel-fg tabular-nums">
          {formatEsNumber(data.total.current)}
        </span>
        {delta ? (
          <span className="text-[13px] text-panel-green-text tabular-nums">{delta}</span>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-col gap-1.5 border-t-[0.5px] border-panel-border pt-3">
        <div className="flex justify-between text-[13px]">
          <span className="text-panel-secondary">
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-panel-green-solid"
              aria-hidden
            />
            Con cobro hoy (dominio o gestión)
          </span>
          <span className="font-medium text-panel-fg tabular-nums">
            {formatEsNumber(data.paidDomain.count)} · {formatEsEur(data.paidDomain.sumEur)} €
          </span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-panel-secondary">
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-panel-border-strong"
              aria-hidden
            />
            Con subdominio gratis (trial)
          </span>
          <span className="font-medium text-panel-fg tabular-nums">
            {formatEsNumber(data.freeSubdomain.count)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs text-panel-muted tabular-nums">4 semanas: {trendText}</div>
        {showSparkline ? <WeeklySparkline values={data.weeklyTrend} /> : null}
      </div>

      <Collapsible open={expanded} onOpenChange={setExpanded} className="mt-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border-[0.5px] border-panel-border px-3 py-2 text-left text-xs font-medium text-panel-secondary transition hover:bg-panel-sunken">
          <span>Ver desglose por escenario</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3 rounded-lg bg-panel-sunken px-3 py-2.5">
          <div className="flex flex-col gap-1.5">
            <ScenarioRow
              label="Trial / subdominio gratis"
              count={data.scenarios.trialFree.count}
              dotClass="bg-panel-border-strong"
            />
            <ScenarioRow
              label="Dominio personalizado"
              count={data.scenarios.customDomain.count}
              sumEur={data.scenarios.customDomain.sumEur}
              dotClass="bg-panel-green-solid"
            />
            <ScenarioRow
              label="Fee gestión web"
              count={data.scenarios.managementFee.count}
              sumEur={data.scenarios.managementFee.sumEur}
              dotClass="bg-panel-amber-dot"
            />
            {data.scenarios.powerUpUpgrade.count > 0 ? (
              <div className="flex justify-between text-[13px]">
                <span className="text-panel-secondary">Upgrade carta PowerUp</span>
                <span className="font-medium text-panel-fg tabular-nums">
                  {formatEsNumber(data.scenarios.powerUpUpgrade.count)}
                </span>
              </div>
            ) : null}
          </div>

          {showDailyChart && dailyPoints ? (
            <div className="border-t-[0.5px] border-panel-border pt-3">
              <DailyRegistrationsChart points={dailyPoints} embedded />
            </div>
          ) : null}

          <p className="text-[11px] leading-relaxed text-panel-muted">
            Altas con pago confirmado (`paid_at` en Neon). Cobro hoy = dominio o fee de gestión al
            checkout.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </PanelCard>
  );
}
