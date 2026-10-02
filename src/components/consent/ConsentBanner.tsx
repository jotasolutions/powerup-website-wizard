import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRIVACY_POLICY_URL } from "@/lib/analytics-consent";
import { useConsent } from "./ConsentProvider";

/** Mismo texto y botones que el aviso de www.powerup.menu; solo sale a quien no ha elegido. */
export function ConsentBanner() {
  const { bannerOpen, acceptAll, rejectAll, openSettings } = useConsent();
  if (!bannerOpen) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mb-[env(safe-area-inset-bottom,0px)] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-sm"
    >
      <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
        <p className="text-sm leading-relaxed text-neutral-800">
          Usamos cookies en este sitio web para rendimiento, personalización y marketing.{" "}
          <a
            href={`${PRIVACY_POLICY_URL}#cookies`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 transition-colors hover:text-neutral-800"
          >
            Más información en nuestra política de cookies.
          </a>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={openSettings}
            className="bg-transparent"
            aria-label="Personalizar cookies"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={rejectAll}>
            Rechazar todo
          </Button>
          <Button size="sm" onClick={acceptAll}>
            Aceptar todo
          </Button>
        </div>
      </div>
    </div>
  );
}
