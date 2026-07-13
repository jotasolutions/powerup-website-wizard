import { describe, expect, it, vi } from "vitest";
import { handleBrevoTransactionalWebhook } from "./brevo-webhook.server";
import * as dbServer from "./db-server";
import * as altaSlack from "./alta-slack.server";

vi.mock("./alta-slack.server", () => ({
  dispatchEmailBouncedNotification: vi.fn(),
}));

const sampleAlta = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  customerEmail: "bad@example.com",
  restaurantName: "Bar Test",
  contactName: "Test",
};

describe("handleBrevoTransactionalWebhook", () => {
  it("ignora eventos que no son rebote", async () => {
    const result = await handleBrevoTransactionalWebhook({
      event: "delivered",
      email: "a@b.com",
    });
    expect(result.status).toBe(200);
    expect(altaSlack.dispatchEmailBouncedNotification).not.toHaveBeenCalled();
  });

  it("marca rebote y avisa por Slack", async () => {
    vi.spyOn(dbServer, "findLatestPaidAltaByCustomerEmail").mockResolvedValue(
      sampleAlta as Awaited<ReturnType<typeof dbServer.findLatestPaidAltaByCustomerEmail>>,
    );
    vi.spyOn(dbServer, "markCustomerEmailBounced").mockResolvedValue(true);

    const result = await handleBrevoTransactionalWebhook({
      event: "hard_bounce",
      email: "bad@example.com",
      reason: "Mailbox not found",
      "message-id": "<test@smtp-relay>",
    });

    expect(result.status).toBe(200);
    expect(dbServer.markCustomerEmailBounced).toHaveBeenCalledWith(sampleAlta.id);
    expect(altaSlack.dispatchEmailBouncedNotification).toHaveBeenCalledWith(sampleAlta.id, {
      brevoEvent: "hard_bounce",
      reason: "Mailbox not found",
      messageId: "<test@smtp-relay>",
    });
  });
});
