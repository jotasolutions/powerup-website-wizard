import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type OpsWhatsAppButtonProps = {
  altaId: string;
  href: string;
  className?: string;
};

function fireWaOpenedBeacon(altaId: string) {
  const url = `/api/ops/wa-opened?altaId=${encodeURIComponent(altaId)}`;
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    if (navigator.sendBeacon(url)) return;
  }
  void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
}

/** Abre wa.me y registra wa_opened_at sin bloquear la navegación (sin UI del timestamp). */
export function OpsWhatsAppButton({ altaId, href, className }: OpsWhatsAppButtonProps) {
  const onClick = () => {
    fireWaOpenedBeacon(altaId);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-panel-green-border bg-panel-green-bg px-2.5 py-0.5 text-xs font-medium text-panel-green-text",
        className,
      )}
    >
      <MessageCircle className="size-3.5" aria-hidden />
      WhatsApp
    </button>
  );
}
