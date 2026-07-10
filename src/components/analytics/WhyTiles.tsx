import { ExternalLink } from "lucide-react";
import type { AnalyticsDashboardPayload, TileResult } from "@/lib/analytics-dashboard.functions";
import type { Day30SubscriptionTile } from "@/lib/analytics-day30.server";
import { formatEsNumber } from "@/lib/analytics-narrative";
import { Day30Strip } from "./MetricCardsRow";
import { WhenTheyStartTile } from "./WhenTheyStartTile";
import { LowSampleNote, TileShell, TileError } from "./analytics-ui";

function WhySearchTile({ data }: { data: AnalyticsDashboardPayload["why"]["search"] extends { ok: true; data: infer D } ? D : never }) {
  return (
    <TileShell title="Búsqueda de restaurante">
      {data.totalErrors === 0 ? (
        <p className="text-sm text-emerald-700">
          Sin errores técnicos esta semana — la fuga no es por fallos de Google ✓
        </p>
      ) : (
        <p className="text-sm leading-relaxed tabular-nums">
          {formatEsNumber(data.totalErrors)} error{data.totalErrors === 1 ? "" : "es"} esta semana
          {data.topError ? `, principal: ${data.topError}` : ""}.
        </p>
      )}
    </TileShell>
  );
}

function WhyChannelsTile({
  data,
}: {
  data: AnalyticsDashboardPayload["why"]["channels"] extends { ok: true; data: infer D } ? D : never;
}) {
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
        {topVolume ? `${topVolume.utm} trae más gente` : "Sin canal dominante"}
        {topActivation && topActivation.utm !== topVolume?.utm
          ? `, ${topActivation.utm} la que más activa`
          : topActivation
            ? " y también la que más activa"
            : ""}
        .
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
  day30,
  replayUrl,
  worstStepLabel,
}: {
  why: AnalyticsDashboardPayload["why"];
  day30: TileResult<Day30SubscriptionTile>;
  replayUrl: string | null;
  worstStepLabel: string | null;
}) {
  return (
    <div className="space-y-4">
      <Day30Strip day30={day30} />

      <div className="grid gap-4 lg:grid-cols-2">
        {why.search.ok ? (
          <WhySearchTile data={why.search.data} />
        ) : (
          <TileShell title="Búsqueda de restaurante">
            <TileError message={why.search.error} />
          </TileShell>
        )}

        {why.whenTheyStart.ok ? (
          <WhenTheyStartTile data={why.whenTheyStart.data} />
        ) : (
          <TileShell title="¿Cuándo empiezan el alta?" className="lg:col-span-2">
            <TileError message={why.whenTheyStart.error} />
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
    </div>
  );
}
