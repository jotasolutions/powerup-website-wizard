import { PostHog } from "posthog-node";
import { envConfigHint } from "./env.server";

let posthogClient: PostHog | null = null;
let warnedMissingConfig = false;

export function getPostHogToken(): string | undefined {
  return (
    process.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ||
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
  );
}

export function getPostHogHost(): string | undefined {
  return process.env.VITE_PUBLIC_POSTHOG_HOST || import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
}

type AppEnv = "production" | "preview" | "development";

function normalizeAppEnv(value: string | undefined): AppEnv {
  if (value === "production" || value === "preview" || value === "development") {
    return value;
  }
  return "development";
}

export function getServerAppEnv(): AppEnv {
  return normalizeAppEnv(process.env.VERCEL_ENV);
}

export function getPostHogClient(): PostHog | null {
  const token = getPostHogToken();
  if (!token) {
    if (!warnedMissingConfig) {
      console.warn(
        JSON.stringify({
          event: "posthog_server_config_missing",
          hint: envConfigHint("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"),
        }),
      );
      warnedMissingConfig = true;
    }
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host: getPostHogHost(),
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

export function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): void {
  const posthog = getPostHogClient();
  if (!posthog) return;

  posthog.capture({
    distinctId: params.distinctId,
    event: params.event,
    properties: {
      ...(params.properties ?? {}),
      app_env: getServerAppEnv(),
    },
  });
}

/** Solo para tests: resetea singleton y flag de warning. */
export function resetPostHogClientForTests(): void {
  posthogClient = null;
  warnedMissingConfig = false;
}
