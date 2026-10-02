import { createMiddleware, createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
  setResponseStatus,
} from "@tanstack/react-start/server";
import { z } from "zod";
import {
  PANEL_SESSION_COOKIE,
  PANEL_SESSION_MAX_AGE_SECONDS,
  createPanelSessionToken,
  isPanelSessionAuthorized,
  resolvePanelAuthConfig,
  verifyPanelPassword,
  type PanelAuthState,
} from "./panel-auth.server";

const WRONG_PASSWORD_DELAY_MS = 1000;

/** Protege las funciones del panel: sin sesión válida responden 401 sin tocar datos. */
export const requirePanelSession = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    if (!isPanelSessionAuthorized(getCookie(PANEL_SESSION_COOKIE))) {
      setResponseStatus(401);
      throw new Error("No autorizado");
    }
    return next();
  },
);

export type PanelSessionStatus = { state: PanelAuthState; authorized: boolean };

export const getPanelSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<PanelSessionStatus> => {
    const config = resolvePanelAuthConfig();
    return {
      state: config.state,
      authorized: isPanelSessionAuthorized(getCookie(PANEL_SESSION_COOKIE), config),
    };
  },
);

export const loginPanel = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; state: PanelAuthState }> => {
    const config = resolvePanelAuthConfig();
    if (config.state === "open") return { ok: true, state: config.state };
    if (config.state === "locked") return { ok: false, state: config.state };

    if (!verifyPanelPassword(data.password, config)) {
      await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
      return { ok: false, state: config.state };
    }

    setCookie(PANEL_SESSION_COOKIE, createPanelSessionToken(config), {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: PANEL_SESSION_MAX_AGE_SECONDS,
    });
    return { ok: true, state: config.state };
  });

export const logoutPanel = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(PANEL_SESSION_COOKIE, { path: "/" });
  return { ok: true as const };
});
