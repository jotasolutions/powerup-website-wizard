import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AltaState } from "./types";
import { ResumenPedido } from "./ResumenPedido";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { buildSupportWhatsAppMessage, buildSupportWhatsAppUrl } from "@/lib/support-contact";
import { toast } from "sonner";

type Props = {
  alta: AltaState;
  step: "resumen" | "contacto";
  keyboardInset?: number;
  children?: ReactNode;
  /** CTA en barra blanca inferior (paso contacto). */
  footer?: ReactNode;
  /** CTA dentro de la columna principal (paso resumen), alineado con la card. */
  mainFooter?: ReactNode;
  /** Cinta inferior a ancho completo (p. ej. autoridad), pegada al borde de pantalla. */
  footerRibbon?: ReactNode;
};

function SupportWhatsAppLink({ alta }: { alta: AltaState }) {
  const url = buildSupportWhatsAppUrl(alta);
  const message = buildSupportWhatsAppMessage(alta);

  return (
    <p className="text-center text-[11px] text-muted-foreground">
      ¿Dudas?{" "}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-[#128C7E] underline-offset-4 hover:text-[#075E54] hover:underline"
      >
        <WhatsAppIcon className="h-3.5 w-3.5" />
        Escríbenos por WhatsApp
      </a>
      <span className="mx-1 text-border">·</span>
      <button
        type="button"
        className="font-medium text-foreground underline-offset-4 hover:underline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(message);
            toast.success("Mensaje copiado");
          } catch {
            toast.error("No se pudo copiar el mensaje");
          }
        }}
      >
        Copiar mensaje
      </button>
    </p>
  );
}

export function CheckoutLayout({
  alta,
  step,
  keyboardInset = 0,
  children,
  footer,
  mainFooter,
  footerRibbon,
}: Props) {
  const [trialOpen, setTrialOpen] = useState(false);
  const isContacto = step === "contacto";
  const allowScroll = keyboardInset > 0 || trialOpen || isContacto;

  const title =
    step === "resumen"
      ? `Esto es lo que preparamos para ${alta.restaurant_name}`
      : "Último paso: tu contacto";

  const subtitle =
    step === "resumen"
      ? "Revisa tu pedido antes de continuar."
      : "Te escribimos por WhatsApp para avisarte y ayudarte con la configuración.";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "container-narrow flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 py-2 max-md:py-2 sm:gap-3 sm:py-4",
          allowScroll ? "overflow-y-auto" : "overflow-hidden",
          isContacto && "pb-1",
        )}
        style={{
          paddingBottom:
            keyboardInset > 0 ? keyboardInset + (footer ? 8 : 0) : undefined,
        }}
      >
        <div className="hidden sm:block">
          <h2 className="font-display text-lg font-medium tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {isContacto ? (
          <div className="sm:hidden">
            <h2 className="font-display text-base font-medium tracking-tight">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>
        ) : null}

        <div className="shrink-0 rounded-xl border bg-card p-3 shadow-card">
          <ResumenPedido
            alta={alta}
            variant="compact"
            compactDensity={step === "contacto" ? "minimal" : "full"}
            onTrialOpenChange={setTrialOpen}
          />
        </div>

        {children ? (
          <div className={cn("min-h-0", isContacto ? "shrink-0" : "shrink")}>{children}</div>
        ) : null}

        {step === "resumen" ? (
          <div className="mt-auto shrink-0 space-y-2 border-t border-border/60 pt-3">
            <SupportWhatsAppLink alta={alta} />
            {mainFooter}
          </div>
        ) : null}
      </div>

      {footer ? (
        <div className="safe-area-bottom w-full shrink-0 overflow-x-clip border-t border-border/60 bg-white/80 backdrop-blur">
          <div className="container-narrow w-full space-y-1.5 py-3">{footer}</div>
        </div>
      ) : null}

      {footerRibbon ? (
        <div className="safe-area-bottom w-full shrink-0 overflow-x-hidden bg-neutral-950">
          {footerRibbon}
        </div>
      ) : null}
    </div>
  );
}
