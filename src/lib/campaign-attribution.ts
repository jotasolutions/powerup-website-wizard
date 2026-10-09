import { z } from "zod";

/**
 * Campaña de la que viene cada alta (UTM de la URL de llegada).
 *
 * La web (www.powerup.menu/pagina-web) añade los utm_* al enlace del asistente. Aquí se guardan en
 * la memoria de la pestaña para que sobrevivan a la vuelta de Stripe sin pagar (`/?cancelado=1`),
 * y viajan al servidor para ir en los metadatos de Stripe y en los eventos de servidor de PostHog.
 * No depende del permiso de cookies: son parámetros de la URL, no cookies.
 */
export const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type CampaignKey = (typeof CAMPAIGN_KEYS)[number];
export type CampaignParams = Partial<Record<CampaignKey, string>>;

export const CAMPAIGN_STORAGE_KEY = "powerup-alta-campana";

/** Stripe admite valores de metadatos de hasta 500 caracteres; una UTM útil es mucho más corta. */
export const CAMPAIGN_VALUE_MAX = 200;

export const CampaignSchema = z
  .object(
    Object.fromEntries(
      CAMPAIGN_KEYS.map((key) => [key, z.string().min(1).max(CAMPAIGN_VALUE_MAX).optional()]),
    ) as Record<CampaignKey, z.ZodOptional<z.ZodString>>,
  )
  .strict();

/** Solo las claves de campaña con valor, recortadas. Ignora cualquier otro parámetro. */
export function campaignFromSearch(search: string): CampaignParams {
  const params = new URLSearchParams(search);
  const campaign: CampaignParams = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = params.get(key)?.trim();
    if (value) campaign[key] = value.slice(0, CAMPAIGN_VALUE_MAX);
  }
  return campaign;
}

export function hasCampaign(campaign: CampaignParams | null | undefined): boolean {
  return campaign != null && CAMPAIGN_KEYS.some((key) => campaign[key]);
}

/**
 * Cliente: si la URL trae campaña, la recuerda (una campaña nueva sustituye a la anterior, como en
 * la web); si no, devuelve la que se recordó antes en esta pestaña.
 */
export function rememberCampaign(search: string): CampaignParams {
  const fromUrl = campaignFromSearch(search);
  try {
    if (hasCampaign(fromUrl)) {
      sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const raw = sessionStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = CampaignSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    // sessionStorage puede fallar en modo privado estricto: seguimos con lo que trae la URL.
    return fromUrl;
  }
}

/** Pares clave-valor listos para metadatos de Stripe o propiedades de PostHog (sin vacíos). */
export function campaignMetadata(
  campaign: CampaignParams | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!campaign) return out;
  for (const key of CAMPAIGN_KEYS) {
    const value = campaign[key];
    if (value) out[key] = value;
  }
  return out;
}

/** Lee la campaña de los metadatos de una sesión de Stripe (webhook). */
export function campaignFromStripeMetadata(
  metadata: Record<string, string> | null | undefined,
): CampaignParams {
  const campaign: CampaignParams = {};
  if (!metadata) return campaign;
  for (const key of CAMPAIGN_KEYS) {
    const value = metadata[key];
    if (value) campaign[key] = value;
  }
  return campaign;
}
