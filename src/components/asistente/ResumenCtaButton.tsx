import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stripeReassuranceLine } from "@/lib/checkout-scenario";
import type { AltaState } from "./types";

type Props = {
  children: ReactNode;
  onClick: () => void;
  alta?: AltaState;
};

export function ResumenCtaButton({ children, onClick, alta }: Props) {
  return (
    <Button className="h-auto w-full flex-col gap-1 py-3" size="lg" onClick={onClick}>
      <span>{children}</span>
      <span className="flex items-center gap-1 text-[10px] font-normal leading-snug text-primary-foreground/85">
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        {stripeReassuranceLine(alta)}
      </span>
    </Button>
  );
}
