import { DOMAIN_PRICE_MARGIN_PERCENT } from "./alta-config";
import {
  getNamecheapApiKey,
  getNamecheapApiUser,
  getNamecheapClientIp,
  getNamecheapDomainMarginPercent,
  getNamecheapUsdToEurRate,
  isNamecheapSandbox,
} from "./env.server";

type NamecheapCommand = "namecheap.domains.check" | "namecheap.users.getPricing";

type NamecheapDomainCheck = {
  domain: string;
  available: boolean;
  isPremium: boolean;
  premiumRegistrationPrice: number | null;
};

type NamecheapDomainPrice = {
  amount: number;
  currency: string;
};

export type DomainAlternative = {
  domain: string;
  price: number;
};

export type DomainCheckResult =
  | { available: true; price: number }
  | { available: false; alternatives: DomainAlternative[] };

const NAMECHEAP_API_BASE = "https://api.namecheap.com/xml.response";
const NAMECHEAP_SANDBOX_API_BASE = "https://api.sandbox.namecheap.com/xml.response";
const DEFAULT_USD_TO_EUR_RATE = 0.92;

function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseXmlAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const matches = input.matchAll(/([A-Za-z0-9_:-]+)="([^"]*)"/g);
  for (const match of matches) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function getNamecheapBaseUrl(): string {
  return isNamecheapSandbox() ? NAMECHEAP_SANDBOX_API_BASE : NAMECHEAP_API_BASE;
}

function toCanonicalDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function splitDomain(domain: string): { sld: string; tld: string } {
  const parts = domain.split(".").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("El dominio debe incluir un TLD válido (por ejemplo: turestaurante.es).");
  }

  return {
    sld: parts[0],
    tld: parts.slice(1).join("."),
  };
}

async function callNamecheap(
  command: NamecheapCommand,
  params: Record<string, string>,
): Promise<string> {
  const apiUser = getNamecheapApiUser();
  const apiKey = getNamecheapApiKey();
  const clientIp = getNamecheapClientIp();

  if (!apiUser || !apiKey || !clientIp) {
    throw new Error(
      "Falta configuración de Namecheap. Añade NAMECHEAP_API_USER, NAMECHEAP_API_KEY y NAMECHEAP_CLIENT_IP.",
    );
  }

  const url = new URL(getNamecheapBaseUrl());
  url.searchParams.set("ApiUser", apiUser);
  url.searchParams.set("ApiKey", apiKey);
  url.searchParams.set("UserName", apiUser);
  url.searchParams.set("Command", command);
  url.searchParams.set("ClientIp", clientIp);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  const xml = await response.text();

  if (!response.ok) {
    throw new Error(`Namecheap no respondió correctamente (HTTP ${response.status}).`);
  }

  const statusMatch = xml.match(/<ApiResponse[^>]*Status="([^"]+)"/);
  if (!statusMatch) {
    throw new Error("La respuesta de Namecheap no tiene un formato válido.");
  }

  if (statusMatch[1] !== "OK") {
    const errorMatch = xml.match(/<Error[^>]*Number="([^"]*)"[^>]*>([\s\S]*?)<\/Error>/);
    if (errorMatch) {
      const code = errorMatch[1];
      const message = errorMatch[2].trim();
      throw new Error(`Namecheap error ${code}: ${message}`);
    }
    throw new Error("Namecheap devolvió un error desconocido.");
  }

  return xml;
}

async function checkDomains(domains: string[]): Promise<Map<string, NamecheapDomainCheck>> {
  const domainList = domains.map((domain) => toCanonicalDomain(domain)).join(",");
  const xml = await callNamecheap("namecheap.domains.check", { DomainList: domainList });

  const result = new Map<string, NamecheapDomainCheck>();
  const matches = xml.matchAll(/<DomainCheckResult\s+([^>]*?)\/>/g);
  for (const match of matches) {
    const attrs = parseXmlAttributes(match[1]);
    const domain = toCanonicalDomain(attrs.Domain ?? "");
    if (!domain) continue;

    result.set(domain, {
      domain,
      available: attrs.Available === "true",
      isPremium: attrs.IsPremiumName === "true",
      premiumRegistrationPrice: parseNumber(attrs.PremiumRegistrationPrice),
    });
  }

  return result;
}

