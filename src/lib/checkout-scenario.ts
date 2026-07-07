import {
  ENABLE_MANAGEMENT_FEE,
  FEE_GESTION_WEB_PROPIA_EUR,
  PLAN_PRO_ANUAL_DIAS_PRUEBA,
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  formatEUR,
} from "./alta-config";
import type { AltaState } from "@/components/asistente/types";

export type CheckoutScenario = "trial_free" | "custom_domain" | "management_fee";

export function isPowerUpUpgrade(alta: AltaState): boolean {
  return alta.powerup_customer === "yes";
}

export function resolveCheckoutScenario(params: {
  hasExistingWebsite: boolean | null;
  domainIsCustom: boolean;
  managementFeeEnabled?: boolean;
}): CheckoutScenario {
  const managementFeeEnabled = params.managementFeeEnabled ?? ENABLE_MANAGEMENT_FEE;
  if (managementFeeEnabled && params.hasExistingWebsite) return "management_fee";
  if (params.domainIsCustom) return "custom_domain";
  return "trial_free";
}

export function getCheckoutScenario(alta: AltaState): CheckoutScenario {
  return resolveCheckoutScenario({
    hasExistingWebsite: alta.has_existing_website,
    domainIsCustom: alta.domain_is_custom,
  });
}

export function amountDueToday(alta: AltaState): number {
  if (ENABLE_MANAGEMENT_FEE && alta.has_existing_website) return FEE_GESTION_WEB_PROPIA_EUR;
  if (alta.domain_is_custom) return alta.domain_price ?? 0;
  return 0;
}

export function todayPaymentLabel(alta: AltaState): string {
  const amount = amountDueToday(alta);
  if (amount === 0) return "0,00 € hoy";
  return `${formatEUR(amount)} hoy`;
}

export function todayPaymentSubtitle(alta: AltaState): string {
  const scenario = getCheckoutScenario(alta);
  if (scenario === "trial_free") {
    if (isPowerUpUpgrade(alta)) {
      return `Plan Pro anual · añade tu página web a tu carta PowerUp`;
    }
    return `${PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba del Plan Pro · incluye tu página web`;
  }
  if (scenario === "custom_domain") {
    if (isPowerUpUpgrade(alta)) {
      return `Dominio ${alta.domain} + Plan Pro anual (sin periodo de prueba)`;
    }
    return `Dominio ${alta.domain} + ${PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba del Plan Pro`;
  }
  return `Fee de gestión web + ${PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba del Plan Pro`;
}

export function getResumenCta(scenario: CheckoutScenario, alta?: AltaState): string {
  switch (scenario) {
    case "trial_free":
      return alta?.powerup_customer === "yes"
        ? "Activar mi página web"
        : "Empezar prueba gratis";
    case "custom_domain":
      return "Continuar con este dominio";
    case "management_fee":
      return "Continuar";
  }
}

export function getContactoCta(scenario: CheckoutScenario): string {
  switch (scenario) {
    case "trial_free":
      return "Activar mi página web";
    case "custom_domain":
      return "Reservar dominio y empezar";
    case "management_fee":
      return `Pagar ${formatEUR(FEE_GESTION_WEB_PROPIA_EUR)} y empezar`;
  }
}

export function annualPlanLabel(alta?: AltaState): string {
  if (alta && isPowerUpUpgrade(alta)) {
    return `Plan Pro: ${formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA`;
  }
  return `Después del día ${PLAN_PRO_ANUAL_DIAS_PRUEBA}: ${formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año`;
}

export function planProMonthlyEur(): number {
  return PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR / 12;
}

export function planHeroPriceLabel(alta: AltaState): string {
  const amount = amountDueToday(alta);
  if (amount === 0) return "0 € hoy";
  return `${formatEUR(amount)} hoy`;
}

export function planHeroBadgeLabel(alta?: AltaState): string | null {
  if (alta && isPowerUpUpgrade(alta)) {
    return "Upgrade a página web";
  }
  return `${PLAN_PRO_ANUAL_DIAS_PRUEBA} días gratis`;
}

export function planHeroSubtitle(alta: AltaState): string {
  const monthly = Math.round(planProMonthlyEur());
  if (isPowerUpUpgrade(alta)) {
    return `Plan Pro anual: ${formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA (${monthly} €/mes equivalente). Sin periodo de prueba — ya tienes carta PowerUp.`;
  }
  return `Luego ${monthly} €/mes (${formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA) · cancela antes del día ${PLAN_PRO_ANUAL_DIAS_PRUEBA} y no pagas nada`;
}

export function stripeReassuranceLine(alta?: AltaState): string {
  if (alta && isPowerUpUpgrade(alta)) {
    return "Pago seguro con Stripe";
  }
  return "Pago seguro con Stripe · cancela durante la prueba";
}

export function billingExplainerLabel(alta: AltaState): string {
  return isPowerUpUpgrade(alta) ? "¿Cómo funciona el cobro?" : "¿Cómo funciona la prueba?";
}

export function planHeroTitle(alta: AltaState): string {
  if (isPowerUpUpgrade(alta) && !alta.domain_is_custom && !alta.has_existing_website) {
    return "Añade tu página web a tu carta PowerUp";
  }
  const scenario = getCheckoutScenario(alta);
  if (scenario === "trial_free") {
    return "Plan Pro completo, con tu página web incluida";
  }
  if (scenario === "custom_domain") {
    return `Dominio ${alta.domain} + Plan Pro con tu página web`;
  }
  return "Fee de gestión de tu web + Plan Pro con tu página web";
}

export const ALTA_DRAFT_STORAGE_KEY = "powerup-alta-draft";

export type AltaDraft = {
  alta: AltaState;
  step: "contacto" | "resumen";
  alta_id?: string;
};

export function saveAltaDraft(draft: AltaDraft): void {
  try {
    sessionStorage.setItem(ALTA_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage puede fallar en modo privado estricto
  }
}

export function loadAltaDraft(): AltaDraft | null {
  try {
    const raw = sessionStorage.getItem(ALTA_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AltaDraft;
  } catch {
    return null;
  }
}

export function clearAltaDraft(): void {
  try {
    sessionStorage.removeItem(ALTA_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
