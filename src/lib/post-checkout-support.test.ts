import { describe, expect, it } from "vitest";
import {
  buildPostCheckoutSupportWhatsAppMessage,
  buildPostCheckoutSupportWhatsAppUrl,
  postCheckoutContextFromAlta,
} from "./post-checkout-support";

const ctx = {
  alta_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  contact_name: "María",
  restaurant_name: "Bar La Plaza",
  restaurant_address: "Calle Mayor 1",
  whatsapp: "+34600111222",
  domain: "bar-la-plaza.powerup.menu",
  customer_email: "maria@example.com",
};

describe("buildPostCheckoutSupportWhatsAppMessage", () => {
  it("incluye contexto completo del alta para el equipo", () => {
    const text = buildPostCheckoutSupportWhatsAppMessage(ctx, "general");
    expect(text).toContain("Bar La Plaza");
    expect(text).toContain("María");
    expect(text).toContain("+34600111222");
    expect(text).toContain("maria@example.com");
    expect(text).toContain("bar-la-plaza.powerup.menu");
    expect(text).toContain(ctx.alta_id);
    expect(text).toContain("fotos, horarios, carta");
  });

  it("pide corregir email en intent wrong_email", () => {
    const text = buildPostCheckoutSupportWhatsAppMessage(ctx, "wrong_email");
    expect(text).toContain("no es correcto");
    expect(text).toContain("Mi email correcto es:");
  });
});

describe("postCheckoutContextFromAlta", () => {
  it("mapea fila de alta a contexto", () => {
    const mapped = postCheckoutContextFromAlta({
      id: ctx.alta_id,
      contactName: "María",
      restaurantName: "Bar La Plaza",
      restaurantAddress: "Calle Mayor 1",
      whatsapp: "+34600111222",
      domain: "bar-la-plaza.powerup.menu",
      customerEmail: "maria@example.com",
    });
    expect(mapped).toEqual(ctx);
  });
});

describe("buildPostCheckoutSupportWhatsAppUrl", () => {
  it("genera enlace wa.me", () => {
    const url = buildPostCheckoutSupportWhatsAppUrl(ctx, "general", "34651332202");
    expect(url).toContain("https://wa.me/34651332202");
    expect(decodeURIComponent(url)).toContain("Bar La Plaza");
  });
});
