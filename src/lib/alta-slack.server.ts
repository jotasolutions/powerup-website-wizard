import type { AltaState } from "@/components/asistente/types";
import { altas } from "@/db/schema";
import {
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  formatEUR,
} from "./alta-config";
import {
  amountDueToday,
  annualPlanLabel,
  getCheckoutScenario,
  todayPaymentSubtitle,
  type CheckoutScenario,
} from "./checkout-scenario";
import { getAltaById } from "./db-server";
import { sendSlackMessage, type SlackMessagePayload } from "./slack.server";

export type AltaRow = typeof altas.$inferSelect;

export type AltaPaidNotificationSource = "stripe_webhook" | "finalize_checkout" | "mock_checkout";

function normalizeWhatsappDigits(whatsapp: string): string {
  return whatsapp.replace(/\D/g, "");
}

function formatWhatsappLink(whatsapp: string): string {
  const digits = normalizeWhatsappDigits(whatsapp);
  return digits ? `<https://wa.me/${digits}|${whatsapp}>` : whatsapp;
}

function formatPowerUpCustomerLabel(powerupCustomer: AltaRow["powerupCustomer"]): string {
  switch (powerupCustomer) {
    case "yes":
      return "Cliente carta PowerUp (upgrade)";
    case "no":
      return "Cliente nuevo";
    default:
      return "Tipo de cliente desconocido";
  }
}

function formatCheckoutScenarioLabel(scenario: CheckoutScenario): string {
  switch (scenario) {
    case "trial_free":
      return "Prueba gratis (Plan Pro)";
    case "custom_domain":
      return "Dominio personalizado + Plan Pro";
    case "management_fee":
      return "Fee de gestión web + Plan Pro";
  }
}

function formatDomainLine(alta: AltaRow): string {
  if (alta.hasExistingWebsite) {
    return `Web actual: ${alta.existingWebsiteUrl || "—"}`;
  }
  const domain = alta.domain || "—";
  return alta.domainIsCustom ? `Dominio: ${domain} (personalizado)` : `Dominio: ${domain} (subdominio PowerUp)`;
}

function altaRowToCheckoutState(alta: AltaRow): AltaState {
  const onetimeFeeAmount =
    alta.onetimeFeeAmount != null ? Number(alta.onetimeFeeAmount) : null;

  return {
    restaurant_name: alta.restaurantName,
    restaurant_address: alta.restaurantAddress ?? "",
    gmb_place_id: alta.gmbPlaceId,
    place_profile: null,
    enrichment_status: "idle",
    powerup_customer: alta.powerupCustomer,
    has_existing_website: alta.hasExistingWebsite,
    existing_website_url: alta.existingWebsiteUrl ?? "",
    wants_custom_domain: alta.wantsCustomDomain,
    domain: alta.domain ?? "",
    domain_is_custom: alta.domainIsCustom,
    domain_price: alta.onetimeFeeConcept === "dominio" ? onetimeFeeAmount : null,
    domain_initial_choice: alta.domainInitialChoice,
    contact_name: alta.contactName,
    whatsapp: alta.whatsapp,
  };
}

function buildCommonFields(alta: AltaRow): string[] {
  const checkoutState = altaRowToCheckoutState(alta);
  const scenario = getCheckoutScenario(checkoutState);

  return [
    `*Contacto:* ${alta.contactName}`,
    `*WhatsApp:* ${formatWhatsappLink(alta.whatsapp)}`,
    `*Restaurante:* ${alta.restaurantName}`,
    `*Dirección:* ${alta.restaurantAddress || "—"}`,
    formatDomainLine(alta),
    `*Tipo cliente:* ${formatPowerUpCustomerLabel(alta.powerupCustomer)}`,
    `*Escenario:* ${formatCheckoutScenarioLabel(scenario)}`,
    `*Pago hoy:* ${formatEUR(amountDueToday(checkoutState))}`,
    `*Plan anual:* ${annualPlanLabel(checkoutState)}`,
    `*Detalle:* ${todayPaymentSubtitle(checkoutState)}`,
    `*alta_id:* \`${alta.id}\``,
  ];
}

