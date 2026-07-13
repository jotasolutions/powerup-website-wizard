import { Clock, Clapperboard, Compass, ExternalLink, Search } from "lucide-react";
import type { AnalyticsDashboardPayload } from "@/lib/analytics-dashboard.functions";
import { formatEsNumber } from "@/lib/analytics-narrative";
import { InsightTile, TileError } from "./analytics-ui";
import { WhenTheyStartTile } from "./WhenTheyStartTile";

function WhySearchTile({
  data,
}: {
  data: AnalyticsDashboardPayload["why"]["search"] extends { ok: true; data: infer D } ? D : never;
}) {
  const title =
    data.totalErrors === 0
      ? "La búsqueda no falla técnicamente"
      : "Hay errores técnicos en la búsqueda";

  return (
    <InsightTile icon={Search} iconTone={data.totalErrors === 0 ? "green" : "amber"} title={title}>
      {data.totalErrors === 0 ? (
        <>
          0 errores de Google esta semana. La fuga es de comportamiento — verlo en los replays.
        </>
      ) : (
        <>
          {formatEsNumber(data.totalErrors)} error{data.totalErrors === 1 ? "" : "es"} esta semana
          {data.topError ? `, principal: ${data.topError}` : ""}.
        </>
      )}
    </InsightTile>
  );
}

function WhyChannelsTile({
  data,
}: {
  data: AnalyticsDashboardPayload["why"]["channels"] extends { ok: true; data: infer D } ? D : never;
}) {
  if (data.channels.length === 0) {
    return (
      <InsightTile icon={Compass} iconTone="gray" title="Sin datos de canales">
        Sin datos de canales en el rango.
      </InsightTile>
    );
  }

  const topVolume = [...data.channels].sort((a, b) => b.starts - a.starts)[0];
  const topActivation = [...data.channels].sort((a, b) => b.activations - a.activations)[0];

  let title = "Sin canal dominante";
  if (topVolume && topActivation) {
    if (topVolume.utm === topActivation.utm) {
      title = `${topVolume.utm} trae y más empiezan la prueba`;
    } else {
      title = `${topVolume.utm} atrae, ${topActivation.utm} convierte más`;
    }
  }

  return (
    <InsightTile icon={Compass} iconTone="blue" title={title}>
      {topVolume ? `${topVolume.utm} trae más volumen` : "Sin canal dominante"}
      {topActivation && topActivation.utm !== topVolume?.utm
        ? `; ${topActivation.utm} la mayor tasa de prueba iniciada`
        : topActivation
          ? " y también la que más convierte"
          : ""}
      . Comparar entre sí, no como personas únicas.
    </InsightTile>
  );
}

function WhyReplaysTile({
  replayUrl,
  replayIsPlaylist,
  worstStepLabel,
}: {
  replayUrl: string;
  replayIsPlaylist: boolean;
  worstStepLabel: string | null;
}) {
  const stepName = worstStepLabel?.toLowerCase() ?? "búsqueda";

  return (
    <InsightTile
      icon={Clapperboard}
      iconTone="blue"
      title={`Grabaciones del paso de ${stepName}`}
    >
      {replayIsPlaylist ? (
        <>
          Gente que abandonó justo ahí, ordenada por recientes.{" "}
          <a
            href={replayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-panel-blue-text hover:underline"
          >
            Abrir playlist
            <ExternalLink className="h-3 w-3" />
          </a>
        </>
      ) : (
        <>
          Abre Session Replay en PostHog y filtra por el paso.{" "}
          <a
            href={replayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-panel-blue-text hover:underline"
          >
            Ver grabaciones
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-panel-muted">
            {" "}
            (opcional: guarda filtros como playlist y pon la URL en{" "}
            <code className="text-[10px]">INTERNAL_ANALYTICS_REPLAY_URL</code>)
          </span>
        </>
      )}
    </InsightTile>
  );
}

export function WhyTiles({
  why,
  replayUrl,
  replayIsPlaylist,
  worstStepLabel,
}: {
  why: AnalyticsDashboardPayload["why"];
  replayUrl: string;
  replayIsPlaylist: boolean;
  worstStepLabel: string | null;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
      {why.search.ok ? (
        <WhySearchTile data={why.search.data} />
      ) : (
        <InsightTile icon={Search} iconTone="gray" title="Búsqueda de restaurante">
          <TileError message={why.search.error} />
        </InsightTile>
      )}

      {why.whenTheyStart.ok ? (
        <WhenTheyStartTile data={why.whenTheyStart.data} />
      ) : (
        <InsightTile icon={Clock} iconTone="gray" title="¿Cuándo empiezan el alta?">
          <TileError message={why.whenTheyStart.error} />
        </InsightTile>
      )}

      {why.channels.ok ? (
        <WhyChannelsTile data={why.channels.data} />
      ) : (
        <InsightTile icon={Compass} iconTone="gray" title="Canales de entrada">
          <TileError message={why.channels.error} />
        </InsightTile>
      )}

      <WhyReplaysTile
        replayUrl={replayUrl}
        replayIsPlaylist={replayIsPlaylist}
        worstStepLabel={worstStepLabel}
      />
    </div>
  );
}
