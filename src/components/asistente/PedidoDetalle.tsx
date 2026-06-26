import { Globe } from "lucide-react";
import type { AltaState } from "./types";
import { cn } from "@/lib/utils";

function domainValue(alta: AltaState): string {
  if (alta.has_existing_website) return alta.existing_website_url;
  return alta.domain;
}

function domainFieldLabel(alta: AltaState): string {
  if (alta.has_existing_website) return "Web actual";
  if (alta.domain_is_custom) return "Dominio personalizado";
  return "Dominio";
}

type Props = {
  alta: AltaState;
  size?: "default" | "compact" | "minimal";
};

export function PedidoDetalle({ alta, size = "compact" }: Props) {
  const minimal = size === "minimal";
  const domain = domainValue(alta);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/20",
        minimal ? "px-2.5 py-2" : "px-3 py-2.5",
      )}
    >
      <div className={cn(minimal ? "space-y-1" : "space-y-2")}>
        <div>
          {!minimal ? (
            <div className="text-[10px] text-muted-foreground">Restaurante</div>
          ) : null}
          <p
            className={cn(
              "font-medium leading-snug text-foreground",
              minimal ? "truncate text-sm" : "text-sm",
            )}
          >
            {alta.restaurant_name}
          </p>
        </div>

        <div className="flex items-start gap-1.5">
          <Globe
            className={cn(
              "mt-0.5 shrink-0 text-muted-foreground",
              minimal ? "h-3 w-3" : "h-3.5 w-3.5",
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground">{domainFieldLabel(alta)}</div>
            <p
              className={cn(
                "font-medium leading-snug text-foreground/90 break-all",
                minimal ? "text-[11px]" : "text-xs",
              )}
            >
              {domain}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
