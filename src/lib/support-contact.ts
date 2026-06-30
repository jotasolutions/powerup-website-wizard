import type { AltaState } from "@/components/asistente/types";
import { formatSupportBusinessLabel } from "./alta-copy";

const DEFAULT_SUPPORT_WHATSAPP_E164 = "34651332202";

export function getSupportWhatsappE164(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPPORT_WHATSAPP) {
    return String(import.meta.env.VITE_SUPPORT_WHATSAPP).replace(/\D/g, "");
  }
  return DEFAULT_SUPPORT_WHATSAPP_E164;
}

export function buildSupportWhatsAppMessage(alta: AltaState): string {
  const domainLine = alta.has_existing_website
    ? `Web actual: ${alta.existing_website_url || "—"}`
    : `Dominio elegido: ${alta.domain || "—"}`;

  return `Hola, necesito ayuda con el alta de mi página web.

${formatSupportBusinessLabel()}: ${alta.restaurant_name}
Dirección: ${alta.restaurant_address || "—"}
${domainLine}

Vengo del asistente de alta y me gustaría orientación antes de pagar.`;
}

export function buildSupportWhatsAppUrl(alta: AltaState): string {
  const text = buildSupportWhatsAppMessage(alta);
  return `https://wa.me/${getSupportWhatsappE164()}?text=${encodeURIComponent(text)}`;
}
