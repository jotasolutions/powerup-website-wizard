import { useEffect, useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import type { AltaState } from "./types";
import {
  billingExplainerLabel,
  getCheckoutScenario,
  isPowerUpUpgrade,
  stripeReassuranceLine,
} from "@/lib/checkout-scenario";
import { PLAN_PRO_ANUAL_DIAS_PRUEBA, PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR, formatEUR } from "@/lib/alta-config";
import { PlanProHero } from "./PlanProHero";
import { PedidoDetalle } from "./PedidoDetalle";

function domainLabel(alta: AltaState): string {
  if (alta.has_existing_website) {
    return `Web actual: ${alta.existing_website_url}`;
  }
  if (alta.powerup_customer === "yes" && !alta.domain_is_custom) {
    return `Carta PowerUp: ${alta.domain}`;
  }
  if (alta.domain_is_custom) {
    return `Dominio personalizado: ${alta.domain}`;
  }
  return `Dirección web: ${alta.domain}`;
}

type Props = {
  alta: AltaState;
  variant?: "default" | "compact";
  /** En checkout paso contacto: solo precio + datos clave para ganar espacio. */
  compactDensity?: "full" | "minimal";
  onTrialOpenChange?: (open: boolean) => void;
};

export function ResumenPedido({
  alta,
  variant = "default",
  compactDensity = "full",
  onTrialOpenChange,
}: Props) {
  const [trialOpen, setTrialOpen] = useState(false);
  const scenario = getCheckoutScenario(alta);
  const compact = variant === "compact";

  useEffect(() => {
    onTrialOpenChange?.(trialOpen);
  }, [trialOpen, onTrialOpenChange]);

  function toggleTrial() {
    setTrialOpen((o) => !o);
  }

  const trialExplainer = isPowerUpUpgrade(alta) ? (
    scenario === "custom_domain" ? (
      <>
        Hoy pagas el dominio personalizado. El Plan Pro anual (
        {formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA) se activa sin periodo de
        prueba — ya tienes carta PowerUp.
      </>
    ) : (
      <>
        Guardas tu tarjeta de forma segura (Stripe). El Plan Pro anual (
        {formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA) se activa sin los{" "}
        {PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba — ya tienes carta PowerUp.
      </>
    )
  ) : scenario === "trial_free" ? (
      <>
        Hoy solo guardas tu tarjeta de forma segura (Stripe). No se cobra el plan hasta el día{" "}
        {PLAN_PRO_ANUAL_DIAS_PRUEBA + 1}. Puedes cancelar durante la prueba sin coste del plan.
      </>
    ) : scenario === "custom_domain" ? (
      <>
        Hoy pagas el dominio personalizado y guardas tu tarjeta para el Plan Pro. El plan no se cobra
        hasta el día {PLAN_PRO_ANUAL_DIAS_PRUEBA + 1}. Puedes cancelar el plan durante la prueba.
      </>
    ) : (
      <>
        Hoy pagas el fee de gestión de tu web actual y guardas tu tarjeta para el Plan Pro. El plan no
        se cobra hasta el día {PLAN_PRO_ANUAL_DIAS_PRUEBA + 1}.
      </>
    );

  if (compact) {
    if (compactDensity === "minimal") {
      return (
        <div className="space-y-2">
          <PlanProHero alta={alta} size="minimal" />
          <PedidoDetalle alta={alta} size="minimal" />
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        <PlanProHero alta={alta} size="compact" />

        <PedidoDetalle alta={alta} size="compact" />

        <ul className="space-y-1 text-xs">
          <li className="flex items-start gap-1.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>Despreocupate. Pagina web y carta digital sin depender de nadie</span>
          </li>
          <li className="flex items-start gap-1.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>Estructurada para que te encuentren en Google y en buscadores con IA tipo ChatGpt</span>
          </li>
        </ul>

        <button
          type="button"
          onClick={toggleTrial}
          className="flex w-full items-center justify-between gap-2 text-left text-[10px] text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
        >
          {billingExplainerLabel(alta)}
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition ${trialOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {trialOpen && (
          <p className="text-[10px] leading-relaxed text-muted-foreground">{trialExplainer}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PlanProHero alta={alta} size="default" />

      <PedidoDetalle alta={alta} size="default" />

      <ul className="space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>Página web para {alta.restaurant_name}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 break-words">{domainLabel(alta)}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>Estructurada para que te encuentren en Google y en buscadores con IA tipo ChatGpt</span>
        </li>
      </ul>

      <button
        type="button"
        onClick={toggleTrial}
        className="flex w-full items-center justify-between gap-2 text-left text-xs text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
      >
        {billingExplainerLabel(alta)}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${trialOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {trialOpen && (
        <p className="text-xs leading-relaxed text-muted-foreground">{trialExplainer}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{stripeReassuranceLine(alta)}</span>
      </div>
    </div>
  );
}
