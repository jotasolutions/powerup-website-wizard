import { ExternalLink } from "lucide-react";
import type {
  AnalyticsDashboardPayload,
  WhyChannelsData,
  WhyDomainData,
  WhySearchData,
} from "@/lib/analytics-dashboard.functions";
import {
  formatEsNumber,
  LOW_SAMPLE_THRESHOLD,
  SCENARIO_LABELS,
} from "@/lib/analytics-narrative";
import { LowSampleNote, TileShell, TileError } from "./analytics-ui";

function WhySearchTile({ data }: { data: WhySearchData }) {
  return (
    <TileShell title="Búsqueda de restaurante">
      {data.totalErrors === 0 ? (
        <p className="text-sm text-emerald-700">
          Sin errores técnicos esta semana — la fuga no es por fallos de Google ✓
        </p>
      ) : (
        <p className="text-sm leading-relaxed">
          {formatEsNumber(data.totalErrors)} error{data.totalErrors === 1 ? "" : "es"} esta semana
          {data.topError ? `, principal: ${data.topError}` : ""}.
        </p>
      )}
    </TileShell>
  );
}

function WhyDomainTile({ data }: { data: WhyDomainData }) {
  const custom = data.scenarios.find((s) => s.scenario === "custom_domain");
  const trial = data.scenarios.find((s) => s.scenario === "trial_free");

  if (data.sampleN < LOW_SAMPLE_THRESHOLD) {
    return (
      <TileShell title="Dominio de pago vs gratis">
        <p className="text-sm text-muted-foreground">
          Aún no hay suficientes llegadas al pago para comparar escenarios.
        </p>
        <LowSampleNote n={data.sampleN} />
      </TileShell>
    );
  }

  if (!custom || !trial || data.ratio == null) {
    return (
      <TileShell title="Dominio de pago vs gratis">
        <p className="text-sm text-muted-foreground">Sin datos de ambos escenarios en el rango.</p>
      </TileShell>
    );
  }

  const moreOrLess = data.ratio >= 1 ? "más" : "menos";
  const ratioDisplay = data.ratio >= 1 ? data.ratio : 1 / data.ratio;

  return (
    <TileShell title="Dominio de pago vs gratis">
      <p className="text-sm leading-relaxed">
        Quien llega al pago con {SCENARIO_LABELS.custom_domain} completa{" "}
        {ratioDisplay.toFixed(1)}× {moreOrLess} que con {SCENARIO_LABELS.trial_free} (n=
        {formatEsNumber(data.sampleN)}).
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Dominio: {Math.round((data.customDomainRate ?? 0) * 100)}% · Gratis:{" "}
        {Math.round((data.trialFreeRate ?? 0) * 100)}%
      </p>
    </TileShell>
  );
}

function WhyChannelsTile({ data }: { data: WhyChannelsData }) {
  if (data.channels.length === 0) {
    return (
      <TileShell title="Canales de entrada">
        <p className="text-sm text-muted-foreground">Sin datos de canales en el rango.</p>
      </TileShell>
    );
  }

  const topVolume = [...data.channels].sort((a, b) => b.starts - a.starts)[0];
  const topActivation = [...data.channels].sort((a, b) => b.activations - a.activations)[0];

  return (
    <TileShell title="Canales de entrada">
      <p className="text-sm leading-relaxed">
        {topVolume
          ? `${topVolume.utm} trae más gente`
          : "Sin canal dominante"}
        {topActivation && topActivation.utm !== topVolume?.utm
          ? `, ${topActivation.utm} la que más activa`
          : topActivation
            ? " y también la que más activa"
            : ""}
        .
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Volumen inflable por multi-pestaña — comparar canales entre sí, no leer como personas
        únicas.
      </p>
    </TileShell>
  );
}

function WhyReplaysTile({
  replayUrl,
  worstStepLabel,
}: {
  replayUrl: string | null;
  worstStepLabel: string | null;
}) {
  return (
    <TileShell title="Grabaciones de abandono">
      {replayUrl ? (
        <>
          <p className="text-sm leading-relaxed">
            {worstStepLabel
              ? `Revisa grabaciones de gente que abandonó en «${worstStepLabel.toLowerCase()}».`
              : "Revisa grabaciones de sesiones que no completaron el alta."}
          </p>
          <a
            href={replayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Abrir playlist en PostHog
            <ExternalLink className="h-4 w-4" />
          </a>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Configura INTERNAL_ANALYTICS_REPLAY_URL con la playlist de Session Replay.
        </p>
      )}
    </TileShell>
  );
}

export function WhyTiles({
  why,
  replayUrl,
  worstStepLabel,
}: {
  why: AnalyticsDashboardPayload["why"];
  replayUrl: string | null;
  worstStepLabel: string | null;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {why.search.ok ? (
        <WhySearchTile data={why.search.data} />
      ) : (
        <TileShell title="Búsqueda de restaurante">
          <TileError message={why.search.error} />
        </TileShell>
      )}
      {why.domainVsFree.ok ? (
        <WhyDomainTile data={why.domainVsFree.data} />
      ) : (
        <TileShell title="Dominio de pago vs gratis">
          <TileError message={why.domainVsFree.error} />
        </TileShell>
      )}
      {why.channels.ok ? (
        <WhyChannelsTile data={why.channels.data} />
      ) : (
        <TileShell title="Canales de entrada">
          <TileError message={why.channels.error} />
        </TileShell>
      )}
      <WhyReplaysTile replayUrl={replayUrl} worstStepLabel={worstStepLabel} />
    </div>
  );
}
