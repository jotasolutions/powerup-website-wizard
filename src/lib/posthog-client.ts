import posthog from "posthog-js";
import {
  clearPostHogStorage,
  decideAnalytics,
  readConsent,
  type AnalyticsDecision,
} from "./analytics-consent";
import { POSTHOG_EU_UI_HOST, resolveClientPostHogToken } from "./posthog-config";

type AppEnv = "production" | "preview" | "development";

const posthogAppEnv: AppEnv = (() => {
  const env = import.meta.env.VITE_VERCEL_ENV;
  if (env === "production" || env === "preview" || env === "development") return env;
  return "development";
})();

export function getClientPostHogToken(): string {
  if (typeof window === "undefined") return "";
  return resolveClientPostHogToken(
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN,
    window.location.hostname,
  );
}

/** PostHog está iniciado y capturando en esta página. */
export function isPostHogActive(): boolean {
  return posthog.__loaded && !posthog.has_opted_out_capturing();
}

export function startPostHog(): void {
  const token = getClientPostHogToken();
  if (!token) return;

  if (posthog.__loaded) {
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
    return;
  }

  posthog.init(token, {
    api_host: "/ingest",
    ui_host: POSTHOG_EU_UI_HOST,
    defaults: "2025-05-24",
    capture_exceptions: true,
    // Su cookie queda solo en el wizard, no en todo *.powerup.menu.
    cross_subdomain_cookie: false,
    // Si se retira el permiso, PostHog deja de guardar nada en el navegador.
    opt_out_persistence_by_default: true,
    debug: import.meta.env.DEV,
    loaded: (instance) => {
      instance.register({
        app_env: posthogAppEnv,
      });
    },
  });
}

export function stopPostHog(): void {
  if (posthog.__loaded) posthog.opt_out_capturing();
  clearPostHogStorage();
}

/**
 * Se llama al cargar el módulo raíz en el navegador, antes de que React pinte: si ya hay permiso,
 * PostHog arranca antes que la página y no se pierden los primeros eventos.
 */
export function bootAnalytics(): AnalyticsDecision {
  if (typeof window === "undefined") return "off";

  const consent = readConsent(document.cookie);
  const decision = decideAnalytics({
    token: getClientPostHogToken(),
    pathname: window.location.pathname,
    consent,
    isDev: import.meta.env.DEV,
  });

  if (decision === "on") startPostHog();
  else if (consent && !consent.analytics) clearPostHogStorage();
  return decision;
}
