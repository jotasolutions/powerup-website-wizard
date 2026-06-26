import { useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import type { AltaState } from "./types";
import {
  annualPlanLabel,
  getCheckoutScenario,
  todayPaymentLabel,
  todayPaymentSubtitle,
} from "@/lib/checkout-scenario";
import { PLAN_PRO_ANUAL_DIAS_PRUEBA } from "@/lib/alta-config";

function domainLabel(alta: AltaState): string {
  if (alta.has_existing_website) {
    return `Web actual: ${alta.existing_website_url}`;
  }
  if (alta.domain_is_custom) {
    return `Dominio personalizado: ${alta.domain}`;
  }
  return `Dirección web: ${alta.domain}`;
}

export function ResumenPedido({ alta }: { alta: AltaState }) {
  const [trialOpen, setTrialOpen] = useState(false);
  const scenario = getCheckoutScenario(alta);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          {todayPaymentLabel(alta)}
        </div>
        <p className="mt-1 text-sm text-foreground/90">{todayPaymentSubtitle(alta)}</p>
        <p className="mt-2 text-xs text-muted-foreground">{annualPlanLabel()}</p>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tu pedido
        </div>
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="shrink-0 text-muted-foreground">Restaurante</span>
            <span className="min-w-0 break-words text-right font-medium">{alta.restaurant_name}</span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 text-muted-foreground">
              {alta.has_existing_website ? "Web" : "Dominio"}
            </span>
            <span className="min-w-0 break-all text-right font-medium">{domainLabel(alta)}</span>
          </div>
        </div>
      </div>

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
          <span>Soporte por WhatsApp para la configuración</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>Sin permanencia durante el mes de prueba</span>
        </li>
      </ul>

      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span>Hoy</span>
          <span className="text-center">Día {PLAN_PRO_ANUAL_DIAS_PRUEBA}</span>
          <span>Día {PLAN_PRO_ANUAL_DIAS_PRUEBA + 1}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2 text-xs font-medium">
          <span>Tarjeta guardada</span>
          <span className="text-center">Prueba gratis</span>
          <span className="text-right">Plan anual</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setTrialOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left text-xs text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
      >
        ¿Cómo funciona la prueba?
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${trialOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {trialOpen && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {scenario === "trial_free" ? (
            <>
              Hoy solo guardas tu tarjeta de forma segura (Stripe). No se cobra el plan hasta el día{" "}
              {PLAN_PRO_ANUAL_DIAS_PRUEBA + 1}. Puedes cancelar durante la prueba sin coste del plan.
            </>
          ) : scenario === "custom_domain" ? (
            <>
              Hoy pagas el dominio personalizado y guardas tu tarjeta para el Plan Pro. El plan no se
              cobra hasta el día {PLAN_PRO_ANUAL_DIAS_PRUEBA + 1}. Puedes cancelar el plan durante la
              prueba.
            </>
          ) : (
            <>
              Hoy pagas el fee de gestión de tu web actual y guardas tu tarjeta para el Plan Pro. El
              plan no se cobra hasta el día {PLAN_PRO_ANUAL_DIAS_PRUEBA + 1}.
            </>
          )}
        </p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Pago seguro con Stripe · cancela durante la prueba</span>
      </div>
    </div>
  );
}
