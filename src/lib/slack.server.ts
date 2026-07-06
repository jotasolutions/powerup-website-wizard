import { getSlackWebhookUrl } from "./env.server";

export type SlackMessagePayload = {
  text: string;
  blocks?: Record<string, unknown>[];
};

let warnedMissingSlack = false;

const SLACK_FETCH_TIMEOUT_MS = 5_000;

export async function sendSlackMessage(payload: SlackMessagePayload): Promise<void> {
  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    if (!warnedMissingSlack) {
      console.warn(
        JSON.stringify({
          event: "slack_config_missing",
          hint: "Set SLACK_WEBHOOK_URL in Vercel env (runtime) for lead/paid notifications",
        }),
      );
      warnedMissingSlack = true;
    }
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SLACK_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        JSON.stringify({
          event: "slack_send_failed",
          status: response.status,
          body: body.slice(0, 200),
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "slack_send_error",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Solo para tests: resetea flag de warning. */
export function resetSlackClientForTests(): void {
  warnedMissingSlack = false;
}
