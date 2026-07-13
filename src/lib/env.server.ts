/** Nombres aceptados por getDatabaseUrl() (orden de prioridad). */
export const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
] as const;

/** Mensaje estándar cuando falta una variable de entorno. */
export function envConfigHint(varName: string): string {
  return `Falta ${varName}. Añádela a tu .env local (ver .env.example). Para deploy, ver checklist en AGENTS.md.`;
}

function databaseUrlConfigHint(): string {
  return `Falta connection string de Neon. Define una de: ${DATABASE_URL_ENV_KEYS.join(", ")}. Añádela a tu .env local (ver .env.example). Para deploy, ver checklist en AGENTS.md.`;
}

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return normalizeEnvValue(value);
  }
  return undefined;
}

function normalizeEnvValue(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "");
}

function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim().replace(/^["']|["']$/g, "");

  if (url.startsWith("postgres://")) {
    url = `postgresql://${url.slice("postgres://".length)}`;
  }

  if (!url.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL debe ser un connection string de Neon con formato postgresql://user:password@host/dbname?...",
    );
  }

  return url;
}

/** Connection string de Neon/Postgres (local y deploy pueden usar nombres distintos). */
export function getDatabaseUrl(): string {
  const url = firstEnv(...DATABASE_URL_ENV_KEYS);

  if (!url) {
    throw new Error(databaseUrlConfigHint());
  }

  return normalizeDatabaseUrl(url);
}

export function getStripeSecretKey(): string | undefined {
  return firstEnv("STRIPE_SECRET_KEY", "STRIPE_API_KEY");
}

export function getStripeAnnualPriceId(): string | undefined {
  return firstEnv("STRIPE_PRICE_PRO_ANUAL", "STRIPE_PRICE_PRO_YEARLY");
}

export function hasDatabaseUrl(): boolean {
  try {
    getDatabaseUrl();
    return true;
  } catch {
    return false;
  }
}

export function hasStripeConfig(): boolean {
  return Boolean(getStripeSecretKey() && getStripeAnnualPriceId());
}

export function getStripeWebhookSecret(): string | undefined {
  return firstEnv("STRIPE_WEBHOOK_SECRET");
}

export function hasStripeWebhookConfig(): boolean {
  return hasStripeConfig() && Boolean(getStripeWebhookSecret());
}

export function getGooglePlacesApiKey(): string | undefined {
  return firstEnv(
    "GOOGLE_PLACES_API_KEY",
    "GOOGLE_API_KEY",
    "NEXT_PUBLIC_GOOGLE_API_KEY",
    "VITE_GOOGLE_API_KEY",
  );
}

export function hasGooglePlaces(): boolean {
  return Boolean(getGooglePlacesApiKey());
}

export function getEvolutionApiUrl(): string {
  const url = firstEnv("EVOLUTION_API_URL");
  if (!url) {
    throw new Error(envConfigHint("EVOLUTION_API_URL"));
  }
  return url.replace(/\/$/, "");
}

export function getEvolutionInstanceName(): string {
  const name = firstEnv("EVOLUTION_INSTANCE_NAME");
  if (!name) {
    throw new Error(envConfigHint("EVOLUTION_INSTANCE_NAME"));
  }
  return name;
}

export function getEvolutionApiKey(): string | undefined {
  return firstEnv("EVOLUTION_API_KEY");
}

export function hasEvolutionConfig(): boolean {
  try {
    getEvolutionApiUrl();
    getEvolutionInstanceName();
    return true;
  } catch {
    return false;
  }
}

export function getNamecheapApiUser(): string | undefined {
  return firstEnv("NAMECHEAP_API_USER", "NAMECHEAP_APIUSERNAME");
}

export function getNamecheapApiKey(): string | undefined {
  return firstEnv("NAMECHEAP_API_KEY");
}

export function getNamecheapClientIp(): string | undefined {
  return firstEnv("NAMECHEAP_CLIENT_IP");
}

export function hasNamecheapConfig(): boolean {
  return Boolean(getNamecheapApiUser() && getNamecheapApiKey() && getNamecheapClientIp());
}

