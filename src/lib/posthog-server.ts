import { PostHog } from "posthog-node";

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

export function getPostHogClient(): PostHog | null {
  const token = getPostHogToken();
  if (!token) {
    if (!warnedMissingConfig) {
      console.warn(
        JSON.stringify({
          event: "posthog_server_config_missing",
          hint: "Set VITE_PUBLIC_POSTHOG_PROJECT_TOKEN in Vercel env (all environments / runtime)",
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

/** Solo para tests: resetea singleton y flag de warning. */
export function resetPostHogClientForTests(): void {
  posthogClient = null;
  warnedMissingConfig = false;
}
