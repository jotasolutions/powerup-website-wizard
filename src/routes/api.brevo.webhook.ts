import { createFileRoute } from "@tanstack/react-router";
import { getBrevoWebhookToken, hasBrevoWebhookConfig } from "@/lib/env.server";
import {
  handleBrevoTransactionalWebhook,
  type BrevoTransactionalWebhookPayload,
} from "@/lib/brevo-webhook.server";

function isAuthorizedBrevoWebhook(request: Request): boolean {
  const expected = getBrevoWebhookToken();
  if (!expected) return false;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const headerToken = request.headers.get("x-brevo-webhook-token");

  return queryToken === expected || headerToken === expected;
}

export const Route = createFileRoute("/api/brevo/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasBrevoWebhookConfig()) {
          return new Response(null, { status: 200 });
        }

        if (!isAuthorizedBrevoWebhook(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: BrevoTransactionalWebhookPayload;
        try {
          payload = (await request.json()) as BrevoTransactionalWebhookPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const result = await handleBrevoTransactionalWebhook(payload);
        return new Response(result.body ?? null, {
          status: result.status,
          headers: result.body ? { "content-type": "application/json" } : undefined,
        });
      },
    },
  },
});
