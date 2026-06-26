import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const STRIPE_REASSURANCE_LINE = "Pago seguro con Stripe · cancela durante la prueba";

type Props = {
  children: ReactNode;
  onClick: () => void;
};

export function ResumenCtaButton({ children, onClick }: Props) {
  return (
    <Button className="h-auto w-full flex-col gap-1 py-3" size="lg" onClick={onClick}>
      <span>{children}</span>
      <span className="flex items-center gap-1 text-[10px] font-normal leading-snug text-primary-foreground/85">
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        {STRIPE_REASSURANCE_LINE}
      </span>
    </Button>
  );
}
