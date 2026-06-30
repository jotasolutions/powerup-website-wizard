import type { WebsiteType } from "./place-profile.types";

const SOCIAL_HOSTS = new Set([
  "facebook.com",
  "fb.com",
  "m.facebook.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "pinterest.com",
]);

const AGGREGATOR_HOSTS = new Set([
  "linktr.ee",
  "linktree.com",
  "bio.link",
  "campsite.bio",
  "glovoapp.com",
  "glovo.com",
  "just-eat.es",
  "justeat.es",
  "just-eat.com",
  "thefork.com",
  "thefork.es",
  "lafourchette.com",
  "eltenedor.es",
  "tripadvisor.com",
  "tripadvisor.es",
  "ubereats.com",
  "deliveroo.es",
  "deliveroo.com",
  "covermanager.com",
  "covermanager.es",
  "opentable.com",
  "opentable.es",
  "wolt.com",
  "rappi.com",
]);

const BUILDER_HOSTS = new Set([
  "wixsite.com",
  "wix.com",
  "editorx.com",
  "weebly.com",
  "sites.google.com",
  "godaddysites.com",
  "godaddy.com",
  "eatbu.com",
  "negocio.site",
  "squarespace.com",
  "wordpress.com",
  "blogspot.com",
  "jimdosite.com",
  "jimdofree.com",
  "webnode.es",
  "webnode.com",
  "strikingly.com",
  "carrd.co",
  "mystrikingly.com",
  "shopify.com",
  "myshopify.com",
]);

/** Host conocido → nombre legible para mensajes de brecha. */
const PLATFORM_LABELS: Record<string, string> = {
  "linktr.ee": "Linktree",
  "linktree.com": "Linktree",
  "bio.link": "Bio.link",
  "campsite.bio": "Campsite",
  "facebook.com": "Facebook",
  "fb.com": "Facebook",
  "m.facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "twitter.com": "X",
  "x.com": "X",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "linkedin.com": "LinkedIn",
  "pinterest.com": "Pinterest",
  "glovoapp.com": "Glovo",
  "glovo.com": "Glovo",
  "just-eat.es": "Just Eat",
  "justeat.es": "Just Eat",
  "just-eat.com": "Just Eat",
  "thefork.com": "TheFork",
  "thefork.es": "TheFork",
  "lafourchette.com": "TheFork",
  "eltenedor.es": "TheFork",
  "tripadvisor.com": "TripAdvisor",
  "tripadvisor.es": "TripAdvisor",
  "ubereats.com": "Uber Eats",
  "deliveroo.es": "Deliveroo",
  "deliveroo.com": "Deliveroo",
  "covermanager.com": "CoverManager",
  "covermanager.es": "CoverManager",
  "opentable.com": "OpenTable",
  "opentable.es": "OpenTable",
  "wolt.com": "Wolt",
  "rappi.com": "Rappi",
};

export type WebsiteClassification = {
  website_type: WebsiteType;
  /** Marca legible si social/aggregator; undefined si no aplica o no identificada. */
  platform_label?: string;
};

function normalizeHost(uri: string): string | null {
  const trimmed = uri.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchesHostSet(host: string, hosts: Set<string>): boolean {
  if (hosts.has(host)) return true;
  return [...hosts].some((known) => host === known || host.endsWith(`.${known}`));
}

function lookupPlatformLabel(host: string): string | undefined {
  if (PLATFORM_LABELS[host]) return PLATFORM_LABELS[host];

  for (const [knownHost, label] of Object.entries(PLATFORM_LABELS)) {
    if (host === knownHost || host.endsWith(`.${knownHost}`)) {
      return label;
    }
  }

  return undefined;
}

/** Nombre legible de la plataforma detectada en la URI (solo hosts con etiqueta conocida). */
export function resolvePlatformLabel(uri: string | undefined | null): string | undefined {
  if (!uri?.trim()) return undefined;

  const host = normalizeHost(uri);
  if (!host) return undefined;

  return lookupPlatformLabel(host);
}

/** Host de carta PowerUp Menu (subdominio o raíz). */
export function isPowerUpMenuHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "powerup.menu" || h.endsWith(".powerup.menu");
}

export function isPowerUpMenuUri(uri: string | undefined | null): boolean {
  if (!uri?.trim()) return false;
  const host = normalizeHost(uri);
  return host ? isPowerUpMenuHost(host) : false;
}

/** Dominio completo si la URI es carta PowerUp, p.ej. foo.powerup.menu */
export function extractPowerUpMenuDomain(uri: string): string | null {
  const host = normalizeHost(uri);
  if (!host || !isPowerUpMenuHost(host)) return null;
  return host;
}

/** Clasifica websiteUri de Places: web propia vs agregador vs red social vs builder. */
export function classifyWebsite(uri: string | undefined | null): WebsiteType {
  if (!uri?.trim()) return "none";

  const host = normalizeHost(uri);
  if (!host) return "none";

  if (matchesHostSet(host, SOCIAL_HOSTS)) return "social";
  if (matchesHostSet(host, AGGREGATOR_HOSTS)) return "aggregator";
  if (matchesHostSet(host, BUILDER_HOSTS)) return "builder";

  return "own";
}

export function classifyWebsiteDetailed(
  uri: string | undefined | null,
): WebsiteClassification {
  const website_type = classifyWebsite(uri);

  const platform_label =
    website_type === "social" || website_type === "aggregator"
      ? resolvePlatformLabel(uri)
      : undefined;

  return { website_type, platform_label };
}
