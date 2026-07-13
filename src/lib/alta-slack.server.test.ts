import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAltaLeadSlackPayload,
  buildAltaPaidSlackPayload,
  notifyAltaLead,
  type AltaRow,
} from "./alta-slack.server";
import * as dbServer from "./db-server";
import { resetSlackClientForTests, sendSlackMessage } from "./slack.server";

vi.mock("./slack.server", async (importOriginal) => {
  const original = await importOriginal<typeof import("./slack.server")>();
  return {
    ...original,
    sendSlackMessage: vi.fn().mockResolvedValue(undefined),
  };
});

const sampleAlta: AltaRow = {
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
  status: "pending_payment",
  paidAt: null,
  checkoutStartedAt: null,
  customerEmail: null,
  opsStatus: null,
  domainRegisteredAt: null,
  deliveredAt: null,
  opsNotes: null,
  appEnv: "development",
  stripeSessionId: null,
  stripeSubscriptionId: null,
  stripeCustomerId: null,
};

describe("buildAltaLeadSlackPayload", () => {
  it("incluye datos clave del lead y enlace WhatsApp", () => {
    const payload = buildAltaLeadSlackPayload(sampleAlta);
    const text = payload.blocks?.[0]?.text as { text: string };

    expect(payload.text).toContain("Bar La Plaza");
    expect(text.text).toContain("Nuevo lead — pendiente de pago");
    expect(text.text).toContain("María García");
    expect(text.text).toContain("<https://wa.me/34600111222|+34600111222>");
    expect(text.text).toContain("barlaplaza.es");
    expect(text.text).toContain("Dominio personalizado + Plan Pro");
    expect(text.text).toContain(sampleAlta.id);
    expect(text.text).toContain("esperando pago en Stripe");
  });
});

describe("buildAltaPaidSlackPayload", () => {
  it("incluye datos de pago e IDs Stripe", () => {
    const paidAlta: AltaRow = {
      ...sampleAlta,
      status: "paid",
      stripeSessionId: "cs_test_123",
      stripeCustomerId: "cus_test_456",
      stripeSubscriptionId: "sub_test_789",
    };

    const payload = buildAltaPaidSlackPayload(paidAlta, "stripe_webhook");
    const text = payload.blocks?.[0]?.text as { text: string };

    expect(payload.text).toContain("Alta pagada");
    expect(text.text).toContain("Alta pagada");
    expect(text.text).toContain("stripe_webhook");
    expect(text.text).toContain("cs_test_123");
    expect(text.text).toContain("cus_test_456");
    expect(text.text).toContain("sub_test_789");
  });
});

describe("notifyAltaLead", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SLACK_WEBHOOK_URL;
    resetSlackClientForTests();
  });

  it("envía payload del lead vía sendSlackMessage", async () => {
    vi.spyOn(dbServer, "getAltaById").mockResolvedValue(sampleAlta);

    await notifyAltaLead(sampleAlta.id);

    expect(sendSlackMessage).toHaveBeenCalledOnce();
    expect(sendSlackMessage).toHaveBeenCalledWith(buildAltaLeadSlackPayload(sampleAlta));
  });
});
