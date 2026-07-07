export const LOW_SAMPLE_THRESHOLD = 20;

export const NARRATIVE_FUNNEL_STEPS = [
  { event: "wizard_started", label: "Entró al asistente" },
  { event: "wizard_search_performed", label: "Buscó su restaurante" },
  { event: "wizard_place_confirmed", label: "Confirmó su restaurante" },
  { event: "wizard_domain_type_chosen", label: "Eligió dominio" },
  { event: "wizard_brecha_viewed", label: "Vio la oferta de upgrade" },
  { event: "alta_lead_saved", label: "Dejó su contacto" },
  { event: "checkout_session_created", label: "Llegó al pago" },
  { event: "alta_fulfilled", label: "Activó su página" },
] as const;

export type NarrativeStep = {
  event: string;
  label: string;
  count: number;
  per100: number;
};

export type WorstDropoff = {
  stepIndex: number;
  stepLabel: string;
  event: string;
  dropPercent: number;
  droppedPer100: number;
  fromCount: number;
};

export function normalizeFunnelSteps(
  steps: Array<{ event: string; count: number }>,
): NarrativeStep[] {
  const top = steps[0]?.count ?? 0;
  return NARRATIVE_FUNNEL_STEPS.map((def) => {
    const row = steps.find((s) => s.event === def.event);
    const count = row?.count ?? 0;
    return {
      event: def.event,
      label: def.label,
      count,
      per100: top > 0 ? Math.round((count / top) * 100) : 0,
    };
  });
}

export function computeWorstDropoff(steps: NarrativeStep[]): WorstDropoff | null {
  let worst: WorstDropoff | null = null;

  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]!;
    const curr = steps[i]!;
    if (prev.count <= 0) continue;
    const dropRate = (prev.count - curr.count) / prev.count;
    if (dropRate <= 0) continue;
    if (!worst || dropRate > worst.dropPercent / 100) {
      worst = {
        stepIndex: i,
        stepLabel: curr.label,
        event: curr.event,
        dropPercent: Math.round(dropRate * 100),
        droppedPer100: Math.round(dropRate * 100),
        fromCount: prev.count,
      };
    }
  }

  return worst;
}

export type SectionLight = "green" | "amber" | "gray";

export function formatEsNumber(n: number): string {
  return Math.round(n).toLocaleString("es-ES");
}

export function formatEsEur(n: number): string {
  return Math.round(n).toLocaleString("es-ES");
}

export function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? "+∞" : null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

export const SCENARIO_LABELS: Record<string, string> = {
  custom_domain: "dominio de pago",
  trial_free: "subdominio gratis",
  management_fee: "gestión web existente",
};
