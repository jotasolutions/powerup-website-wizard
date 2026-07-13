/** Contexto post-checkout para WhatsApp de soporte (cliente → equipo). */
export type PostCheckoutSupportContext = {
  alta_id: string;
  contact_name: string;
  restaurant_name: string;
  restaurant_address?: string | null;
  whatsapp: string;
  domain?: string | null;
  customer_email?: string | null;
};

export type PostCheckoutWhatsAppIntent = "general" | "wrong_email";

function formatDomainLine(ctx: PostCheckoutSupportContext): string {
  return `Dominio: ${ctx.domain || "—"}`;
}

export function buildPostCheckoutSupportWhatsAppMessage(
  ctx: PostCheckoutSupportContext,
  intent: PostCheckoutWhatsAppIntent = "general",
): string {
  const lines = [
    "Hola, acabo de completar el alta y el pago de mi página web.",
    "",
    `Restaurante: ${ctx.restaurant_name}`,
    `Contacto: ${ctx.contact_name}`,
    `WhatsApp: ${ctx.whatsapp}`,
    `Email (pago Stripe): ${ctx.customer_email || "—"}`,
    formatDomainLine(ctx),
    ctx.restaurant_address ? `Dirección: ${ctx.restaurant_address}` : null,
    `Referencia: ${ctx.alta_id}`,
    "",
  ].filter((line): line is string => line != null);

  if (intent === "wrong_email") {
    lines.push(
      "El email que puse en el pago no es correcto.",
      "Mi email correcto es: ",
    );
  } else {
    lines.push(
      "Me gustaría añadir fotos, horarios, carta u otros detalles (o hacer una consulta).",
    );
  }

  return lines.join("\n");
}

export function buildPostCheckoutSupportWhatsAppUrl(
  ctx: PostCheckoutSupportContext,
  intent: PostCheckoutWhatsAppIntent,
  supportWhatsappE164: string,
): string {
  const text = buildPostCheckoutSupportWhatsAppMessage(ctx, intent);
  return `https://wa.me/${supportWhatsappE164}?text=${encodeURIComponent(text)}`;
}

export function postCheckoutContextFromAlta(alta: {
  id: string;
  contactName: string;
  restaurantName: string;
  restaurantAddress: string | null;
  whatsapp: string;
  domain: string | null;
  customerEmail: string | null;
}): PostCheckoutSupportContext {
  return {
    alta_id: alta.id,
    contact_name: alta.contactName,
    restaurant_name: alta.restaurantName,
    restaurant_address: alta.restaurantAddress,
    whatsapp: alta.whatsapp,
    domain: alta.domain,
    customer_email: alta.customerEmail,
  };
}
