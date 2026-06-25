import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  PLAN_PRO_ANUAL_DIAS_PRUEBA,
  formatEUR,
} from "@/lib/alta-config";
import { finalizeCheckout } from "@/lib/alta.functions";

const searchSchema = z.object({
  alta_id: z.string().optional(),
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/confirmacion")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "¡Alta recibida! · PowerUp Menu" },
      { name: "description", content: "Hemos recibido tu alta. Te contactaremos por WhatsApp." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Confirmacion,
});

function Confirmacion() {
  const { alta_id, session_id } = Route.useSearch();
  const finalizeCheckoutFn = useServerFn(finalizeCheckout);

  useEffect(() => {
    if (!alta_id || !session_id) return;

    finalizeCheckoutFn({
      data: {
        alta_id,
        session_id,
      },
    }).catch((error) => {
      console.error("No se pudo finalizar el checkout:", error);
    });
  }, [alta_id, session_id, finalizeCheckoutFn]);

  return (
    <main className="container-narrow flex min-h-screen flex-col items-center justify-center py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-white shadow-brand">
        <Check className="h-8 w-8" strokeWidth={3} />
      </div>
      <h1 className="mt-6 text-2xl font-medium tracking-tight">¡Listo! Hemos recibido tu alta</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        En las próximas horas preparamos tu página web y, si elegiste dominio personalizado, lo
        registramos por ti. Te escribimos por WhatsApp para terminar la configuración.
      </p>

      <div className="mt-6 w-full rounded-2xl border bg-card p-4 text-left shadow-card">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recordatorio
        </div>
        <p className="mt-1.5 text-sm">
          Tu plan <strong>Pro Anual</strong> (incluye tu página web) tiene{" "}
          <strong>{PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba</strong>. Después se cobra
          automáticamente <strong>{formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año</strong>{" "}
          con el método de pago que has dejado.
        </p>
      </div>

      <Button asChild className="mt-8 rounded-full px-5">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
