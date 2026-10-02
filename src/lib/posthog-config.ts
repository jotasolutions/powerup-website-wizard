// PostHog del wizard: proyecto UE 212884 (ver AGENTS.md).
//
// La clave del proyecto (phc_…) es pública por diseño: va dentro del JS que descarga cualquier
// visitante y solo sirve para enviar eventos. Se deja en el código para que producción no dependa
// de una variable en Vercel. Si VITE_PUBLIC_POSTHOG_PROJECT_TOKEN existe, tiene prioridad.

export const POSTHOG_PROJECT_TOKEN = "phc_AvtkDejoA5D8xNhdQ6vwV8TEWdynzXkcAzbmjoHqxvyi";

/** Host de ingestión UE (posthog-node en servidor; el navegador usa el proxy /ingest). */
export const POSTHOG_EU_INGEST_HOST = "https://eu.i.posthog.com";

/** App de PostHog UE (enlaces del toolbar). */
export const POSTHOG_EU_UI_HOST = "https://eu.posthog.com";

/** Único dominio donde el navegador usa la clave del código: ni local ni versiones de prueba. */
export const PRODUCTION_HOSTNAME = "alta-pagina-web.powerup.menu";

export function resolveClientPostHogToken(envToken: string | undefined, hostname: string): string {
  if (envToken) return envToken;
  return hostname === PRODUCTION_HOSTNAME ? POSTHOG_PROJECT_TOKEN : "";
}

export function resolveServerPostHogToken(
  envToken: string | undefined,
  vercelEnv: string | undefined,
): string | undefined {
  if (envToken) return envToken;
  return vercelEnv === "production" ? POSTHOG_PROJECT_TOKEN : undefined;
}
