import {
  FEE_GESTION_WEB_PROPIA_EUR,
  PLAN_PRO_ANUAL_DIAS_PRUEBA,
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  formatEUR,
} from "./alta-config";
import type { AltaState } from "@/components/asistente/types";

export type CheckoutScenario = "trial_free" | "custom_domain" | "management_fee";

export function getCheckoutScenario(alta: AltaState): CheckoutScenario {
  if (alta.has_existing_website) return "management_fee";
  if (alta.domain_is_custom) return "custom_domain";
  return "trial_free";
}

export function amountDueToday(alta: AltaState): number {
  if (alta.has_existing_website) return FEE_GESTION_WEB_PROPIA_EUR;
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
    return `${PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba del Plan Pro · incluye tu página web`;
  }
  if (scenario === "custom_domain") {
    return `Dominio ${alta.domain} + ${PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba del Plan Pro`;
  }
  return `Fee de gestión web + ${PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba del Plan Pro`;
}

export function getResumenCta(scenario: CheckoutScenario): string {
  switch (scenario) {
    case "trial_free":
      return "Empezar prueba gratis";
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

export function annualPlanLabel(): string {
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

export function planHeroBadgeLabel(): string {
  return `${PLAN_PRO_ANUAL_DIAS_PRUEBA} días gratis`;
}

export function planHeroTitle(alta: AltaState): string {
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
