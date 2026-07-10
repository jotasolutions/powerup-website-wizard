import type { DomainPreferenceHeroData } from "@/lib/analytics-hero.types";
import { formatEsNumber, LOW_SAMPLE_THRESHOLD } from "@/lib/analytics-narrative";
import { cn } from "@/lib/utils";
import { TileShell } from "./analytics-ui";

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

export function DomainPreferenceHeroCard({ data }: { data: DomainPreferenceHeroData }) {
  const total = data.breakdown.paid + data.breakdown.free;
  const paidPct = pct(data.breakdown.paid, total);
  const freePct = pct(data.breakdown.free, total);

  const paidActivationPct =
    data.activation.paid.rate != null ? Math.round(data.activation.paid.rate * 100) : null;
  const freeActivationPct =
    data.activation.free.rate != null ? Math.round(data.activation.free.rate * 100) : null;

  return (
    <TileShell title="¿Qué eligen: gratis o pago?" subtitle="Elección en el asistente · PostHog">
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Sin elecciones de dominio en el rango.</p>
      ) : (
        <>
          <div className="flex h-10 overflow-hidden rounded-lg text-xs font-medium tabular-nums">
            {data.breakdown.paid > 0 ? (
              <div
                className="flex min-w-0 items-center justify-center bg-emerald-600 px-2 text-white"
                style={{ flex: data.breakdown.paid }}
              >
                <span className="truncate">
                  Dominio de pago · {formatEsNumber(data.breakdown.paid)} ({paidPct}%)
                </span>
              </div>
            ) : null}
            {data.breakdown.free > 0 ? (
              <div
                className={cn(
                  "flex min-w-0 items-center justify-center px-2",
                  data.breakdown.paid > 0 ? "bg-muted text-foreground" : "bg-muted",
                )}
                style={{ flex: Math.max(data.breakdown.free, 1) }}
              >
                <span className="truncate">
                  Gratis · {formatEsNumber(data.breakdown.free)}
                  {data.breakdown.paid > 0 ? ` (${freePct}%)` : ""}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Eligen pago y acaban activando</p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {data.sampleN < LOW_SAMPLE_THRESHOLD || paidActivationPct == null
                  ? "—"
                  : `${paidActivationPct}% (${formatEsNumber(data.activation.paid.activated)} de ${formatEsNumber(data.activation.paid.chosen)})`}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">Ventana 48 h</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Eligen gratis y acaban activando</p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {data.sampleN < LOW_SAMPLE_THRESHOLD || freeActivationPct == null
                  ? "—"
                  : `${freeActivationPct}% (${formatEsNumber(data.activation.free.activated)} de ${formatEsNumber(data.activation.free.chosen)})`}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">Ventana 48 h</p>
            </div>
          </div>
        </>
      )}

      <p
        className={cn(
          "mt-4 rounded-lg border px-3 py-2 text-sm leading-relaxed",
          data.insight.tone === "green" && "border-emerald-200 bg-emerald-50/80 text-emerald-900",
          data.insight.tone === "amber" && "border-amber-200 bg-amber-50/80 text-amber-900",
          data.insight.tone === "gray" && "border-transparent bg-muted/50 text-muted-foreground",
          data.insight.tone === "neutral" && "border-transparent text-muted-foreground",
        )}
      >
        {data.insight.message}
      </p>
    </TileShell>
  );
}
