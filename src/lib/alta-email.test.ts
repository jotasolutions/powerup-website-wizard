import { describe, expect, it } from "vitest";
import type { AltaRow } from "./alta-email";
import {
  buildCheckoutEmailContent,
  buildDeliveryEmailContent,
  buildDeliveryTrialLine,
  buildPostCheckoutSupportWhatsAppUrl,
  formatDomainNextStep,
  resolveCheckoutEmailVariant,
  resolveCheckoutTemplateId,
} from "./alta-email";

const baseAlta: AltaRow = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  createdAt: new Date("2026-07-03T10:00:00.000Z"),
  restaurantName: "Bar La Plaza",
  restaurantAddress: "Calle Mayor 1, Madrid",
  gmbPlaceId: "ChIJtest",
  hasExistingWebsite: false,
  existingWebsiteUrl: null,
  wantsCustomDomain: true,
  domain: "barlaplaza.es",
  domainIsCustom: true,
  domainInitialChoice: "paid",
  domainDowngraded: false,
  powerupCustomer: "no",
  onetimeFeeConcept: "dominio",
  onetimeFeeAmount: "14.90",
  contactName: "María García",
  whatsapp: "+34600111222",
  termsAcceptedAt: new Date("2026-07-03T10:00:00.000Z"),
  termsVersion: "2026-06",
  termsDocumentUrl: "https://powerup.menu/legal",
  consentUserAgent: "Mozilla/5.0",
  consentIp: "127.0.0.1",
  status: "paid",
  paidAt: new Date("2026-07-03T11:00:00.000Z"),
  checkoutStartedAt: new Date("2026-07-03T10:30:00.000Z"),
  customerEmail: "maria@example.com",
  checkoutEmailSentAt: null,
  deliveryEmailSentAt: null,
  customerEmailBouncedAt: null,
  opsStatus: null,
  domainRegisteredAt: null,
  deliveredAt: null,
  opsNotes: null,
  waOpenedAt: null,
  appEnv: "development",
  stripeSessionId: "cs_test_123",
  stripeSubscriptionId: "sub_test_789",
  stripeCustomerId: "cus_test_456",
};

const supportLink = "https://wa.me/34651332202?text=hola";

describe("resolveCheckoutEmailVariant", () => {
  it("usa paid cuando hay importe hoy", () => {
    expect(resolveCheckoutEmailVariant(baseAlta)).toBe("paid");
  });

  it("usa trial en subdominio gratis sin pago hoy", () => {
    const alta: AltaRow = {
      ...baseAlta,
      domain: "bar-la-plaza.powerup.menu",
      domainIsCustom: false,
      onetimeFeeConcept: null,
      onetimeFeeAmount: null,
    };
    expect(resolveCheckoutEmailVariant(alta)).toBe("trial");
  });

  it("usa upgrade para cliente carta sin pago hoy", () => {
    const alta: AltaRow = {
      ...baseAlta,
      powerupCustomer: "yes",
      domain: "bar-la-plaza.powerup.menu",
      domainIsCustom: false,
      onetimeFeeConcept: null,
      onetimeFeeAmount: null,
    };
    expect(resolveCheckoutEmailVariant(alta)).toBe("upgrade");
  });
});

describe("formatDomainNextStep", () => {
  it("menciona registro para dominio personalizado", () => {
    expect(formatDomainNextStep(baseAlta)).toContain("Registraremos el dominio barlaplaza.es");
  });

  it("menciona publicación para subdominio", () => {
    const alta: AltaRow = {
      ...baseAlta,
      domain: "bar-la-plaza.powerup.menu",
      domainIsCustom: false,
    };
    expect(formatDomainNextStep(alta)).toContain("Publicaremos tu web en bar-la-plaza.powerup.menu");
  });
});

describe("buildCheckoutEmailContent", () => {
  it("genera asunto de pago recibido para variante paid", () => {
    const content = buildCheckoutEmailContent(baseAlta, { supportWhatsAppLink: supportLink });
    expect(content.variant).toBe("paid");
    expect(content.subject).toContain("Hemos recibido tu pago");
    expect(content.htmlContent).toContain("14,90");
    expect(content.templateParams.amount).toBeTruthy();
  });

  it("genera asunto de prueba para variante trial", () => {
    const alta: AltaRow = {
      ...baseAlta,
      domain: "bar-la-plaza.powerup.menu",
      domainIsCustom: false,
      onetimeFeeConcept: null,
      onetimeFeeAmount: null,
    };
    const content = buildCheckoutEmailContent(alta, { supportWhatsAppLink: supportLink });
    expect(content.variant).toBe("trial");
    expect(content.subject).toContain("Ya estamos preparando la web");
    expect(content.htmlContent).toContain("30 días");
  });
});

describe("buildDeliveryEmailContent", () => {
  it("incluye URL y trial line para cliente nuevo", () => {
    const content = buildDeliveryEmailContent(baseAlta, { supportWhatsAppLink: supportLink });
    expect(content).not.toBeNull();
    expect(content?.subject).toContain("publicada");
    expect(content?.templateParams.pageUrl).toBe("https://barlaplaza.es");
    expect(buildDeliveryTrialLine(baseAlta)).toContain("30 días");
  });

  it("omite trial line para upgrade carta", () => {
    const alta: AltaRow = { ...baseAlta, powerupCustomer: "yes" };
    expect(buildDeliveryTrialLine(alta)).toBeNull();
    const content = buildDeliveryEmailContent(alta, { supportWhatsAppLink: supportLink });
    expect(content?.templateParams.trialLine).toBe("");
  });

  it("devuelve null sin dominio", () => {
    const alta: AltaRow = { ...baseAlta, domain: null };
    expect(buildDeliveryEmailContent(alta, { supportWhatsAppLink: supportLink })).toBeNull();
  });
});

describe("resolveCheckoutTemplateId", () => {
  it("mapea variantes a plantillas", () => {
    expect(
      resolveCheckoutTemplateId("paid", { paid: 10, trial: 20, upgrade: 30 }),
    ).toBe(10);
    expect(
      resolveCheckoutTemplateId("trial", { paid: 10, trial: 20, upgrade: 30 }),
    ).toBe(20);
    expect(
      resolveCheckoutTemplateId("upgrade", { paid: 10, trial: 20, upgrade: 30 }),
    ).toBe(30);
    expect(
      resolveCheckoutTemplateId("upgrade", { paid: 10, trial: 20 }),
    ).toBe(20);
  });
});
