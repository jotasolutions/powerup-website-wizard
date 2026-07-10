import type { CvrLeadPaidData, TileResult } from "@/lib/analytics-dashboard.functions";
import type { Day30SubscriptionTile } from "@/lib/analytics-day30.server";
import {
  formatEsNumber,
  LOW_SAMPLE_THRESHOLD,
} from "@/lib/analytics-narrative";
import { LowSampleNote, TileShell, renderTile } from "./analytics-ui";

export function MetricCardsRow({
  contactToSignup,
}: {
  contactToSignup: TileResult<CvrLeadPaidData>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {renderTile(contactToSignup, (d) => (
        <TileShell title="De contacto a alta" subtitle={`Ventana de ${d.windowDays} días · Neon`}>
          <p className="text-sm leading-relaxed">
            {d.leads === 0
              ? "Aún no hay contactos en el rango."
              : `${formatEsNumber(d.converted)} de ${formatEsNumber(d.leads)} contactos completaron el alta en ${d.windowDays} días.`}
          </p>
          {d.leads >= LOW_SAMPLE_THRESHOLD ? (
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {Math.round(d.rate * 100)}%
            </p>
          ) : (
            <LowSampleNote n={d.leads} />
          )}
          {d.posthogLeads != null && d.posthogLeads !== d.leads ? (
            <p className="mt-2 text-xs text-amber-700 tabular-nums">
              Neon registra {formatEsNumber(d.leads)} contactos; PostHog {formatEsNumber(d.posthogLeads)}.
            </p>
          ) : null}
        </TileShell>
      ))}
    </div>
  );
}

export function Day30Strip({ day30 }: { day30: TileResult<Day30SubscriptionTile> }) {
  return renderTile(day30, (d) => (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-card">
      <p className="text-xs font-medium text-muted-foreground">Suscripciones al día 30</p>
      {d.mode === "waiting" && !d.hasPaidAltas ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Todavía no hay altas pagadas — retención al día 30 cuando empiecen los trials.
        </p>
      ) : d.mode === "waiting" && d.matureDate ? (
        <p className="mt-1 text-sm tabular-nums">
          Todas en trial. Primer cohorte madura el{" "}
          {new Date(d.matureDate).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          .
        </p>
      ) : d.mode === "stripe_unavailable" ? (
        <p className="mt-1 text-sm text-muted-foreground">{d.reason}</p>
      ) : d.mode === "retention" ? (
        <p className="mt-1 text-sm tabular-nums">
          {d.cohortSize === 0
            ? "Cohorte maduro sin altas con 30 días desde el pago."
            : `${formatEsNumber(d.retained)} de ${formatEsNumber(d.cohortSize)} retenidos al día 30 (${Math.round(d.retentionRate * 100)}%)`}
        </p>
      ) : null}
    </div>
  ));
}
