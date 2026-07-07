import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captureServerEvent,
  getPostHogClient,
  getServerAppEnv,
  getPostHogToken,
  resetPostHogClientForTests,
} from "./posthog-server";

const ENV_TOKEN = "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN";
const ENV_HOST = "VITE_PUBLIC_POSTHOG_HOST";
const ENV_VERCEL = "VERCEL_ENV";

describe("getPostHogClient", () => {
  let originalImportToken: string | undefined;
  let originalImportHost: string | undefined;

  afterEach(() => {
    delete process.env[ENV_TOKEN];
    delete process.env[ENV_HOST];
    delete process.env[ENV_VERCEL];
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN = originalImportToken;
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST = originalImportHost;
    resetPostHogClientForTests();
    vi.restoreAllMocks();
  });

  it("devuelve null y avisa si falta el token", () => {
    originalImportToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
    originalImportHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN = "";
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST = "";
    process.env[ENV_TOKEN] = "";
    delete process.env[ENV_HOST];

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getPostHogClient()).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({
      event: "posthog_server_config_missing",
    });
  });

  it("crea cliente cuando el token solo está en process.env (runtime serverless)", () => {
    originalImportToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
    originalImportHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN = "";
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST = "";

    process.env[ENV_TOKEN] = "phc_test_runtime_token";
    process.env[ENV_HOST] = "https://eu.i.posthog.com";

    const client = getPostHogClient();
    expect(client).not.toBeNull();
    expect(getPostHogToken()).toBe("phc_test_runtime_token");
  });

  it("normaliza app_env del servidor con fallback development", () => {
    process.env[ENV_VERCEL] = "preview";
    expect(getServerAppEnv()).toBe("preview");

    process.env[ENV_VERCEL] = "otro";
    expect(getServerAppEnv()).toBe("development");

    delete process.env[ENV_VERCEL];
    expect(getServerAppEnv()).toBe("development");
  });

  it("captureServerEvent añade app_env en properties", () => {
    originalImportToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
    originalImportHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN = "";
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST = "";
    process.env[ENV_TOKEN] = "phc_test_runtime_token";
    process.env[ENV_HOST] = "https://eu.i.posthog.com";
    process.env[ENV_VERCEL] = "preview";

    const client = getPostHogClient();
    expect(client).not.toBeNull();
    const captureSpy = vi.spyOn(client!, "capture").mockImplementation(() => undefined as never);

    captureServerEvent({
      distinctId: "alta-1",
      event: "alta_lead_saved",
      properties: { foo: "bar" },
    });

    expect(captureSpy).toHaveBeenCalledOnce();
    expect(captureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "alta-1",
        event: "alta_lead_saved",
        properties: expect.objectContaining({
          foo: "bar",
          app_env: "preview",
        }),
      }),
    );
  });
});
