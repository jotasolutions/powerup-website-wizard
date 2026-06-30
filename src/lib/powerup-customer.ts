import type { PlaceProfile } from "./place-profile.types";
import { extractPowerUpMenuDomain, isPowerUpMenuUri } from "./website-classifier";

export type PowerUpCustomerStatus = "unknown" | "yes" | "no";

/** Detección automática desde perfil enriquecido (URI *.powerup.menu en Google). */
export function detectPowerUpFromProfile(profile: PlaceProfile): {
  status: Extract<PowerUpCustomerStatus, "yes" | "unknown">;
  domain?: string;
} {
  const uri = profile.website_uri;
  if (!isPowerUpMenuUri(uri)) {
    return { status: "unknown" };
  }

  const domain = uri ? extractPowerUpMenuDomain(uri) : null;
  return { status: "yes", domain: domain ?? undefined };
}

export function isPowerUpCustomer(alta: { powerup_customer: PowerUpCustomerStatus }): boolean {
  return alta.powerup_customer === "yes";
}

/** Resuelve yes/no para el flujo del wizard (detección + estado acumulado). */
export function resolvePowerUpCustomerForFlow(
  status: PowerUpCustomerStatus,
  profile?: PlaceProfile | null,
): Extract<PowerUpCustomerStatus, "yes" | "no"> {
  if (status === "yes") return "yes";
  if (profile && detectPowerUpFromProfile(profile).status === "yes") return "yes";
  return "no";
}

/** Antes de persistir: nunca guardar unknown (legacy en BD se mantiene). */
export function normalizePowerUpCustomerForPersist(
  status: PowerUpCustomerStatus,
): Extract<PowerUpCustomerStatus, "yes" | "no"> {
  return status === "yes" ? "yes" : "no";
}
