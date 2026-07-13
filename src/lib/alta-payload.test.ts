import { describe, expect, it } from "vitest";
import { initialAlta } from "@/components/asistente/types";
import { TERMS_AND_PRIVACY_URL, TERMS_VERSION } from "./alta-config";
import { buildAltaPayload } from "./alta-payload";

describe("buildAltaPayload", () => {
  it("incluye campos de consentimiento para saveAlta", () => {
    const payload = buildAltaPayload(
      {
        ...initialAlta,
        restaurant_name: "Bar Test",
        domain: "bar-test.powerup.menu",
      },
      {
        contact_name: "María",
        whatsapp: "+34 600 000 000",
        consent_user_agent: "Mozilla/5.0 Test",
      },
    );

    expect(payload.terms_version).toBe(TERMS_VERSION);
    expect(payload.terms_document_url).toBe(TERMS_AND_PRIVACY_URL);
    expect(payload.consent_user_agent).toBe("Mozilla/5.0 Test");
    expect(payload.contact_name).toBe("María");
    expect(payload.whatsapp).toBe("+34 600 000 000");
  });

  it("onetime_fee cuando dominio custom", () => {
    const payload = buildAltaPayload(
      {
        ...initialAlta,
        restaurant_name: "Test",
        domain: "test.es",
        domain_is_custom: true,
        domain_price: 14.9,
        domain_initial_choice: "paid",
      },
      { contact_name: "A", whatsapp: "+34 611111111" },
    );
    expect(payload.onetime_fee_concept).toBe("dominio");
    expect(payload.onetime_fee_amount).toBe(14.9);
    expect(payload.domain_downgraded).toBe(false);
  });

  it("marca downgrade cuando eligió pago y acabó en gratis", () => {
    const payload = buildAltaPayload(
      {
        ...initialAlta,
        restaurant_name: "Test",
        domain: "test.powerup.menu",
        domain_is_custom: false,
        domain_initial_choice: "paid",
        wants_custom_domain: false,
      },
      { contact_name: "A", whatsapp: "+34 611111111" },
    );
    expect(payload.domain_downgraded).toBe(true);
    expect(payload.domain_initial_choice).toBe("paid");
  });
});
