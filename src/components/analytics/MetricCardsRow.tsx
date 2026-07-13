import { Clock } from "lucide-react";
import type { CvrLeadPaidData, TileResult } from "@/lib/analytics-dashboard.functions";
import type { Day30SubscriptionTile } from "@/lib/analytics-day30.server";
import {
  formatEsNumber,
  LOW_SAMPLE_THRESHOLD,
} from "@/lib/analytics-narrative";
import { LowSampleNote, PanelCard, PanelSunkenStrip, renderTile } from "./analytics-ui";

export function MetricCardsRow({
  contactToSignup,
}: {
  contactToSignup: TileResult<CvrLeadPaidData>;
}) {
  return renderTile(contactToSignup, (d) => (
    <PanelCard>
      <div className="text-[13px] text-panel-secondary">
        De contacto a alta · ventana de {d.windowDays} días
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-panel-secondary">
        {d.leads === 0
          ? "Aún no hay contactos en el rango."
          : `${formatEsNumber(d.converted)} de ${formatEsNumber(d.leads)} contactos completaron el alta en ${d.windowDays} días.`}
      </p>
      {d.leads >= LOW_SAMPLE_THRESHOLD ? (
        <p className="mt-2 text-xl font-medium text-panel-fg tabular-nums">
          {Math.round(d.rate * 100)}%
        </p>
      ) : (
        <LowSampleNote n={d.leads} />
      )}
      {d.posthogLeads != null &&
      d.envComparisonComparable &&
      d.posthogLeads !== d.leads ? (
        <p className="mt-2 text-xs text-panel-amber-text tabular-nums">
          Neon registra {formatEsNumber(d.leads)} contactos; PostHog{" "}
          {formatEsNumber(d.posthogLeads)}.
        </p>
      ) : null}
      {d.posthogLeads != null &&
      !d.envComparisonComparable &&
      d.posthogLeads !== d.leads ? (
        <p className="mt-2 text-xs text-panel-muted">
          Neon registra {formatEsNumber(d.leads)} contactos; PostHog{" "}
          {formatEsNumber(d.posthogLeads)} (no comparable: filtro de entorno solo en PostHog).
        </p>
      ) : null}
    </PanelCard>
  ));
}

export function Day30Strip({ day30 }: { day30: TileResult<Day30SubscriptionTile> }) {
  return renderTile(day30, (d) => (
    <PanelSunkenStrip>
      <Clock className="h-4 w-4 shrink-0 text-panel-muted" strokeWidth={1.75} />
      <span>
        <span className="text-panel-muted">Suscripciones al día 30: </span>
        {d.mode === "waiting" && !d.hasPaidAltas ? (
          "todavía no hay altas pagadas — retención al día 30 cuando empiecen los trials."
        ) : d.mode === "waiting" && d.matureDate ? (
          <>
            el primer cohorte madura el{" "}
            <span className="font-medium text-panel-fg tabular-nums">
              {new Date(d.matureDate).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
              })}
            </span>
            {" — sabremos si los que compraron dominio se quedan más."}
          </>
        ) : d.mode === "stripe_unavailable" ? (
          d.reason
        ) : d.mode === "retention" ? (
          d.cohortSize === 0 ? (
            "cohorte maduro sin altas con 30 días desde el pago."
          ) : (
            <>
              <span className="font-medium text-panel-fg tabular-nums">
                {formatEsNumber(d.retained)} de {formatEsNumber(d.cohortSize)} retenidos al día 30
              </span>
              {" "}({Math.round(d.retentionRate * 100)}%).
            </>
          )
        ) : null}
      </span>
    </PanelSunkenStrip>
  ));
}
