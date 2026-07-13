import type { DashboardAppEnvFilter } from "./analytics-posthog.server";

/** En dev local los eventos PostHog llevan app_env=development; el panel debe verlos con "Todos". */
export function defaultAppEnvForPanel(isDev: boolean): DashboardAppEnvFilter {
  return isDev ? "all" : "production";
}

export function shouldShowDevProductionEnvBanner(
  isDev: boolean,
  appEnv: DashboardAppEnvFilter,
): boolean {
  return isDev && appEnv === "production";
}
