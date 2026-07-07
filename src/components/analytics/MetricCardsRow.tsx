import type {
  CvrLeadPaidData,
  DomainPaymentsData,
  TileResult,
} from "@/lib/analytics-dashboard.functions";
import type { Day30SubscriptionTile } from "@/lib/analytics-neon.server";
import {
  formatEsEur,
  formatEsNumber,
  LOW_SAMPLE_THRESHOLD,
  pctChange,
} from "@/lib/analytics-narrative";
import { LowSampleNote, TileShell, renderTile } from "./analytics-ui";

function MetricDelta({ current, previous }: { current: number; previous: number }) {
  const delta = pctChange(current, previous);
  if (!delta) return null;
  return <span className="ml-2 font-medium text-foreground">({delta})</span>;
}

export function MetricCardsRow({
  domainPayments,
  subdomainSignups,
  contactToSignup,
  day30,
}: {
  domainPayments: TileResult<DomainPaymentsData>;
  subdomainSignups: TileResult<{ current: number; previous: number }>;
  contactToSignup: TileResult<CvrLeadPaidData>;
  day30: TileResult<Day30SubscriptionTile>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {renderTile(domainPayments, (d) => (
        <TileShell title="Cobros de dominio" subtitle="Altas con pago único de dominio">
          <p className="text-sm leading-relaxed">
            {d.count.current === 0
              ? "Nadie compró dominio propio esta semana."
              : `${formatEsNumber(d.count.current)} alta${d.count.current === 1 ? "" : "s"} con dominio de pago.`}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatEsEur(d.sumEur.current)} €
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dinero cobrado esta semana
            <MetricDelta current={d.count.current} previous={d.count.previous} />
          </p>
        </TileShell>
      ))}

      {renderTile(subdomainSignups, (d) => (
        <TileShell title="Altas con subdominio" subtitle="0 € hoy, trial de 30 días">
          <p className="text-sm leading-relaxed">
            {d.current === 0
              ? "Ninguna alta con subdominio gratis esta semana."
              : `${formatEsNumber(d.current)} alta${d.current === 1 ? "" : "s"} empezaron trial gratis.`}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatEsNumber(d.current)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Semana anterior: {formatEsNumber(d.previous)}
            <MetricDelta current={d.current} previous={d.previous} />
          </p>
        </TileShell>
      ))}

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
            <p className="mt-2 text-xs text-amber-700">
              Neon registra {formatEsNumber(d.leads)} contactos; PostHog {formatEsNumber(d.posthogLeads)}.
            </p>
          ) : null}
        </TileShell>
      ))}

      {renderTile(day30, (d) => (
        <TileShell title="Suscripciones al día 30" subtitle="Retención post-trial">
          {d.mode === "waiting" && !d.hasPaidAltas ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay altas pagadas. Cuando empiecen los trials, aquí verás la retención al día 30.
            </p>
          ) : d.mode === "waiting" && d.matureDate ? (
            <p className="text-sm leading-relaxed">
              Todas en trial, sin cobros de suscripción aún. El primer cohorte madura el{" "}
              {new Date(d.matureDate).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              .
            </p>
          ) : d.mode === "data_unavailable" ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              El cohorte ya maduró, pero falta el estado de suscripción en la base de datos.{" "}
              {d.todo}
            </p>
          ) : null}
        </TileShell>
      ))}
    </div>
  );
}
