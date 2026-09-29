import { createHmac, hkdfSync, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { DATABASE_URL_ENV_KEYS } from "./env.server";

/**
 * Huella (scrypt) de la contraseña del panel interno. La contraseña NO está en el código y la
 * huella no sirve para averiguarla. Para cambiarla: `node scripts/panel-password.mjs` crea una
 * contraseña nueva, la copia al portapapeles y muestra solo su huella; sustituir esta línea.
 * Si existe INTERNAL_ANALYTICS_PANEL_PASSWORD_HASH (misma forma), manda sobre esta.
 */
export const PANEL_PASSWORD_FINGERPRINT =
  "scrypt$16384$8$1$38vJTtUgsDNX1SrlPowI9A$tGAnYU6CfmUYCnf3ul_LANy5J6IhCf9c7Xmob4evjuU";

export const PANEL_SESSION_COOKIE = "panel_session";
export const PANEL_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const SESSION_KEY_INFO = "powerup-wizard-panel-session-v1";
const SCRYPT_KEY_LENGTH = 32;

type Fingerprint = { N: number; r: number; p: number; salt: Buffer; hash: Buffer; raw: string };

/**
 * open: local sin despliegue, el panel sigue abierto como siempre.
 * required: desplegado y configurado, pide contraseña.
 * locked: desplegado sin huella válida o sin secreto de servidor; nadie entra.
 */
export type PanelAuthState = "open" | "required" | "locked";

export type PanelAuthConfig = {
  state: PanelAuthState;
  fingerprint: Fingerprint | null;
  sessionKey: Buffer | null;
};

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/** Formato: scrypt$N$r$p$salt$hash (salt y hash en base64url). */
export function parsePanelPasswordFingerprint(raw: string | undefined): Fingerprint | null {
  if (!raw) return null;
  const parts = raw.trim().split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const [N, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], "base64url");
  const hash = Buffer.from(parts[5], "base64url");
  const validParams = [N, r, p].every((n) => Number.isInteger(n) && n > 0);
  if (!validParams || salt.length < 16 || hash.length !== SCRYPT_KEY_LENGTH) return null;

  return { N, r, p, salt, hash, raw: raw.trim() };
}

/** Solo para pruebas y para el script: la huella de una contraseña. */
export function createPanelPasswordFingerprint(
  password: string,
  salt: Buffer = randomBytes(16),
  N = 16384,
): string {
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH, { N, r: 8, p: 1 });
  return ["scrypt", N, 8, 1, base64url(salt), base64url(hash)].join("$");
}

export function resolvePanelAuthConfig(env: NodeJS.ProcessEnv = process.env): PanelAuthConfig {
  if (!env.VERCEL_ENV) return { state: "open", fingerprint: null, sessionKey: null };

  const fingerprint = parsePanelPasswordFingerprint(
    env.INTERNAL_ANALYTICS_PANEL_PASSWORD_HASH || PANEL_PASSWORD_FINGERPRINT,
  );
  // Secreto que el servidor ya tiene: la conexión a la base de datos. Con la huella como sal,
  // cambiar la contraseña cierra todas las sesiones.
  const serverSecret = DATABASE_URL_ENV_KEYS.map((key) => env[key]?.trim()).find(Boolean);
  if (!fingerprint || !serverSecret)
    return { state: "locked", fingerprint: null, sessionKey: null };

  const sessionKey = Buffer.from(
    hkdfSync("sha256", serverSecret, fingerprint.raw, SESSION_KEY_INFO, 32),
  );
  return { state: "required", fingerprint, sessionKey };
}

export function verifyPanelPassword(password: string, config: PanelAuthConfig): boolean {
  if (config.state !== "required" || !config.fingerprint) return false;
  const { N, r, p, salt, hash } = config.fingerprint;
  try {
    const candidate = scryptSync(password, salt, hash.length, { N, r, p });
    return timingSafeEqual(candidate, hash);
  } catch {
    return false;
  }
}

function sign(expiresAt: number, key: Buffer): string {
  return base64url(createHmac("sha256", key).update(`v1.${expiresAt}`).digest());
}

export function createPanelSessionToken(config: PanelAuthConfig, now = Date.now()): string {
  if (!config.sessionKey) throw new Error("Panel sin secreto de sesión");
  const expiresAt = now + PANEL_SESSION_MAX_AGE_SECONDS * 1000;
  return `v1.${expiresAt}.${sign(expiresAt, config.sessionKey)}`;
}

export function verifyPanelSessionToken(
  token: string | undefined,
  config: PanelAuthConfig,
  now = Date.now(),
): boolean {
  if (!token || !config.sessionKey) return false;
  const [version, expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (version !== "v1" || !Number.isFinite(expiresAt) || expiresAt <= now || !signature) {
    return false;
  }

  const expected = Buffer.from(sign(expiresAt, config.sessionKey));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** La petición puede usar el panel: local abierto, o sesión válida si hace falta contraseña. */
export function isPanelSessionAuthorized(
  token: string | undefined,
  config: PanelAuthConfig = resolvePanelAuthConfig(),
): boolean {
  if (config.state === "open") return true;
  return config.state === "required" && verifyPanelSessionToken(token, config);
}

/** Lee una cookie de la cabecera Cookie (rutas de servidor que no pasan por server functions). */
export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return raw ? decodeURIComponent(raw.slice(prefix.length)) : undefined;
}