export function isNamecheapSandbox(): boolean {
  const raw = firstEnv("NAMECHEAP_SANDBOX");
  if (!raw) return false;
  return raw.toLowerCase() === "true" || raw === "1";
}

export function getNamecheapDomainMarginPercent(): number | undefined {
  const raw = firstEnv("NAMECHEAP_DOMAIN_MARGIN_PERCENT");
  if (!raw) return undefined;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getNamecheapUsdToEurRate(): number | undefined {
  const raw = firstEnv("NAMECHEAP_USD_TO_EUR");
  if (!raw) return undefined;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getSlackWebhookUrl(): string | undefined {
  return firstEnv("SLACK_WEBHOOK_URL");
}

export function hasSlackConfig(): boolean {
  return Boolean(getSlackWebhookUrl());
}

export function getPostHogPersonalApiKey(): string | undefined {
  return firstEnv("POSTHOG_PERSONAL_API_KEY");
}

export function getPostHogApiHost(): string {
  return firstEnv("POSTHOG_API_HOST") ?? "https://eu.posthog.com";
}

export function getPostHogProjectId(): string {
  return firstEnv("POSTHOG_PROJECT_ID") ?? "212884";
}

export function hasPostHogQueryConfig(): boolean {
  return Boolean(getPostHogPersonalApiKey());
}

export function getInternalAnalyticsPanelSlug(): string {
  return firstEnv("INTERNAL_ANALYTICS_PANEL_SLUG") ?? "m4x8nq2k";
}

const REPLAY_PLAYLIST_PLACEHOLDER_IDS = new Set([
  "TU_SHORT_ID",
  "aBc12XyZ",
  "XXXXXXXX",
]);

function isConfiguredReplayPlaylistUrl(url: string): boolean {
  try {
    const match = new URL(url).pathname.match(/\/replay\/playlists\/([^/]+)/i);
    if (!match) return true;
    const shortId = match[1];
    if (REPLAY_PLAYLIST_PLACEHOLDER_IDS.has(shortId)) return false;
    if (/^TU_/i.test(shortId) || /^X+$/i.test(shortId)) return false;
    return shortId.length >= 4;
  } catch {
    return false;
  }
}

/** Playlist guardada en PostHog; vacío si no hay URL válida (ignora placeholders de ejemplo). */
export function getInternalAnalyticsReplayUrl(): string | undefined {
  const raw = firstEnv("INTERNAL_ANALYTICS_REPLAY_URL")?.trim();
  if (!raw || !isConfiguredReplayPlaylistUrl(raw)) return undefined;
  return raw;
}

/** Listado general de Session Replay del proyecto (siempre accesible en PostHog EU). */
export function getInternalAnalyticsReplayListingUrl(): string {
  const host = getPostHogApiHost().replace(/\/$/, "");
  const projectId = getPostHogProjectId();
  return `${host}/project/${projectId}/replay`;
}

/** Playlist configurada o, si falta, el listado de replays del proyecto. */
export function resolveInternalAnalyticsReplayUrl(): string {
  return getInternalAnalyticsReplayUrl() ?? getInternalAnalyticsReplayListingUrl();
}

export function isInternalAnalyticsReplayPlaylistUrl(url: string): boolean {
  return /\/replay\/playlists\//i.test(url);
}

/** Fecha desde la que checkout_scenario/onetime_fee_amount en alta_fulfilled son fiables (deploy 2346dc3). */
export function getCheckoutScenarioInstrumentedSince(): string {
  return firstEnv("ANALYTICS_CHECKOUT_SCENARIO_SINCE") ?? "2026-07-07";
}

/** Usa mock solo si MOCK_DOMAIN_CHECK=true o si faltan credenciales de Namecheap. */
export function shouldMockDomainCheck(): boolean {
  const raw = firstEnv("MOCK_DOMAIN_CHECK");
  if (raw?.toLowerCase() === "false" || raw === "0") return false;
  if (raw?.toLowerCase() === "true" || raw === "1") return true;
  return !hasNamecheapConfig();
}
