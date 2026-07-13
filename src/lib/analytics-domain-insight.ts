import { LOW_SAMPLE_THRESHOLD } from "./analytics-narrative";

export type DomainPreferenceInsight = {
  tone: "gray" | "green" | "amber" | "neutral";
  message: string;
};

export function buildDomainPreferenceInsight(params: {
  paidChosen: number;
  freeChosen: number;
  paidActivationRate: number | null;
  freeActivationRate: number | null;
  downgradesTotal?: number;
  namecheapDegraded?: number;
  skipLink?: number;
}): DomainPreferenceInsight {
  const total = params.paidChosen + params.freeChosen;
  if (total < LOW_SAMPLE_THRESHOLD) {
    return {
      tone: "gray",
      message: "Muestra insuficiente para conclusiones",
    };
  }

  const downgradesTotal = params.downgradesTotal ?? 0;
  const namecheapDegraded = params.namecheapDegraded ?? 0;
  const skipLink = params.skipLink ?? 0;
  if (
    params.paidChosen > 0 &&
    downgradesTotal / params.paidChosen >= 0.3 &&
    namecheapDegraded >= skipLink &&
    namecheapDegraded > 0
  ) {
    return {
      tone: "amber",
      message: "Namecheap está empujando a gratis — revisar API o UX degradada",
    };
  }

  const paidShare = params.paidChosen / total;
  const freeShare = params.freeChosen / total;

  if (paidShare >= 0.55) {
    if (
      params.paidActivationRate != null &&
      params.freeActivationRate != null &&
      params.freeActivationRate > 0
    ) {
      const gapPp = Math.abs(params.paidActivationRate - params.freeActivationRate) * 100;
      if (gapPp < 10) {
        return {
          tone: "green",
          message:
            "La mayoría quiere dominio propio, y pagar hoy apenas les frena — el precio no es la barrera",
        };
      }
      if (params.paidActivationRate < params.freeActivationRate * 0.6) {
        return {
          tone: "amber",
          message:
            "Quieren dominio propio pero pagar hoy les frena — revisar precio o momento del cobro",
        };
      }
    }
    return {
      tone: "neutral",
      message: "La mayoría elige dominio de pago",
    };
  }

  if (freeShare >= 0.55) {
    return {
      tone: "neutral",
      message: "La mayoría prefiere empezar gratis",
    };
  }

  return {
    tone: "neutral",
    message: "Reparto equilibrado entre dominio de pago y subdominio gratis",
  };
}
