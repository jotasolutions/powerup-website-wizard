import type { altas } from "@/db/schema";
import {
  PLAN_PRO_ANUAL_DIAS_PRUEBA,
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  formatEUR,
} from "./alta-config";
import { amountDueToday, isPowerUpUpgrade } from "./checkout-scenario";
import type { AltaState } from "@/components/asistente/types";

export type AltaRow = typeof altas.$inferSelect;

export type CheckoutEmailVariant = "paid" | "trial" | "upgrade";

export type CheckoutEmailContent = {
  variant: CheckoutEmailVariant;
  subject: string;
  htmlContent: string;
  templateParams: Record<string, string>;
};

export type DeliveryEmailContent = {
  subject: string;
  htmlContent: string;
  templateParams: Record<string, string>;
};

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

export function resolveCheckoutEmailVariant(
  alta: AltaRow,
  amountPaidEur?: number | null,
): CheckoutEmailVariant {
  const checkoutState = altaRowToCheckoutState(alta);
  const amount =
    amountPaidEur != null && Number.isFinite(amountPaidEur)
      ? amountPaidEur
      : amountDueToday(checkoutState);

  if (amount > 0) return "paid";
  if (isPowerUpUpgrade(checkoutState)) return "upgrade";
  return "trial";
}

export function formatDomainNextStep(alta: AltaRow): string {
  const domain = alta.domain || "tu dominio";
  if (alta.hasExistingWebsite) {
    return "Diseñaremos y configuraremos tu nueva página web.";
  }
  if (alta.domainIsCustom) {
    return `Registraremos el dominio ${domain}.`;
  }
  return `Publicaremos tu web en ${domain}.`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEmailShell(params: {
  contactName: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px 24px;">
          <tr><td style="font-size:16px;line-height:1.6;">
            <p style="margin:0 0 16px;">Hola ${escapeHtml(params.contactName)},</p>
            ${params.bodyHtml}
            <p style="margin:24px 0 0;">Un saludo,<br><strong>Equipo PowerUp Menu</strong></p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderNextStepsBlock(lines: string[]): string {
  const items = lines.map((line) => `<li style="margin-bottom:8px;">${escapeHtml(line)}</li>`).join("");
  return `<p style="margin:20px 0 8px;font-weight:600;">Qué ocurrirá ahora</p>
<ul style="margin:0 0 16px;padding-left:20px;line-height:1.6;">${items}</ul>`;
}

export function buildCheckoutEmailContent(
  alta: AltaRow,
  params: {
    supportWhatsAppLink: string;
    amountPaidEur?: number | null;
  },
): CheckoutEmailContent {
  const variant = resolveCheckoutEmailVariant(alta, params.amountPaidEur);
  const domainStep = formatDomainNextStep(alta);
  const restaurantName = alta.restaurantName;
  const contactName = alta.contactName;
  const supportWhatsAppLink = params.supportWhatsAppLink;

  const commonParams = {
    contactName,
    restaurantName,
    domain: alta.domain ?? "",
    supportWhatsAppLink,
    domainNextStep: domainStep,
  };

  if (variant === "paid") {
    const checkoutState = altaRowToCheckoutState(alta);
    const amount =
      params.amountPaidEur != null && Number.isFinite(params.amountPaidEur)
        ? params.amountPaidEur
        : amountDueToday(checkoutState);
    const amountLabel = formatEUR(amount);

    const bodyHtml = `
<p style="margin:0 0 16px;">¡Todo listo! Hemos recibido tu pago de <strong>${escapeHtml(amountLabel)}</strong> y ya hemos empezado a preparar la página web de <strong>${escapeHtml(restaurantName)}</strong>.</p>
${renderNextStepsBlock([domainStep, "Diseñaremos y configuraremos tu página web.", "Te avisaremos por este mismo correo en cuanto esté publicada."])}
<p style="margin:0 0 16px;">No necesitas hacer nada. Nosotros nos encargamos de todo.</p>
<p style="margin:0 0 16px;">Si quieres que añadamos fotos, horarios, la carta o cualquier otro detalle, envíanoslo por WhatsApp cuando quieras:<br><a href="${escapeHtml(supportWhatsAppLink)}">Escribir por WhatsApp</a></p>
<p style="margin:0;">Gracias por confiar en PowerUp Menu.</p>`;

    return {
      variant,
      subject: `Hemos recibido tu pago. Ya estamos creando la web de ${restaurantName}.`,
      htmlContent: renderEmailShell({ contactName, bodyHtml }),
      templateParams: { ...commonParams, amount: amountLabel },
    };
  }

  if (variant === "upgrade") {
    const bodyHtml = `
<p style="margin:0 0 16px;">Ya hemos empezado a crear la página web de <strong>${escapeHtml(restaurantName)}</strong> para tu carta PowerUp.</p>
${renderNextStepsBlock([domainStep, "Te enviaremos otro correo en cuanto esté lista para que puedas verla."])}
<p style="margin:0 0 16px;">Mientras tanto, si quieres añadir fotos, horarios, la carta o cualquier otra información, solo tienes que enviárnosla por WhatsApp:<br><a href="${escapeHtml(supportWhatsAppLink)}">Escribir por WhatsApp</a></p>
<p style="margin:0;">Nos encargamos del resto.</p>`;

    return {
      variant,
      subject: `Ya estamos preparando la web de ${restaurantName}`,
      htmlContent: renderEmailShell({ contactName, bodyHtml }),
      templateParams: { ...commonParams, trialBlock: "" },
    };
  }

  const bodyHtml = `
<p style="margin:0 0 16px;">Ya hemos empezado a crear la página web de <strong>${escapeHtml(restaurantName)}</strong>.</p>
<p style="margin:0 0 16px;">Además, tu prueba gratuita de <strong>${PLAN_PRO_ANUAL_DIAS_PRUEBA} días</strong> ya está activa.</p>
${renderNextStepsBlock([domainStep, "Te enviaremos otro correo en cuanto esté lista para que puedas verla."])}
<p style="margin:0 0 16px;">Mientras tanto, si quieres añadir fotos, horarios, la carta o cualquier otra información, solo tienes que enviárnosla por WhatsApp:<br><a href="${escapeHtml(supportWhatsAppLink)}">Escribir por WhatsApp</a></p>
<p style="margin:0;">Nos encargamos del resto.</p>`;

  return {
    variant: "trial",
    subject: `Ya estamos preparando la web de ${restaurantName}`,
    htmlContent: renderEmailShell({ contactName, bodyHtml }),
    templateParams: {
      ...commonParams,
      trialDays: String(PLAN_PRO_ANUAL_DIAS_PRUEBA),
      trialBlock: `Tu prueba gratuita de ${PLAN_PRO_ANUAL_DIAS_PRUEBA} días ya está activa.`,
    },
  };
}

export function buildDeliveryTrialLine(alta: AltaRow): string | null {
  if (alta.powerupCustomer === "yes") return null;
  return `Recuerda: tu Plan Pro incluye ${PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba. Después se cobra automáticamente ${formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA con el método de pago que dejaste en Stripe.`;
}

export function buildSiteUrl(alta: AltaRow): string | null {
  if (!alta.domain) return null;
  return `https://${alta.domain}`;
}

export function buildDeliveryEmailContent(
  alta: AltaRow,
  params: { supportWhatsAppLink: string },
): DeliveryEmailContent | null {
  const pageUrl = buildSiteUrl(alta);
  if (!pageUrl) return null;

  const trialLine = buildDeliveryTrialLine(alta);
  const contactName = alta.contactName;
  const restaurantName = alta.restaurantName;
  const supportWhatsAppLink = params.supportWhatsAppLink;

  const trialHtml = trialLine
    ? `<p style="margin:16px 0 0;">${escapeHtml(trialLine)}</p>`
    : "";

  const bodyHtml = `
<p style="margin:0 0 16px;">¡Ya está lista!</p>
<p style="margin:0 0 16px;">La nueva página web de <strong>${escapeHtml(restaurantName)}</strong> ya está publicada:</p>
<p style="margin:0 0 16px;"><a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a></p>
<p style="margin:0 0 16px;">Échale un vistazo con tranquilidad.</p>
<p style="margin:0 0 16px;">Si quieres cambiar cualquier texto, foto o detalle, escríbenos por WhatsApp y lo actualizamos:<br><a href="${escapeHtml(supportWhatsAppLink)}">Escribir por WhatsApp</a></p>
<p style="margin:20px 0 8px;font-weight:600;">Un último paso</p>
<p style="margin:0 0 16px;">Añade esta web a tu ficha de Google Business y a tus redes sociales para que tus clientes puedan encontrarte más fácilmente.</p>
${trialHtml}
<p style="margin:16px 0 0;">Gracias por confiar en PowerUp Menu.</p>`;

  return {
    subject: `Tu web ya está publicada — ${restaurantName}`,
    htmlContent: renderEmailShell({ contactName, bodyHtml }),
    templateParams: {
      contactName,
      restaurantName,
      pageUrl,
      supportWhatsAppLink,
      trialLine: trialLine ?? "",
    },
  };
}

export function resolveCheckoutTemplateId(
  variant: CheckoutEmailVariant,
  templateIds: { paid?: number; trial?: number; upgrade?: number },
): number | undefined {
  if (variant === "paid") return templateIds.paid;
  if (variant === "upgrade") return templateIds.upgrade ?? templateIds.trial;
  return templateIds.trial;
}
