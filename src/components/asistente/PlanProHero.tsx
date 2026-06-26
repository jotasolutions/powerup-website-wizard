import type { AltaState } from "./types";
import {
  PLAN_PRO_ANUAL_DIAS_PRUEBA,
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  formatEUR,
} from "@/lib/alta-config";
import {
  planHeroBadgeLabel,
  planHeroPriceLabel,
  planHeroTitle,
  planProMonthlyEur,
} from "@/lib/checkout-scenario";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

type Props = {
  alta: AltaState;
  size?: "default" | "compact" | "minimal";
};

export function PlanProHero({ alta, size = "default" }: Props) {
  const compact = size === "compact";
  const minimal = size === "minimal";
  const monthly = Math.round(planProMonthlyEur());

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#c5e6d3] bg-[#eef7f1]",
        minimal ? "p-2.5" : compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-semibold tracking-tight text-[#1a6b45]",
              minimal ? "text-lg" : compact ? "text-xl" : "text-2xl",
            )}
          >
            {planHeroPriceLabel(alta)}
          </span>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#1a6b45] shadow-sm">
            {planHeroBadgeLabel()}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium text-[#1a6b45]/85",
            minimal ? "text-[10px]" : "text-xs",
          )}
        >
          <WhatsAppIcon className={cn("shrink-0 text-[#25D366]", minimal ? "h-3 w-3" : "h-3.5 w-3.5")} />
          Soporte WhatsApp
        </span>
      </div>
      <p
        className={cn(
          "mt-1.5 font-semibold leading-snug text-foreground",
          minimal ? "line-clamp-1 text-xs" : compact ? "text-sm" : "text-base",
        )}
      >
        {planHeroTitle(alta)}
      </p>
      {!minimal ? (
        <p className={cn("mt-1.5 leading-snug text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          Luego <span className="font-semibold text-[#1a6b45]">{monthly} €/mes</span> (
          {formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA) · cancela antes del día{" "}
          {PLAN_PRO_ANUAL_DIAS_PRUEBA} y no pagas nada
        </p>
      ) : null}
    </div>
  );
}