async function getRegisterPrice(tld: string): Promise<NamecheapDomainPrice> {
  const xml = await callNamecheap("namecheap.users.getPricing", {
    ProductType: "DOMAIN",
    ProductCategory: "DOMAINS",
    ActionName: "REGISTER",
    ProductName: tld.toUpperCase(),
  });

  const productRegex = new RegExp(
    `<Product[^>]*Name="${tld.toLowerCase()}"[\\s\\S]*?<\\/Product>`,
    "i",
  );
  const productMatch = xml.match(productRegex);
  if (!productMatch) {
    throw new Error(`Namecheap no devolvió precio de registro para el TLD .${tld}.`);
  }

  const yearlyPriceMatch = productMatch[0].match(
    /<Price\s+([^>]*Duration="1"[^>]*DurationType="YEAR"[^>]*)\/>/i,
  );
  if (!yearlyPriceMatch) {
    throw new Error(`Namecheap no devolvió precio anual de registro para .${tld}.`);
  }

  const attrs = parseXmlAttributes(yearlyPriceMatch[1]);
  const amount = parseNumber(attrs.YourPrice) ?? parseNumber(attrs.Price);
  const currency = attrs.Currency ?? "USD";

  if (amount == null) {
    throw new Error(`Namecheap no devolvió un precio válido para .${tld}.`);
  }

  return { amount, currency };
}

function normalizePriceToEur(amount: number, currency: string): number {
  if (currency.toUpperCase() === "EUR") {
    return amount;
  }

  const conversionRate = getNamecheapUsdToEurRate() ?? DEFAULT_USD_TO_EUR_RATE;
  return amount * conversionRate;
}

function applyCustomerMargin(basePrice: number): number {
  const marginPercent = getNamecheapDomainMarginPercent() ?? DOMAIN_PRICE_MARGIN_PERCENT;
  const finalPrice = basePrice * (1 + marginPercent / 100);
  return Math.round(finalPrice * 100) / 100;
}

async function resolveDomainPrice(check: NamecheapDomainCheck): Promise<number> {
  const { tld } = splitDomain(check.domain);

  if (check.isPremium && check.premiumRegistrationPrice != null) {
    return applyCustomerMargin(check.premiumRegistrationPrice);
  }

  const basePrice = await getRegisterPrice(tld);
  const eurPrice = normalizePriceToEur(basePrice.amount, basePrice.currency);
  return applyCustomerMargin(eurPrice);
}

function generateAlternatives(targetDomain: string): string[] {
  const { sld, tld } = splitDomain(targetDomain);
  const alternatives = new Set<string>();
  const altTlds = ["es", "com", "restaurant", "bar", "menu"];
  const altSlds = [sld, `${sld}-restaurante`, `el${sld}`, `${sld}bar`];

  for (const baseSld of altSlds) {
    alternatives.add(`${baseSld}.${tld}`);
  }

  for (const altTld of altTlds) {
    alternatives.add(`${sld}.${altTld}`);
  }

  alternatives.delete(targetDomain);
  return Array.from(alternatives).slice(0, 12);
}

export async function checkDomainWithNamecheap(domain: string): Promise<DomainCheckResult> {
  const normalizedDomain = toCanonicalDomain(domain);
  const checks = await checkDomains([normalizedDomain]);
  const main = checks.get(normalizedDomain);

  if (!main) {
    throw new Error("Namecheap no devolvió información para el dominio solicitado.");
  }

  if (main.available) {
    const price = await resolveDomainPrice(main);
    return { available: true, price };
  }

  const candidateDomains = generateAlternatives(normalizedDomain);
  const alternativesChecks = await checkDomains(candidateDomains);
  const alternatives: DomainAlternative[] = [];

  for (const candidate of candidateDomains) {
    const check = alternativesChecks.get(candidate);
    if (!check?.available) continue;

    const price = await resolveDomainPrice(check);
    alternatives.push({ domain: candidate, price });
    if (alternatives.length === 3) break;
  }

  return { available: false, alternatives };
}
