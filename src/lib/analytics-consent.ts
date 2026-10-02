// Elección de cookies compartida con la web (www.powerup.menu): cookie `pu_consent` en
// powerup.menu, con el mismo formato que components/cookie-consent/utils.ts de powerup-website.
// Solo guarda sí/no por tipo, la versión del aviso y la fecha; ningún identificador.
// Si la web sube su consentVersion, hay que subir CONSENT_VERSION aquí también.

export const CONSENT_COOKIE_NAME = "pu_consent";
export const CONSENT_VERSION = "1.0.0";
export const PRIVACY_POLICY_URL = "https://www.powerup.menu/privacy";

const CONSENT_COOKIE_DOMAIN = "powerup.menu";
const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

/** Valor de la cookie: v versión, a/m/p analíticas/marketing/preferencias, t fecha (ms). */
type SharedConsent = { v: string; a: 0 | 1; m: 0 | 1; p: 0 | 1; t: number };

export const ALL_ACCEPTED: ConsentCategories = {
  analytics: true,
  marketing: true,
  preferences: true,
};
export const ALL_REJECTED: ConsentCategories = {
  analytics: false,
  marketing: false,
  preferences: false,
};

function isFlag(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function isSharedConsent(value: unknown): value is SharedConsent {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.v === "string" &&
    isFlag(record.a) &&
    isFlag(record.m) &&
    isFlag(record.p) &&
    typeof record.t === "number" &&
    Number.isFinite(record.t)
  );
}

/** Elección vigente (misma versión del aviso) leída de `document.cookie`, o null si no hay. */
export function readConsent(
  cookieHeader: string,
  version: string = CONSENT_VERSION,
): ConsentCategories | null {
  const prefix = `${CONSENT_COOKIE_NAME}=`;
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw.slice(prefix.length)));
    if (!isSharedConsent(parsed) || parsed.v !== version) return null;
    return { analytics: parsed.a === 1, marketing: parsed.m === 1, preferences: parsed.p === 1 };
  } catch {
    return null;
  }
}

function isOnSharedDomain(hostname: string): boolean {
  return hostname === CONSENT_COOKIE_DOMAIN || hostname.endsWith(`.${CONSENT_COOKIE_DOMAIN}`);
}

/** Cadena para `document.cookie`. En *.powerup.menu la comparten la web y el wizard. */
export function serializeConsentCookie(
  categories: ConsentCategories,
  location: { hostname: string; protocol: string },
  now: number = Date.now(),
): string {
  const value: SharedConsent = {
    v: CONSENT_VERSION,
    a: categories.analytics ? 1 : 0,
    m: categories.marketing ? 1 : 0,
    p: categories.preferences ? 1 : 0,
    t: now,
  };
  return [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(value))}`,
    "Path=/",
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    isOnSharedDomain(location.hostname) ? `Domain=${CONSENT_COOKIE_DOMAIN}` : null,
    location.protocol === "https:" ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

export type AnalyticsDecision = "on" | "off" | "ask";

/**
 * on: PostHog arranca. off: PostHog no se carga. ask: aviso de cookies (solo sin elección previa).
 * Sin clave no hay nada que medir ni que preguntar; el panel interno nunca se mide.
 * En desarrollo local, sin elección, PostHog funciona como siempre.
 */
export function decideAnalytics(input: {
  token: string;
  pathname: string;
  consent: ConsentCategories | null;
  isDev: boolean;
}): AnalyticsDecision {
  if (!input.token) return "off";
  if (input.pathname === "/panel" || input.pathname.startsWith("/panel/")) return "off";
  if (input.consent) return input.consent.analytics ? "on" : "off";
  return input.isDev ? "on" : "ask";
}

/** Borra lo que PostHog (y el flag ph_wizard_started) haya dejado en este navegador. */
export function clearPostHogStorage(): void {
  if (typeof window === "undefined") return;

  const isPostHogKey = (key: string) => key.startsWith("ph_") || key.startsWith("__ph_");

  for (const getStorage of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      const storage = getStorage();
      Object.keys(storage)
        .filter(isPostHogKey)
        .forEach((key) => storage.removeItem(key));
    } catch {
      // Almacenamiento no disponible (modo privado estricto)
    }
  }

  const hostname = window.location.hostname;
  const domains = [null, hostname];
  if (isOnSharedDomain(hostname)) domains.push(CONSENT_COOKIE_DOMAIN);
  document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter(isPostHogKey)
    .forEach((name) => {
      for (const domain of domains) {
        document.cookie = `${name}=; Path=/; Max-Age=0${domain ? `; Domain=${domain}` : ""}`;
      }
    });
}