export function buildAltaLeadSlackPayload(alta: AltaRow): SlackMessagePayload {
  const lines = [
    "*Nuevo lead — pendiente de pago*",
    "",
    ...buildCommonFields(alta),
    "",
    "_Estado: esperando pago en Stripe_",
  ];

  return {
    text: `Nuevo lead — ${alta.restaurantName} (${alta.contactName})`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: lines.join("\n") },
      },
    ],
  };
}

export function buildAltaPaidSlackPayload(
  alta: AltaRow,
  source: AltaPaidNotificationSource,
): SlackMessagePayload {
  const stripeLines = [
    alta.stripeSessionId ? `*Stripe session:* \`${alta.stripeSessionId}\`` : null,
    alta.stripeCustomerId ? `*Stripe customer:* \`${alta.stripeCustomerId}\`` : null,
    alta.stripeSubscriptionId ? `*Stripe subscription:* \`${alta.stripeSubscriptionId}\`` : null,
  ].filter((line): line is string => line != null);

  const lines = [
    "*Alta pagada*",
    "",
    ...buildCommonFields(alta),
    "",
    `*Fuente:* ${source}`,
    ...stripeLines,
    "",
    `_Plan Pro anual de referencia: ${formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA_`,
  ];

  return {
    text: `Alta pagada — ${alta.restaurantName} (${alta.contactName})`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: lines.join("\n") },
      },
    ],
  };
}

export async function notifyAltaLead(altaId: string): Promise<void> {
  const alta = await getAltaById(altaId);
  if (!alta) {
    console.error(JSON.stringify({ event: "slack_notify_lead_no_alta", alta_id: altaId }));
    return;
  }

  await sendSlackMessage(buildAltaLeadSlackPayload(alta));
}

export async function notifyAltaPaid(
  altaId: string,
  source: AltaPaidNotificationSource,
): Promise<void> {
  const alta = await getAltaById(altaId);
  if (!alta) {
    console.error(JSON.stringify({ event: "slack_notify_paid_no_alta", alta_id: altaId }));
    return;
  }

  await sendSlackMessage(buildAltaPaidSlackPayload(alta, source));
}

export function dispatchAltaLeadNotification(altaId: string): void {
  void notifyAltaLead(altaId).catch((error) => {
    console.error(
      JSON.stringify({
        event: "slack_notify_lead_failed",
        alta_id: altaId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}

export function dispatchAltaPaidNotification(
  altaId: string,
  source: AltaPaidNotificationSource,
): void {
  void notifyAltaPaid(altaId, source).catch((error) => {
    console.error(
      JSON.stringify({
        event: "slack_notify_paid_failed",
        alta_id: altaId,
        source,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}

export function buildEmailBouncedSlackPayload(
  alta: AltaRow,
  details: { brevoEvent: string; reason: string | null; messageId: string | null },
): SlackMessagePayload {
  const lines = [
    "*Email rebotó — contactar por WhatsApp*",
    "",
    `*Email Stripe:* ${alta.customerEmail || "—"}`,
    `*Evento Brevo:* ${details.brevoEvent}`,
    details.reason ? `*Motivo:* ${details.reason}` : null,
    details.messageId ? `*Message ID:* \`${details.messageId}\`` : null,
    "",
    ...buildCommonFields(alta),
    "",
    "_El cliente no recibirá correos. Usad el WhatsApp del alta para ayudarle._",
  ].filter((line): line is string => line != null);

  return {
    text: `Email rebotó — ${alta.restaurantName} (${alta.contactName})`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: lines.join("\n") },
      },
    ],
  };
}

export async function notifyEmailBounced(
  altaId: string,
  details: { brevoEvent: string; reason: string | null; messageId: string | null },
): Promise<void> {
  const alta = await getAltaById(altaId);
  if (!alta) {
    console.error(JSON.stringify({ event: "slack_notify_bounce_no_alta", alta_id: altaId }));
    return;
  }

  await sendSlackMessage(buildEmailBouncedSlackPayload(alta, details));
}

export function dispatchEmailBouncedNotification(
  altaId: string,
  details: { brevoEvent: string; reason: string | null; messageId: string | null },
): void {
  void notifyEmailBounced(altaId, details).catch((error) => {
    console.error(
      JSON.stringify({
        event: "slack_notify_bounce_failed",
        alta_id: altaId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}
