import { cn } from "@/lib/utils";
import { useConsent } from "./ConsentProvider";

/** Enlace pequeño para cambiar la elección de cookies (la misma que en www.powerup.menu). */
export function CookieSettingsLink({ className }: { className?: string }) {
  const { enabled, openSettings } = useConsent();
  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={openSettings}
      className={cn("underline underline-offset-2 hover:text-foreground", className)}
    >
      Cookies
    </button>
  );
}
