import { describe, expect, it } from "vitest";
import {
  PANEL_PASSWORD_FINGERPRINT,
  PANEL_SESSION_MAX_AGE_SECONDS,
  createPanelPasswordFingerprint,
  createPanelSessionToken,
  isPanelSessionAuthorized,
  parsePanelPasswordFingerprint,
  readCookie,
  resolvePanelAuthConfig,
  verifyPanelPassword,
  verifyPanelSessionToken,
} from "./panel-auth.server";

const PASSWORD = "contraseña-de-prueba-del-panel";
const DB_URL = "postgresql://user:pass@example.neon.tech/db?sslmode=require";
const FINGERPRINT = createPanelPasswordFingerprint(PASSWORD, Buffer.alloc(16, 7), 1024);

function deployedEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    VERCEL_ENV: "production",
    DATABASE_URL: DB_URL,
    INTERNAL_ANALYTICS_PANEL_PASSWORD_HASH: FINGERPRINT,
    ...overrides,
  };
}

describe("huella de la contraseña", () => {
  it("la huella del código es válida", () => {
    expect(parsePanelPasswordFingerprint(PANEL_PASSWORD_FINGERPRINT)).not.toBeNull();
  });

  it("acepta la contraseña correcta y rechaza las demás", () => {
    const config = resolvePanelAuthConfig(deployedEnv());
    expect(config.state).toBe("required");
    expect(verifyPanelPassword(PASSWORD, config)).toBe(true);
    expect(verifyPanelPassword(`${PASSWORD}x`, config)).toBe(false);
    expect(verifyPanelPassword("", config)).toBe(false);
  });

  it("rechaza huellas mal formadas", () => {
    expect(parsePanelPasswordFingerprint("")).toBeNull();
    expect(parsePanelPasswordFingerprint("scrypt$1024$8$1$c2FsdA$aGFzaA")).toBeNull();
    expect(parsePanelPasswordFingerprint("bcrypt$x")).toBeNull();
  });
});

describe("resolvePanelAuthConfig", () => {
  it("en local, sin despliegue, el panel sigue abierto", () => {
    expect(resolvePanelAuthConfig({}).state).toBe("open");
    expect(isPanelSessionAuthorized(undefined, resolvePanelAuthConfig({}))).toBe(true);
  });

  it("desplegado sin secreto de servidor o sin huella válida, queda cerrado", () => {
    expect(resolvePanelAuthConfig(deployedEnv({ DATABASE_URL: undefined })).state).toBe("locked");
    expect(
      resolvePanelAuthConfig(deployedEnv({ INTERNAL_ANALYTICS_PANEL_PASSWORD_HASH: "roto" })).state,
    ).toBe("locked");
  });

  it("acepta los otros nombres de la conexión a Neon", () => {
    const config = resolvePanelAuthConfig(
      deployedEnv({ DATABASE_URL: undefined, POSTGRES_URL: DB_URL }),
    );
    expect(config.state).toBe("required");
  });
});

describe("sesión del panel", () => {
  const now = 1_790_000_000_000;

  it("una sesión recién creada vale, sin sesión no se entra", () => {
    const config = resolvePanelAuthConfig(deployedEnv());
    const token = createPanelSessionToken(config, now);
    expect(verifyPanelSessionToken(token, config, now + 1000)).toBe(true);
    expect(isPanelSessionAuthorized(undefined, config)).toBe(false);
  });

  it("caduca a las 12 horas", () => {
    const config = resolvePanelAuthConfig(deployedEnv());
    const token = createPanelSessionToken(config, now);
    const justAfter = now + PANEL_SESSION_MAX_AGE_SECONDS * 1000 + 1;
    expect(verifyPanelSessionToken(token, config, justAfter)).toBe(false);
  });

  it("no vale si se manipula la fecha o la firma", () => {
    const config = resolvePanelAuthConfig(deployedEnv());
    const token = createPanelSessionToken(config, now);
    const [version, expiresAt, signature] = token.split(".");
    const later = `${version}.${Number(expiresAt) + 86_400_000}.${signature}`;
    expect(verifyPanelSessionToken(later, config, now)).toBe(false);
    expect(verifyPanelSessionToken(`${version}.${expiresAt}.x${signature}`, config, now)).toBe(
      false,
    );
  });

  it("cambiar la contraseña o el secreto del servidor cierra las sesiones abiertas", () => {
    const config = resolvePanelAuthConfig(deployedEnv());
    const token = createPanelSessionToken(config, now);

    const newPassword = resolvePanelAuthConfig(
      deployedEnv({
        INTERNAL_ANALYTICS_PANEL_PASSWORD_HASH: createPanelPasswordFingerprint(
          "otra-contraseña-del-panel",
          Buffer.alloc(16, 9),
          1024,
        ),
      }),
    );
    expect(verifyPanelSessionToken(token, newPassword, now)).toBe(false);

    const newSecret = resolvePanelAuthConfig(deployedEnv({ DATABASE_URL: `${DB_URL}&x=1` }));
    expect(verifyPanelSessionToken(token, newSecret, now)).toBe(false);
  });

  it("el panel cerrado no acepta ninguna sesión", () => {
    const locked = resolvePanelAuthConfig(deployedEnv({ DATABASE_URL: undefined }));
    expect(isPanelSessionAuthorized("v1.9999999999999.firma", locked)).toBe(false);
  });
});

describe("readCookie", () => {
  it("lee la cookie de la sesión en la cabecera", () => {
    expect(readCookie("a=1; panel_session=v1.123.abc; b=2", "panel_session")).toBe("v1.123.abc");
    expect(readCookie(null, "panel_session")).toBeUndefined();
    expect(readCookie("a=1", "panel_session")).toBeUndefined();
  });
});
