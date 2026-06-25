import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Check } from "lucide-react";
import {
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  PLAN_PRO_ANUAL_DIAS_PRUEBA,
  formatEUR,
} from "@/lib/alta-config";

const searchSchema = z.object({
  alta_id: z.string().optional(),
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
  return (
    <main className="container-narrow flex min-h-screen flex-col items-center justify-center py-10 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-soft"
        style={{ background: "var(--brand)" }}
      >
        <Check className="h-8 w-8" strokeWidth={3} />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">¡Listo! Hemos recibido tu alta</h1>
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

      <Link
        to="/"
        className="mt-8 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:opacity-90"
        style={{ background: "var(--brand)" }}
      >
        Volver al inicio
      </Link>
    </main>
  );
}
