import {
  getBrevoDevOverrideEmail,
  getBrevoTemplateCheckoutPaid,
  getBrevoTemplateCheckoutTrial,
  getBrevoTemplateCheckoutUpgrade,
  getBrevoTemplateSiteDelivered,
  getSupportWhatsappE164,
} from "./env.server";
import { claimCheckoutEmailSend, claimDeliveryEmailSend, getAltaById } from "./db-server";
import { sendBrevoTransactionalEmail } from "./brevo.server";
import {
  buildCheckoutEmailContent,
  buildDeliveryEmailContent,
  resolveCheckoutTemplateId,
  type AltaRow,
} from "./alta-email";
import {
  buildPostCheckoutSupportWhatsAppUrl,
  postCheckoutContextFromAlta,
} from "./post-checkout-support";

function resolveRecipientEmail(customerEmail: string | null): string | null {
  const override = getBrevoDevOverrideEmail();
  if (override) return override;
  return customerEmail;
}

function supportWhatsAppLinkForAlta(alta: AltaRow): string {
  const ctx = postCheckoutContextFromAlta(alta);
  return buildPostCheckoutSupportWhatsAppUrl(ctx, "general", getSupportWhatsappE164());
}

export async function sendCheckoutConfirmationEmail(
  altaId: string,
  amountPaidEur?: number | null,
): Promise<void> {
  const alta = await getAltaById(altaId);
  if (!alta) {
    console.error(JSON.stringify({ event: "checkout_email_no_alta", alta_id: altaId }));
    return;
  }

  const recipient = resolveRecipientEmail(alta.customerEmail);
  if (!recipient) {
    console.warn(
      JSON.stringify({
        event: "checkout_email_skipped_no_address",
        alta_id: altaId,
      }),
    );
    return;
  }

  const alreadySent = alta.checkoutEmailSentAt != null;
  if (alreadySent) {
    return;
  }

  const supportWhatsAppLink = supportWhatsAppLinkForAlta(alta);

  const content = buildCheckoutEmailContent(alta, {
    supportWhatsAppLink,
    amountPaidEur,
  });

  const templateId = resolveCheckoutTemplateId(content.variant, {
    paid: getBrevoTemplateCheckoutPaid(),
    trial: getBrevoTemplateCheckoutTrial(),
    upgrade: getBrevoTemplateCheckoutUpgrade(),
  });

  const sent = await sendBrevoTransactionalEmail({
    to: recipient,
    subject: content.subject,
    htmlContent: content.htmlContent,
    templateId,
    templateParams: content.templateParams,
  });

  if (sent) {
    await claimCheckoutEmailSend(altaId);
  }
}

export async function sendSiteDeliveredEmail(altaId: string): Promise<void> {
  const alta = await getAltaById(altaId);
  if (!alta) {
    console.error(JSON.stringify({ event: "delivery_email_no_alta", alta_id: altaId }));
    return;
  }

  const recipient = resolveRecipientEmail(alta.customerEmail);
  if (!recipient) {
    console.warn(
      JSON.stringify({
        event: "delivery_email_skipped_no_address",
        alta_id: altaId,
      }),
    );
    return;
  }

  const supportWhatsAppLink = supportWhatsAppLinkForAlta(alta);

  const content = buildDeliveryEmailContent(alta, { supportWhatsAppLink });
  if (!content) {
    console.warn(
      JSON.stringify({
        event: "delivery_email_skipped_no_domain",
        alta_id: altaId,
      }),
    );
    return;
  }

  if (alta.deliveryEmailSentAt != null) {
    return;
  }

  const sent = await sendBrevoTransactionalEmail({
    to: recipient,
    subject: content.subject,
    htmlContent: content.htmlContent,
    templateId: getBrevoTemplateSiteDelivered(),
    templateParams: content.templateParams,
  });

  if (sent) {
    await claimDeliveryEmailSend(altaId);
  }
}

export function dispatchCheckoutConfirmationEmail(
  altaId: string,
  amountPaidEur?: number | null,
): void {
  void sendCheckoutConfirmationEmail(altaId, amountPaidEur).catch((error) => {
    console.error(
      JSON.stringify({
        event: "checkout_email_failed",
        alta_id: altaId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}

export function dispatchSiteDeliveredEmail(altaId: string): void {
  void sendSiteDeliveredEmail(altaId).catch((error) => {
    console.error(
      JSON.stringify({
        event: "delivery_email_failed",
        alta_id: altaId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}
