import { afterEach, describe, expect, it, vi } from "vitest";
import { resetSlackClientForTests, sendSlackMessage } from "./slack.server";

describe("sendSlackMessage", () => {
  afterEach(() => {
    delete process.env.SLACK_WEBHOOK_URL;
    resetSlackClientForTests();
    vi.restoreAllMocks();
  });

  it("no llama a fetch si falta SLACK_WEBHOOK_URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sendSlackMessage({ text: "test" });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
    expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({
      event: "slack_config_missing",
    });
  });

  it("envía POST al webhook cuando está configurado", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T/B/x";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));

    await sendSlackMessage({ text: "Hola Slack" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/T/B/x",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "Hola Slack" }),
      }),
    );
  });
});
