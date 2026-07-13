import { dispatchEmailBouncedNotification } from "./alta-slack.server";
import {
  findLatestPaidAltaByCustomerEmail,
  markCustomerEmailBounced,
} from "./db-server";

const BOUNCE_EVENTS = new Set([
  "hard_bounce",
  "soft_bounce",
  "invalid_email",
  "blocked",
  "error",
]);

export type BrevoTransactionalWebhookPayload = {
  event?: string;
  email?: string;
  reason?: string;
  "message-id"?: string;
  date?: string;
};

export function isBrevoEmailBounceEvent(event: string | undefined): boolean {
  if (!event) return false;
  return BOUNCE_EVENTS.has(event.toLowerCase());
}

export async function handleBrevoTransactionalWebhook(
  payload: BrevoTransactionalWebhookPayload,
): Promise<{ status: number; body?: string }> {
  const event = payload.event?.toLowerCase();
  const email = payload.email?.trim();

  if (!isBrevoEmailBounceEvent(event) || !email) {
    return { status: 200, body: JSON.stringify({ received: true, ignored: true }) };
  }

  const alta = await findLatestPaidAltaByCustomerEmail(email);
  if (!alta) {
    console.warn(
      JSON.stringify({
        event: "brevo_bounce_no_alta",
        email,
        brevo_event: event,
      }),
    );
    return { status: 200, body: JSON.stringify({ received: true }) };
  }

  const marked = await markCustomerEmailBounced(alta.id);
  if (marked) {
    dispatchEmailBouncedNotification(alta.id, {
      brevoEvent: event ?? "unknown",
      reason: payload.reason ?? null,
      messageId: payload["message-id"] ?? null,
    });
  }

  return { status: 200, body: JSON.stringify({ received: true, alta_id: alta.id }) };
}
