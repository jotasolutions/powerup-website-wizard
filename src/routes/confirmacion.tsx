import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR,
  PLAN_PRO_ANUAL_DIAS_PRUEBA,
  formatEUR,
} from "@/lib/alta-config";
import { finalizeCheckout, getAltaSummary } from "@/lib/alta.functions";
import { clearAltaDraft } from "@/lib/checkout-scenario";
import {
  buildPostCheckoutSupportWhatsAppUrl,
  postCheckoutContextFromAlta,
} from "@/lib/post-checkout-support";
import { getSupportWhatsappE164 } from "@/lib/support-contact";

const searchSchema = z.object({
  alta_id: z.string().optional(),
  session_id: z.string().optional(),
});

type AltaConfirmationSummary = NonNullable<Awaited<ReturnType<typeof getAltaSummary>>>;

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
  const getAltaSummaryFn = useServerFn(getAltaSummary);
  const posthog = usePostHog();
  const confirmedCaptured = useRef(false);
  const [summary, setSummary] = useState<AltaConfirmationSummary | null>(null);

  const loadSummary = useCallback(async () => {
    if (!alta_id) return null;
    const data = await getAltaSummaryFn({ data: { alta_id } });
    if (data) setSummary(data);
    return data;
  }, [alta_id, getAltaSummaryFn]);

  useEffect(() => {
    clearAltaDraft();
  }, []);

  useEffect(() => {
    if (!alta_id || !session_id) {
      void loadSummary();
      return;
    }

    finalizeCheckoutFn({
      data: {
        alta_id,
        session_id,
      },
    })
      .then(() => loadSummary())
      .catch((error) => {
        console.error("No se pudo finalizar el checkout:", error);
        void loadSummary();
      });
  }, [alta_id, session_id, finalizeCheckoutFn, loadSummary]);

  useEffect(() => {
    if (!alta_id) return;

    loadSummary()
      .then((data) => {
        if (!confirmedCaptured.current) {
          confirmedCaptured.current = true;
          posthog.capture("wizard_confirmed", {
            alta_id,
            powerup_customer: data?.powerup_customer ?? "unknown",
            restaurant_name: data?.restaurant_name,
            has_customer_email: Boolean(data?.customer_email),
          });
        }
      })
      .catch((error) => {
        console.error("No se pudo cargar el resumen del alta:", error);
        if (!confirmedCaptured.current) {
          confirmedCaptured.current = true;
          posthog.capture("wizard_confirmed", { alta_id });
        }
      });
  }, [alta_id, loadSummary, posthog]);

  const isPowerUpUpgrade = summary?.powerup_customer === "yes";
  const supportE164 = getSupportWhatsappE164();

  const whatsappContext = summary
    ? postCheckoutContextFromAlta({
        id: summary.alta_id,
        contactName: summary.contact_name,
        restaurantName: summary.restaurant_name,
        restaurantAddress: summary.restaurant_address,
        whatsapp: summary.whatsapp,
        domain: summary.domain,
        customerEmail: summary.customer_email,
      })
    : null;

  const whatsappGeneralUrl = whatsappContext
    ? buildPostCheckoutSupportWhatsAppUrl(whatsappContext, "general", supportE164)
    : null;
  const whatsappWrongEmailUrl = whatsappContext
    ? buildPostCheckoutSupportWhatsAppUrl(whatsappContext, "wrong_email", supportE164)
    : null;

  return (
    <main className="container-narrow safe-area-bottom flex min-h-dvh flex-col items-center justify-center py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-white shadow-brand">
        <Check className="h-8 w-8" strokeWidth={3} />
      </div>
      <h1 className="mt-6 text-2xl font-medium tracking-tight">¡Listo! Ya estamos preparando tu web</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Hemos recibido tu alta y ya hemos empezado a trabajar en la página web. En las próximas
        horas, si elegiste dominio personalizado, lo registramos por ti.
      </p>

      {summary?.customer_email ? (
        <div className="mt-6 w-full rounded-2xl border bg-card p-4 text-left shadow-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confirmación por email
          </div>
          <p className="mt-1.5 text-sm">
            {summary.checkout_email_sent ? (
              <>
                Te hemos enviado un correo de confirmación a{" "}
                <strong className="break-all">{summary.customer_email}</strong>.
              </>
            ) : (
              <>
                Usaremos <strong className="break-all">{summary.customer_email}</strong> para
                avisarte cuando la web esté lista.
              </>
            )}
          </p>
          {summary.customer_email_bounced ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              No hemos podido entregar correos a esa dirección. Escríbenos por WhatsApp con tu
              email correcto.
            </p>
          ) : null}
          {whatsappWrongEmailUrl ? (
            <p className="mt-2 text-sm">
              ¿No es correcto?{" "}
              <a
                href={whatsappWrongEmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Avísanos por WhatsApp
              </a>
              {" — "}el mensaje ya incluye los datos de tu alta para que podamos ayudarte.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 w-full rounded-2xl border bg-card p-4 text-left shadow-card">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recordatorio
        </div>
        <p className="mt-1.5 text-sm">
          {isPowerUpUpgrade ? (
            <>
              Tu upgrade a <strong>página web</strong> activa el plan <strong>Pro Anual</strong> (
              {formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año + IVA){" "}
              <strong>sin periodo de prueba</strong> — ya tienes carta PowerUp. El cobro del plan
              sigue el método de pago que has dejado en Stripe.
            </>
          ) : (
            <>
              Tu plan <strong>Pro Anual</strong> (incluye tu página web) tiene{" "}
              <strong>{PLAN_PRO_ANUAL_DIAS_PRUEBA} días de prueba</strong>. Después se cobra
              automáticamente <strong>{formatEUR(PLAN_PRO_ANUAL_PRECIO_REFERENCIA_EUR)}/año</strong>{" "}
              con el método de pago que has dejado.
            </>
          )}
        </p>
      </div>

      {whatsappGeneralUrl ? (
        <Button asChild variant="outline" className="mt-6 rounded-full px-5">
          <a href={whatsappGeneralUrl} target="_blank" rel="noopener noreferrer">
            Enviar fotos o detalles por WhatsApp
          </a>
        </Button>
      ) : null}

      <Button asChild className="mt-4 rounded-full px-5">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
